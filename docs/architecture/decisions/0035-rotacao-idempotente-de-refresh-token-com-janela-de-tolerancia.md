# [ADR-0035]: Rotação Idempotente de Refresh Token com Janela de Tolerância

## Dados

- **Status:** 🟡 Proposto
- **Data:** 2026-11-01
- **Proponentes:** [@Amaro-peter](https://github.com/Amaro-peter)

---

## Contexto e Problema

Pelo ADR-0023, todo refresh rotaciona o token. `RefreshTokenService.rotate()` (`app/services/auth/refresh_token_service.ts`) marca o token apresentado como revogado e emite um novo na mesma família. Se um token **já revogado** for apresentado de novo, o serviço trata como roubo: revoga toda a família e bloqueia os access tokens dela (`blockFamily`). O usuário é forçado a entrar de novo com senha.

A regra é correta contra roubo (RFC 9700 §4.14), mas pune também um cenário legítimo e comum: **dois pedidos do mesmo cliente renovando ao mesmo tempo**.

- O BFF do frontend (`src/lib/api/bff.ts`) renova o token quando o access token está para expirar (TTL de 15 min) ou quando a API responde 401.
- Uma página que dispara vários pedidos em paralelo após o access token expirar gera vários refreshes com o mesmo refresh token. Isso fica mais frequente com o TanStack Query (ADR-0002 do frontend), que busca vários recursos em paralelo.
- O BFF já mitiga isso **dentro de um processo**: `inflightRefreshes` compartilha o refresh em andamento, e `recentRotations` devolve o par novo por 30 s (`ROTATION_REUSE_WINDOW_MS`) a pedidos que chegaram com o cookie antigo.
- Essas estruturas vivem na memória do processo. Com o BFF hospedado em **várias instâncias** (serverless ou réplicas atrás de balanceador), dois pedidos do mesmo usuário podem cair em instâncias diferentes. Os dois apresentam o mesmo refresh token, o segundo é visto como reuso, e **a sessão do usuário é derrubada sem nenhum ataque**.

Há ainda uma **condição de corrida dentro da própria API**. `rotate()` lê o token, verifica `revokedAt` e depois salva. Dois pedidos simultâneos podem ler `revokedAt = null` antes de qualquer um salvar e emitir **dois** filhos válidos na mesma família. Um deles fica órfão, mas válido, até expirar.

Qualquer tolerância precisa respeitar três fatos do código atual:

- **Rotações encadeadas acontecem dentro de segundos.** Exemplo: RT0→RT1 numa instância e, logo depois, RT1→RT2 em outra. Um pedido atrasado com RT0 não pode receber RT1, que já foi consumido.
- **Nem toda revogação passa pela blocklist de família.** `AuthRevocationService.logout()` só revoga a família no PostgreSQL, e `revokeAllSessions()` revoga os tokens e incrementa o `auth_version`. Nenhum dos dois chama `blockFamily()`. Uma checagem que olhe só a blocklist no Dragonfly deixaria passar um replay depois de logout ou troca de senha.
- **`JwtGuard.generate()` emite o access token com o `auth_version` atual.** Então o que impede a emissão é o estado do refresh token no PostgreSQL, não o JWT.

A questão central é: **como tornar a renovação de token segura para pedidos concorrentes vindos de várias instâncias do BFF, sem enfraquecer a detecção de roubo do ADR-0023?**

## Decisão

A rotação passa a ser **serializada no banco, rastreável por encadeamento e idempotente dentro de uma janela curta de tolerância**.

### Modelo de dados

Uma migração nova (ADR-0020) adiciona `replaced_by_id` (UUID, FK para `refresh_tokens.id`, nulo por padrão) a `refresh_tokens`:

- **Token revogado por rotação:** tem `replaced_by_id` apontando para o filho.
- **Token revogado por logout, "sair de todos", troca de senha, revogação remota ou detecção de roubo:** fica com `replaced_by_id` nulo.

### Fluxo de `rotate()`

Tudo roda numa transação, começando por `SELECT ... FOR UPDATE` na linha do token apresentado. Pedidos concorrentes com o mesmo token **esperam o vencedor terminar**. Por isso nunca observam o estado intermediário "revogado, mas resultado ainda não publicado".

1. **Token ativo** (não revogado, não expirado): é a rotação normal. Dentro da transação:
   - cria o filho;
   - grava no DragonflyDB (ADR-0007) o valor bruto do filho, cifrado com o serviço de encryption do AdonisJS (`APP_KEY`), na chave `refresh:issued:<id do filho>`, com TTL de **30 s** (igual ao `ROTATION_REUSE_WINDOW_MS` do BFF);
   - marca o token apresentado com `revoked_at = now()` e `replaced_by_id = <id do filho>`;
   - faz o commit.

   Se a gravação no Dragonfly falhar, a transação é desfeita e a resposta é um erro transitório (503). Nada é revogado.

2. **Token revogado por rotação dentro da janela** (`replaced_by_id` preenchido e `revoked_at` há no máximo 30 s):
   - Segue o encadeamento `replaced_by_id`, travando cada linha, até o **primeiro descendente ativo**. A profundidade é limitada (ex.: 5 elos).
   - Se o descendente ativo for encontrado, a chave `refresh:issued:<id>` existir e o pedido vier do mesmo dispositivo que fez a rotação (mesmos `device_type` e `device_name` gravados no token, que vêm do `x-client-type` e do dispositivo): a API devolve **esse** refresh token, que é o atual e não um já consumido, e emite um access token novo para a família. Isso resolve o pedido atrasado depois de RT1→RT2: ele recebe RT2.
   - Se o encadeamento terminar num token revogado **sem** `replaced_by_id`, a sessão foi encerrada (logout, troca de senha, revogação). A resposta é 401 (`E_INVALID_REFRESH_TOKEN`), sem nova ação, porque a família já está revogada. Esta checagem no PostgreSQL é o que cobre os caminhos que não usam `blockFamily()`.
   - Se o descendente ativo existir mas a chave não estiver mais no cache, ou se o dispositivo for diferente, aplica-se o caso 3.

3. **Qualquer outro reuso de token revogado:**
   - fora da janela;
   - sem `replaced_by_id`;
   - de outro dispositivo;
   - ou com encadeamento além do limite.

   É tratado como roubo, exatamente como no ADR-0023: revoga a família no PostgreSQL e chama `blockFamily()`.

4. **Registro de segurança:** todo replay atendido pelo caso 2 gera um evento de log estruturado (família, usuário, metadados do dispositivo, IP resolvido pelo ADR-0032). Isso permite monitorar abuso da janela.

### Complemento no frontend

- O BFF mantém o dedupe local, que evita ida à API dentro de um processo.
- O `proxy.ts` passa a renovar o token **proativamente nas navegações de página** quando o access token estiver para expirar, e grava os cookies novos antes de a página disparar os pedidos paralelos. Isso reduz a chance de corrida, mas não substitui a idempotência no servidor.
- A mudança no `proxy.ts` é registrada como ADR do frontend quando for implementada.

## Justificativa

- **Corrige a causa onde ela pode ser corrigida:** só a API vê todos os pedidos de todas as instâncias. Qualquer dedupe no BFF sem estado compartilhado é parcial.
- **Sem estado intermediário observável:** o `FOR UPDATE` serializa os pedidos concorrentes com o mesmo token, e o resultado é publicado antes do commit. Um perdedor nunca encontra "revogado e sem resultado" enquanto a rotação está em andamento.
- **Nunca devolve token consumido:** seguir `replaced_by_id` até o descendente ativo resolve rotações encadeadas sem sobrescrever o cookie mais novo com um mais antigo.
- **A fonte de verdade da revogação é o PostgreSQL:** a decisão de atender um replay depende do estado dos tokens no banco, que todos os caminhos de revogação atualizam, e não só da blocklist de família.
- **A detecção de roubo continua de pé fora da janela**, com o mesmo efeito do ADR-0023.

## Alternativas Consideradas

**1. Dedupe só no BFF com estado compartilhado (ex.: Redis acessível pelo BFF)**

Exigiria infraestrutura nova no lado do frontend e acesso a um armazenamento compartilhado a partir da hospedagem do BFF. Não resolveria a corrida interna da API nem protegeria outros clientes (app mobile). Descartada.

**2. Fixar o BFF em uma única instância**

Faz o dedupe em memória funcionar, mas limita a hospedagem e a escala (NF 2.5) por causa de um detalhe de autenticação. Descartada.

**3. Desligar a detecção de reuso**

Resolve o falso positivo, mas remove a proteção contra roubo de refresh token exigida pelo ADR-0023 e pela RFC 9700. Descartada.

**4. Cache chaveado pelo token antigo, sem encadeamento nem lock**

Foi a primeira versão desta proposta. Tinha três falhas:

- um pedido concorrente podia ver o token revogado antes de o resultado ser publicado;
- em rotações encadeadas devolvia um token já consumido;
- dependia da blocklist de família, que logout e troca de senha não atualizam.

Descartada.

**5. Emitir um token irmão novo a cada reuso dentro da janela**

Evita guardar o token cifrado, mas multiplica tokens válidos na família a cada corrida e piora a rastreabilidade. Devolver o descendente ativo mantém um único token válido por família. Descartada.

## Consequências (Trade-offs)

### Positivas / Benefícios

- Sessões deixam de cair sem motivo quando o BFF roda com várias instâncias ou quando a página dispara pedidos em paralelo.
- A corrida interna de `rotate()` deixa de gerar tokens órfãos válidos.
- `replaced_by_id` deixa a linhagem de cada sessão explícita, o que ajuda na investigação de incidentes (a retenção de 30 dias de tokens revogados do ADR-0023 continua valendo).
- O BFF pode ser hospedado livremente (Vercel, réplicas), sem depender de afinidade de sessão.

### Negativas / Riscos

- **Modelo de ameaça ampliado.** Um refresh token roubado em **qualquer momento antes** da sua rotação legítima, e reapresentado pelo atacante nos 30 s seguintes a essa rotação, recebe o mesmo descendente ativo que o dono.
  - A partir daí atacante e dono compartilham a cadeia, e o atacante pode continuar rotacionando.
  - O comprometimento **não termina com a janela**. Ele dura até a próxima colisão fora da janela (quando um dos dois apresentar um token já consumido mais de 30 s depois da rotação feita pelo outro), até uma revogação manual (`DELETE /auth/sessions/:familyId`, "sair de todos", troca de senha) ou até o TTL deslizante da família (7 dias na web).
  - Isso é um enfraquecimento real em relação ao ADR-0023, onde a primeira reapresentação já revogava a família.
  - Mitigações: exigir o mesmo dispositivo para atender o replay; janela curta e configurável por variável de ambiente; log de segurança de todo replay atendido; detecção de roubo mantida fora da janela.
- **Refresh token cifrado no DragonflyDB por até 30 s:** aumenta a superfície se o cache e a `APP_KEY` forem comprometidos juntos. Mitigação: cifragem, TTL curto, chave pelo id do token e nunca pelo valor bruto.
- **Lock de linha no refresh:** pedidos concorrentes com o mesmo token esperam o vencedor (milissegundos). Pedidos com tokens diferentes não competem.
- **Migração e mais caminhos para testar:** coluna nova em `refresh_tokens` e testes para:
  - rotação vencedora;
  - perdedor concorrente;
  - rotação encadeada;
  - replay dentro e fora da janela;
  - replay de outro dispositivo;
  - replay após logout e após troca de senha;
  - falha do Dragonfly durante a rotação.

## Referências

- [ADR-0023](./0023-estrategia-de-autenticacao-jwt-hibrido-com-revogacao-via-dragonflydb.md): rotação com family tracking, que este ADR complementa sem substituir
- [ADR-0007](./0007-adocao-do-dragonfly-como-cache-e-armazenamento-temporario.md): DragonflyDB como armazenamento temporário
- [ADR-0020](./0020-convencoes-de-escrita-de-migracoes.md): convenções da migração de `replaced_by_id`
- [ADR-0032](./0032-ip-do-usuario-repassado-pelo-bff-com-segredo-compartilhado.md): IP do usuário usado no log de segurança
- [ADR-0002 do frontend](https://github.com/MissionAppFaithTech/MissionAppFrontend/blob/main/docs/architecture/decisions/0002-adocao-do-tanstack-query-para-estado-de-servidor.md): pedidos paralelos que aumentam a chance de corrida
- [RFC 9700 — seção 4.14](https://datatracker.ietf.org/doc/html/rfc9700#section-4.14): rotação de refresh token e detecção de reuso
- [Auth0 — Refresh Token Rotation (reuse interval)](https://auth0.com/docs/secure/tokens/refresh-tokens/refresh-token-rotation): exemplo de janela de tolerância em provedor de identidade

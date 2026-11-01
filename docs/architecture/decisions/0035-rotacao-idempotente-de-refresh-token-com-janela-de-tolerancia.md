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

A questão central é: **como tornar a renovação de token segura para pedidos concorrentes vindos de várias instâncias do BFF, sem enfraquecer a detecção de roubo do ADR-0023?**

## Decisão

A rotação passa a ser **atômica e idempotente dentro de uma janela curta de tolerância**.

1. **Revogação atômica.** `rotate()` revoga o token com um `UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = :hash AND revoked_at IS NULL AND expires_at > now()` e verifica quantas linhas foram afetadas. Só o pedido que afetou 1 linha emite o novo token. Isso elimina os filhos duplicados.
2. **Resultado guardado por 30 s.** O pedido vencedor guarda no DragonflyDB (ADR-0007) o refresh token novo, cifrado com o serviço de encryption do AdonisJS (`APP_KEY`). A chave é `refresh:rotated:<hash do token antigo>` e o TTL é **30 s**, igual ao `ROTATION_REUSE_WINDOW_MS` do BFF.
3. **Reuso dentro da janela devolve o mesmo resultado.** Se um token revogado for apresentado e existir `refresh:rotated:<hash>`, e a família **não** estiver revogada nem bloqueada:
   - a API devolve o **mesmo** refresh token novo (decifrado do cache);
   - emite um access token novo para a mesma família;
   - **não** dispara a revogação da família.
4. **Fora da janela, nada muda.** Reuso sem entrada no cache (depois de 30 s, ou de um token que nunca foi rotacionado por esse caminho) continua sendo tratado como roubo, exatamente como no ADR-0023.
5. **Logout e revogações invalidam a janela.** `revokeSession`, logout, "sair de todos", troca de senha e reuso detectado já revogam e bloqueiam a família. O passo 3 checa a família antes de responder, então nenhum desses caminhos é contornado.
6. **Complemento no frontend:**
   - O BFF mantém o dedupe local, que evita ida à API dentro de um processo.
   - O `proxy.ts` passa a renovar o token **proativamente nas navegações de página** quando o access token estiver para expirar, e grava os cookies novos antes de a página disparar os pedidos paralelos. Isso reduz a chance de corrida, mas não substitui a idempotência no servidor.
   - A mudança no `proxy.ts` é registrada como ADR do frontend quando for implementada.

## Justificativa

- **Corrige a causa onde ela pode ser corrigida:** só a API vê todos os pedidos de todas as instâncias. Qualquer dedupe no BFF sem estado compartilhado é parcial.
- **Preserva a detecção de roubo:** a tolerância vale só por 30 s após uma rotação legítima e só se a família continuar válida. Um atacante que use o token antigo depois disso dispara a revogação como hoje.
- **Usa infraestrutura existente:** o DragonflyDB já guarda as blocklists de revogação (`AuthRevocationService`). A entrada nova é O(1), tem TTL curto e não exige migração.
- **É prática reconhecida:** provedores de identidade oferecem um "reuse interval" ou "leeway" na rotação de refresh tokens exatamente por isso.

## Alternativas Consideradas

**1. Dedupe só no BFF com estado compartilhado (ex.: Redis acessível pelo BFF)**

Exigiria infraestrutura nova no lado do frontend e acesso a um armazenamento compartilhado a partir da hospedagem do BFF. Não resolveria a corrida interna da API nem protegeria outros clientes (app mobile). Descartada.

**2. Fixar o BFF em uma única instância**

Faz o dedupe em memória funcionar, mas limita a hospedagem e a escala (NF 2.5) por causa de um detalhe de autenticação. Descartada.

**3. Desligar a detecção de reuso**

Resolve o falso positivo, mas remove a proteção contra roubo de refresh token exigida pelo ADR-0023 e pela RFC 9700. Descartada.

**4. Emitir um token irmão novo a cada reuso dentro da janela (em vez de devolver o mesmo)**

Evita guardar o token cifrado, mas multiplica tokens válidos na família a cada corrida e piora a rastreabilidade. Devolver o mesmo token torna a operação realmente idempotente. Descartada.

## Consequências (Trade-offs)

### Positivas / Benefícios

- Sessões deixam de cair sem motivo quando o BFF roda com várias instâncias ou quando a página dispara pedidos em paralelo.
- A corrida interna de `rotate()` deixa de gerar tokens órfãos válidos.
- O BFF pode ser hospedado livremente (Vercel, réplicas), sem depender de afinidade de sessão.

### Negativas / Riscos

- **Janela de 30 s de tolerância:** quem obtiver um refresh token já usado nos 30 s seguintes à rotação recebe o mesmo par que o dono, enquanto a família estiver válida. O risco é limitado pelo TTL curto, pela exigência de o token antigo ter sido roubado nesse intervalo e pela revogação manual de sessões (`DELETE /auth/sessions/:familyId`) continuar funcionando. O trade-off fica registrado e a duração da janela é configurável por variável de ambiente.
- **Refresh token cifrado no DragonflyDB por até 30 s:** aumenta a superfície se o cache for comprometido. Mitigação: cifragem com `APP_KEY`, TTL curto e chave derivada do hash, nunca do valor bruto.
- **Mais um caminho no fluxo de refresh** para testar: rotação vencedora, reuso dentro da janela, reuso fora da janela, reuso após logout e corrida simultânea.

## Referências

- [ADR-0023](./0023-estrategia-de-autenticacao-jwt-hibrido-com-revogacao-via-dragonflydb.md): rotação com family tracking, que este ADR complementa sem substituir
- [ADR-0007](./0007-adocao-do-dragonfly-como-cache-e-armazenamento-temporario.md): DragonflyDB como armazenamento temporário
- [ADR-0032](./0032-ip-do-usuario-repassado-pelo-bff-com-segredo-compartilhado.md): outro ajuste de contrato causado pelo BFF intermediar a API
- [ADR-0002 do frontend](https://github.com/MissionAppFaithTech/MissionAppFrontend/blob/main/docs/architecture/decisions/0002-adocao-do-tanstack-query-para-estado-de-servidor.md): pedidos paralelos que aumentam a chance de corrida
- [RFC 9700 — seção 4.14](https://datatracker.ietf.org/doc/html/rfc9700#section-4.14): rotação de refresh token e detecção de reuso
- [Auth0 — Refresh Token Rotation (reuse interval)](https://auth0.com/docs/secure/tokens/refresh-tokens/refresh-token-rotation): exemplo de janela de tolerância em provedor de identidade

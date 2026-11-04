# [ADR-0038]: Uma Sessão por Aparelho

## Dados

- **Status:** 🟢 Aceito
- **Data:** 2026-11-03
- **Proponentes:** [@Amaro-peter](https://github.com/Amaro-peter)

---

## Contexto e Problema

Pelo ADR-0023, cada login cria uma **família** nova de refresh token (`RefreshTokenService.create`, `familyId ?? uuidv7()`). A família é a "sessão" listada em `GET /auth/sessions` e revogada em `DELETE /auth/sessions/{familyId}`.

Isso gera três problemas:

- **A lista cresce a cada login no mesmo aparelho.** A família anterior continua ativa até expirar (7 dias na web, 30 no mobile). Quem entra, sai e entra de novo no mesmo navegador vê várias "sessões ativas" que são, na prática, o mesmo aparelho.
- **A API não sabe se dois logins vêm do mesmo aparelho.** Ela só recebe `x-client-type` (`web`/`mobile`, que define o TTL) e `x-device-name` (texto livre, como "Chrome no Windows"). Dois navegadores iguais em máquinas diferentes têm o mesmo nome.
- **A lista não diz se a sessão é de computador ou de celular.** O `deviceType` é o tipo de **cliente** (BFF web ou app), não o tipo de aparelho: um celular acessando o site aparece como `web`.

A questão central é: **como fazer o login no mesmo aparelho reaproveitar a sessão, registrar só aparelhos novos e mostrar o tipo de cada um?**

## Decisão

### Identificação do aparelho

O cliente passa a enviar dois cabeçalhos opcionais, validados em `clientMetadataHeaders` como os demais (ADR-0032):

| Cabeçalho       | Formato                                    | Uso                                                                                                                                                                                                                                                                                                                              |
| --------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `x-device-id`   | 16 a 128 caracteres `[A-Za-z0-9_-]`        | Identificador aleatório e estável do aparelho. No site, um cookie de dispositivo `httpOnly` criado pelo BFF ([ADR-0007 do frontend](https://github.com/MissionAppFaithTech/MissionAppFrontend/blob/main/docs/architecture/decisions/0007-identificacao-do-aparelho-e-gestao-de-sessoes.md)); no app, um id gerado na instalação. |
| `x-device-kind` | `desktop`, `mobile`, `tablet` ou `unknown` | Tipo do aparelho exibido na lista de sessões.                                                                                                                                                                                                                                                                                    |

Valores inválidos respondem 422 (`E_VALIDATION_ERROR`), antes de conferir a senha.

### Modelo de dados

Migração nova (ADR-0020) em `refresh_tokens`:

- `device_id` varchar(64), nulo: **hash SHA-256** do `x-device-id`. O valor bruto não é guardado, como o próprio refresh token. Assim, um vazamento do banco não entrega o identificador que o cliente apresenta.
- `device_kind` varchar(16), not null, padrão `unknown`, com check `chk_refresh_tokens_device_kind`.
- Índice parcial `idx_refresh_tokens_user_id_device_id_active` em `(user_id, device_id)` para tokens ativos com `device_id`.

### Login e cadastro

`TokenIssuanceService.issue` chama `RefreshTokenService.startSession`:

- **Com `x-device-id`:** numa transação, revoga os tokens ativos das famílias do **mesmo usuário** naquele aparelho e cria a família nova. Depois do commit, chama `blockFamily()` para cada família substituída. O access token antigo deixa de valer na hora, e o refresh token antigo responde 401.
- **Sem `x-device-id`:** cria uma família nova, como antes. Clientes antigos continuam funcionando.

O mesmo `x-device-id` usado por outro usuário (ex.: duas contas no mesmo navegador) não afeta as sessões dele: a busca é sempre por `(user_id, device_id)`.

### Refresh

- O token filho herda `device_id` e `device_kind` do pai **quando o pedido não os envia**. O BFF os envia em todo pedido, mas um cliente que só os manda no login não perde a identificação.
- A detecção de replay do ADR-0035 compara também o `device_id`, **quando os dois lados o têm**. Um replay dentro da janela vindo de outro aparelho é tratado como roubo, mesmo com `x-device-name` igual.

### Lista de sessões

`GET /auth/sessions` acrescenta:

- `deviceKind`;
- `startedAt`: `created_at` do primeiro token da família, ou seja, quando a sessão começou. O `createdAt` existente é o da última rotação e continua igual.

### Interface

Decisão de produto registrada aqui porque define o uso da API: a tela de configurações mostra o botão "Encerrar" **só nas outras sessões**. A sessão atual sai pelo "Sair". A API continua aceitando `DELETE /auth/sessions/{familyId}` da sessão atual, com o mesmo efeito de um logout.

## Justificativa

- **Padrão da OWASP:** o "device cookie" (identificador aleatório guardado no aparelho) é o mecanismo recomendado para reconhecer um aparelho já visto, sem coletar características do hardware.
- **Sem rastreamento:** não há impressão digital do navegador. O identificador só existe porque o próprio cliente o criou, e o usuário o apaga limpando os dados do site.
- **Compatível:** os dois cabeçalhos são opcionais. Sem eles, nada muda.
- **Revogação imediata:** substituir a sessão usa os mesmos mecanismos da revogação remota (`revoked_at` + `blockFamily`), sem caminho novo de segurança.

## Alternativas Consideradas

1. **Agrupar por `x-device-name` + IP.** Descartada: o nome se repete entre máquinas com o mesmo navegador, e o IP muda (rede móvel, Wi-Fi) ou é compartilhado (NAT). Juntaria aparelhos diferentes e separaria o mesmo aparelho.
2. **Impressão digital do navegador (ex.: FingerprintJS).** Descartada: é rastreamento, exige base legal e transparência pela LGPD, e a versão precisa é paga.
3. **Manter várias sessões por aparelho e só esconder as antigas na lista.** Descartada: as sessões escondidas continuariam válidas e invisíveis para o usuário.
4. **Reaproveitar a família no relogin (rotacionar em vez de criar).** Descartada: o login com senha deve começar uma sessão nova. Reaproveitar a família manteria tokens de antes do login, inclusive de quem conhecia a senha antiga.

## Consequências (Trade-offs)

### Positivas / Benefícios

- A lista mostra um item por aparelho, com o tipo e o início da sessão.
- Entrar de novo no mesmo aparelho encerra a sessão anterior, inclusive tokens que tenham vazado dela.
- Clientes sem os cabeçalhos novos continuam funcionando.

### Negativas / Riscos

- **O aparelho é o armazenamento do cliente, não o hardware.** Limpar cookies, usar janela anônima ou outro navegador no mesmo computador gera um aparelho novo.
- **Duas abas logando ao mesmo tempo** no mesmo navegador: a segunda substitui a primeira, que volta para o login no próximo pedido. É o comportamento esperado de "uma sessão por aparelho".
- **`x-device-kind` é declarado pelo cliente.** Serve só para exibição; nenhuma regra de segurança depende dele.
- **Lista um pouco mais cara:** `startedAt` exige uma agregação por família (uma consulta extra, limitada às sessões ativas do usuário).

## Referências

- [ADR-0020](./0020-convencoes-de-escrita-de-migracoes.md): convenção das migrations
- [ADR-0023](./0023-estrategia-de-autenticacao-jwt-hibrido-com-revogacao-via-dragonflydb.md): famílias de refresh token, revogação e lista de sessões
- [ADR-0032](./0032-ip-do-usuario-repassado-pelo-bff-com-segredo-compartilhado.md): validação dos cabeçalhos de metadados do cliente
- [ADR-0035](./0035-rotacao-idempotente-de-refresh-token-com-janela-de-tolerancia.md): detecção de replay que passa a comparar o `device_id`
- [ADR-0007 do frontend](https://github.com/MissionAppFaithTech/MissionAppFrontend/blob/main/docs/architecture/decisions/0007-identificacao-do-aparelho-e-gestao-de-sessoes.md): cookie de dispositivo e tela de sessões
- [OWASP — Authentication Cheat Sheet, "Device Cookies"](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html): identificador aleatório para reconhecer aparelhos já vistos
- [OWASP — Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)

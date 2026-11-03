# [ADR-0034]: Envelope de Erro Único com Código Estável

## Dados

- **Status:** 🟢 Aceito
- **Data:** 2026-11-01
- **Proponentes:** [@Amaro-peter](https://github.com/Amaro-peter)

---

## Contexto e Problema

Respostas de sucesso têm envelope definido (`{ data: { <nome>: ... } }` via `serialize()`). Respostas de erro não têm, e hoje um cliente recebe formatos diferentes conforme a origem do erro:

| Origem                                                                                                 | Corpo hoje                                           |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| Validação VineJS (422)                                                                                 | `{ errors: [{ message, rule, field }] }`             |
| Guard de autenticação (`E_UNAUTHORIZED_ACCESS`, 401)                                                   | `{ errors: [{ message }] }`                          |
| Exceções de domínio (`E_ACCOUNT_LOCKED`, `E_INVALID_REFRESH_TOKEN`, `E_MISSIONARY_PROFILE_NOT_FOUND`…) | `{ message }` em produção, **sem o `code`**          |
| Rate limit (429)                                                                                       | `{ message }` + header `Retry-After`                 |
| Qualquer erro fora de produção                                                                         | JSON de debug do Youch (`debug = !app.inProduction`) |

O handler (`app/exceptions/handler.ts`) só delega ao `super.handle()`. Cada exceção de domínio já declara um `static code` (ex.: `app/exceptions/auth/account_locked_exception.ts`), mas o código não chega ao cliente.

Isso tem dois efeitos concretos:

- **O BFF traduz erros comparando texto.** `src/lib/api/errors.ts` do frontend mantém um mapa `EXACT_API_MESSAGES_PT` com frases em inglês ("Invalid user credentials", "Account is locked", "Unauthorized access"…). Qualquer mudança de redação na API, inclusive pela internacionalização do ADR-0031, quebra a tradução em silêncio.
- **O cliente não decide bem o que fazer.** Para saber se deve tentar de novo, esperar, pedir login ou mostrar erro de campo, o cliente precisa de um código estável e de um tempo de espera legível. O `E_ACCOUNT_LOCKED` (423) carrega `retryAfterSeconds` só dentro do texto da mensagem, sem header.
- **Os testes integrados divergem de produção.** Em desenvolvimento o corpo do erro é o JSON de debug, então o BFF é testado contra um formato que produção nunca envia.

A questão central é: **qual formato único a API usa para toda resposta de erro, para que clientes reajam por código e não por texto?**

## Decisão

Toda resposta de erro da API (4xx e 5xx), em qualquer ambiente, usa o mesmo envelope:

```json
{
  "message": "Mensagem legível, já no idioma resolvido pelo ADR-0031",
  "code": "E_ACCOUNT_LOCKED",
  "errors": [{ "field": "email", "rule": "email", "message": "…" }],
  "meta": { "retryAfterSeconds": 900 }
}
```

- `message` (**obrigatório**): texto para humanos, traduzido conforme o `Accept-Language` (ADR-0031). Clientes **não** devem tomar decisões com base nele.
- `code` (**obrigatório**): identificador estável em `SCREAMING_SNAKE_CASE` com prefixo `E_`. É parte do contrato público: renomear um código é breaking change.
- `errors` (**opcional**): só em erros de validação (422), um item por campo, preservando `field`, `rule` e `message` do VineJS. O `code` desses erros é `E_VALIDATION_ERROR`.
- `meta` (**opcional**): dados estruturados que o cliente precisa para reagir (ex.: `retryAfterSeconds`). Nunca contém dado sensível.

### Implementação

1. **`app/exceptions/handler.ts` renderiza o envelope** para toda exceção com `status` HTTP:
   - usa o `code` declarado (`static code` ou `error.code`);
   - mapeia erros do framework para códigos fixos: VineJS → `E_VALIDATION_ERROR`; guard → `E_UNAUTHORIZED_ACCESS`; rota inexistente → `E_ROUTE_NOT_FOUND`; registro não encontrado do Lucid → `E_ROW_NOT_FOUND`.
2. **Erros sem status (bugs)** respondem 500 com `{ message: <genérica>, code: 'E_INTERNAL_SERVER_ERROR' }`. Detalhes vão só para o log e o monitoramento.
3. **Fora de produção** o envelope é o mesmo. O detalhe de debug pode ir num campo extra `debug` (stack, causa), que nunca existe em produção. Assim o BFF é testado contra o formato real.
4. **Tempo de espera em header e no corpo:** 423 (`E_ACCOUNT_LOCKED`) passa a enviar `Retry-After`, como os 429 já fazem, e repete o valor em `meta.retryAfterSeconds`. Os 429 dos rate limits ganham `code: 'E_TOO_MANY_REQUESTS'`.
5. **Mensagens de confirmação de sucesso** (`{ message }` de logout e troca de senha) ficam fora deste ADR. Continuam regidas pelo ADR-0031.
6. **Catálogo de códigos documentado** no OpenAPI (ADR-0027): um schema `ErrorResponse` reutilizado por todos os endpoints, com a lista de `code` possíveis por rota.
7. **Teste de contrato:** um teste funcional garante que cada classe de exceção do projeto produz o envelope com `code` não vazio.

### Efeito no frontend

O BFF (`src/lib/api/errors.ts`) passa a mapear `code` para mensagens em pt-BR. O mapa por texto em inglês é removido depois que todos os endpoints usados estiverem no envelope novo. A decisão de retry do TanStack Query (ADR-0002 do frontend) usa status + `code`.

**Notas de implementação (2026-11-04):**

- O envelope entrou no #158. O item 6 foi concluído depois: cada resposta de erro das specs de domínio e do bundle termina com "Códigos: …" e usa `ValidationErrorResponse` no 422 e `ErrorResponse` nos demais. O teste `tests/unit/docs/openapi_error_codes.spec.ts` falha se uma resposta de erro ficar sem código, se citar um código que a API não tem ou se o bundle divergir dos arquivos de domínio.
- Os códigos que valem para qualquer operação (500 `E_INTERNAL_SERVER_ERROR`, erros do body parser como 413 `E_REQUEST_ENTITY_TOO_LARGE` e o 404 `E_ROUTE_NOT_FOUND`) ficam descritos uma vez, no `code` do `ErrorResponse`.
- No frontend, o mapa de mensagens por texto em inglês saiu (MissionAppFrontend #133): os erros passam a ser traduzidos só pelo `code` e pelas regras do VineJS.

## Justificativa

- **Contrato estável:** o código não muda quando a redação ou o idioma mudam. Isso é indispensável agora que o ADR-0031 torna as mensagens traduzíveis.
- **Um formato só** simplifica o BFF, os testes e qualquer cliente futuro (app mobile), e elimina a divergência entre desenvolvimento e produção.
- **Aproveita o que já existe:** as exceções de domínio já declaram `static code`; falta só renderizá-lo.
- **Reação correta do cliente:** com `code` e `Retry-After`, o cliente distingue "tente de novo" de "espere", "faça login" e "corrija o campo" sem heurística.

## Alternativas Consideradas

**1. RFC 9457 (Problem Details, `application/problem+json`)**

É padrão IETF, com `type`, `title`, `status`, `detail` e `instance`. Exige URIs de `type` e muda o `Content-Type`, o que mexe em todos os clientes e no OpenAPI de uma vez. O envelope proposto é compatível em espírito (`code` ≈ `type`, `message` ≈ `detail`) e mais próximo do formato atual. Fica como evolução possível. Descartada por ora.

**2. Manter os formatos atuais e só incluir `code` nas exceções de domínio**

Menor mudança, mas mantém três formatos e o JSON de debug fora de produção. O cliente continuaria tratando cada caso de um jeito. Descartada.

**3. Traduzir no cliente a partir da mensagem em inglês (status quo)**

Já se mostrou frágil. Qualquer ajuste de texto na API quebra a tradução sem erro de compilação nem de teste. Descartada.

## Consequências (Trade-offs)

### Positivas / Benefícios

- Clientes reagem por `code`, com segurança contra mudanças de texto e de idioma.
- Mesmo formato em todos os ambientes: os testes integrados BFF↔API passam a valer para produção.
- Tempo de espera legível por máquina em 423 e 429.

### Negativas / Riscos

- **Mudança de contrato:** o formato `{ errors: [...] }` dos erros de validação ganha `message` e `code` no topo. O BFF precisa aceitar os dois formatos durante a transição. Hoje o BFF é o único cliente, então a coordenação é simples.
- **Catálogo de códigos a manter:** cada exceção nova precisa de `code` único e documentado. O teste de contrato impede que uma exceção saia sem código.
- **Esforço inicial** no handler e nos testes funcionais existentes que verificam o corpo de erro.

## Referências

- [ADR-0025](./0025-convencoes-de-controllers-e-roteamento-rest.md): convenções REST e envelope de sucesso
- [ADR-0027](./0027-documentacao-de-endpoints-com-openapi-estatico-e-scalar.md): onde o schema `ErrorResponse` e os códigos são documentados
- [ADR-0031](./0031-adocao-do-adonisjs-i18n-para-internacionalizacao-de-mensagens-da-api.md): mensagens traduzíveis, motivo para não depender do texto
- [AdonisJS — Exception handling](https://docs.adonisjs.com/guides/basics/exception-handling): personalização do `handle` e do `status`/`code` de exceções
- [RFC 9457 — Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457): padrão alternativo considerado

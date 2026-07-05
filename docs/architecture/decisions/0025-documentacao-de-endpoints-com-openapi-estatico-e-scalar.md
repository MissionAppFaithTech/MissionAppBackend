# [ADR-0025]: Documentação de Endpoints com OpenAPI Estático e Scalar

## Dados

- **Status:** 🔵 Em Uso
- **Data:** 2026-06-14
- **Proponentes:** [Allber Ferreira](https://github.com/AFSFerreira)

---

## Contexto e Problema

A API precisa de documentação interativa acessível a contribuidores, integradores e ao time de frontend. As abordagens comuns no ecossistema Node.js/AdonisJS para gerar essa documentação introduzem trade-offs que precisam ser avaliados:

- **Anotações em controllers** (ex: `adonis-autoswagger`): a biblioteca lê arquivos-fonte em runtime no boot, adiciona anotações JSDoc a todos os métodos dos controllers e viola o princípio de controller fino (ADR-0023) e a convenção de JSDoc seletivo (ADR-0022).
- **Decoradores** (ex: padrão `@nestjs/swagger`): executam via `reflect-metadata` no carregamento dos módulos, acoplam metadados de documentação ao código de produção e não existem no ecossistema AdonisJS com a mesma maturidade.
- **Spec gerado automaticamente a partir de código**: requer tooling customizado para extrair schemas VineJS e tipos TypeScript para OpenAPI — não existe solução pronta e madura para AdonisJS v7.

A questão central é: **como manter a documentação da API precisa, acessível e desacoplada do código de produção?**

## Decisão

Adotaremos uma abordagem **design-first com spec estático**: o contrato da API é descrito manualmente em arquivos YAML (OpenAPI 3.1) sob `docs/api/v1/`, e o [Scalar](https://scalar.com/) renderiza o arquivo raiz como documentação interativa.

O spec YAML é a **fonte de verdade do contrato entre backend e frontend**. Qualquer mudança na superfície da API — nova rota, campo adicionado ou removido, status code alterado — deve ser refletida no YAML no mesmo PR.

Ferramentas como [Orval](https://orval.dev/) e [Kubb](https://kubb.dev/) podem consumir o spec para gerar clientes TypeScript type-safe e hooks no frontend, tornando-o o ponto de sincronização entre as duas camadas.

### Organização por domínio

O spec é dividido em múltiplos arquivos para permanecer manutenível à medida que a superfície da API cresce:

- `docs/api/v1/openapi.yaml` — arquivo raiz: `info`, `servers`, `tags`, `securitySchemes` e o mapa `paths`, onde cada rota é um `$ref` apontando para o arquivo de domínio correspondente (ex: `./auth/openapi.yaml#/paths/~1auth~1login`).
- `docs/api/v1/<domínio>/openapi.yaml` — arquivo de agrupamento da pasta. Não contém `paths` nem `schemas` próprios, apenas `$ref`s para os demais arquivos daquela pasta. É este arquivo que o `openapi.yaml` raiz referencia — o raiz nunca aponta diretamente para `<domínio>.openapi.yaml` ou para os arquivos de superfície adicionais. Toda pasta de domínio tem um, mesmo quando a pasta tem um único arquivo de conteúdo.
- `docs/api/v1/<domínio>/<domínio>.openapi.yaml` — arquivo principal de conteúdo do domínio: os `paths` e `schemas`/`parameters` (em `components`) da superfície de contrato central daquele domínio (ex: `auth/auth.openapi.yaml`, `user/user.openapi.yaml`).
- `docs/api/v1/<domínio>/<superfície>.openapi.yaml` — arquivos adicionais para superfícies de contrato distintas dentro do mesmo domínio, quando existirem (ex: `user/missionary.openapi.yaml` para o fluxo de aprovação de missionários, `audit/logins.openapi.yaml` e `audit/permissions.openapi.yaml` para trilhas de auditoria com shapes de resposta diferentes). Cada um é referenciado pelo `openapi.yaml` de agrupamento da própria pasta. Domínios podem referenciar schemas de outros domínios via `$ref` relativo (ex: `../auth/auth.openapi.yaml#/components/schemas/LoginResponse`).

**O critério para abrir um novo arquivo de superfície é o mesmo da separação por domínio — nunca a tabela SQL.** Uma tabela persistir dado de duas superfícies de contrato diferentes (ex: `password_hash` e `full_name`, ambos na tabela `users`, mas expostos por rotas com propósitos de contrato distintos) não é motivo para split; superfícies de contrato diferentes coincidirem por acaso na mesma tabela também não é motivo para uni-las num arquivo só. Dividir por tabela reintroduziria o acoplamento entre schema relacional e contrato de API que a separação por domínio já existe para evitar — um refactor de schema que não muda o contrato do cliente não deveria forçar reorganização de arquivos de documentação.

**Critério de separação por domínio: o que o endpoint faz, não em qual tabela o dado é persistido.** Uma rota entra na pasta `auth/` quando ela prova identidade ou gerencia o ciclo de vida de uma sessão (login, refresh, logout) — o contrato dessas rotas é sobre o mecanismo de autenticação, não sobre o formato de um recurso. Uma rota entra na pasta do recurso (ex: `user/`) quando ela lê ou muta um atributo desse recurso, mesmo que o atributo seja sensível — troca de senha (`PATCH /account/password`) é `user/`, não `auth/`, pelo mesmo motivo que `GET /account/profile` é `user/`: ambas operam sobre o registro do usuário, uma delas apenas atualiza a coluna de senha em vez de outra coluna qualquer. `password_hash` morar na tabela `users` é detalhe de implementação; não determina o shape do contrato de nenhuma dessas rotas.

Essa distinção generaliza para novos domínios conforme a API cresce (ex: `post/` para o recurso Post, `campaign/` para Campaign): a pergunta a fazer é sempre "esta rota autentica/gerencia sessão" (→ `auth/`) ou "esta rota lê/muta um recurso" (→ pasta do recurso), nunca "em qual tabela SQL isso vive".

## Justificativa

- **Zero impacto no código de produção:** comentários e decoradores de documentação não entram nos controllers, mantendo ADR-0022 e ADR-0023 íntegros.
- **Zero custo de runtime:** o YAML é um arquivo estático; não há parsing de código-fonte no boot nem metadados em memória por requisição.
- **Spec como contrato explícito:** a abordagem design-first força que mudanças na API sejam pensadas e documentadas antes ou junto com a implementação, não retroativamente.
- **Compatibilidade com geração de cliente frontend:** Orval e Kubb consomem o mesmo `openapi.yaml` para gerar código TypeScript tipado no frontend — uma mudança no spec propaga para o cliente gerado automaticamente.
- **Versionamento claro:** `docs/api/v1/openapi.yaml` espelha o prefixo `/api/v1`; quando existir v2, o arquivo correspondente será `docs/api/v2/openapi.yaml`.

## Alternativas Consideradas

**1. Anotações JSDoc em controllers (adonis-autoswagger)**

A biblioteca parseia arquivos `.ts` no boot para extrair comentários `@paramPath`, `@requestBody`, `@responseBody` dos métodos. Descartada porque: (1) viola ADR-0022 — controllers são camada proibida para JSDoc; (2) viola ADR-0023 — controllers devem ser finos e sem responsabilidades extras; (3) adiciona custo de leitura e parse de arquivos no startup; (4) o spec não existe em build time, apenas em runtime.

**2. Geração automática a partir de VineJS + TypeScript**

Extrair schemas VineJS como `requestBody` e tipos TypeScript dos transformers como `responses` eliminaria duplicação. Descartada porque não existe tooling pronto para AdonisJS v7 que faça essa extração — implementar e manter scripts customizados de geração representaria complexidade desproporcional ao benefício.

**3. Spec gerado por decoradores**

Padrão do `@nestjs/swagger` com `@ApiProperty()`, `@ApiOperation()` etc. Não existe equivalente maduro no ecossistema AdonisJS, e a filosofia do framework é explicitamente contrária ao uso de decoradores para metadados de infraestrutura em models e controllers.

## Consequências (Trade-offs)

### Positivas / Benefícios

- Controllers permanecem finos e sem anotações de documentação
- Spec existe como arquivo estático versionável em Git — revisável em PR como qualquer outro arquivo
- Scalar renderiza o YAML sem configuração adicional de runtime
- Frontend pode usar Orval ou Kubb para gerar clientes tipados a partir do mesmo spec

### Negativas / Riscos

- **Risco de drift:** o spec pode ficar desatualizado se uma mudança de API não for acompanhada da atualização do YAML — o único mecanismo de prevenção é a convenção e a revisão de PR
- **Esforço de manutenção manual:** cada novo endpoint ou campo exige edição explícita do YAML; não há geração automática que garanta sincronia

## Referências

- [Scalar — Documentação oficial](https://scalar.com/): renderizador de API docs interativo que consome o OpenAPI spec
- [OpenAPI Specification 3.x](https://spec.openapis.org/oas/v3.1.0): especificação do formato adotado para o contrato da API
- [Orval](https://orval.dev/): geração de clientes TypeScript e hooks a partir do OpenAPI spec para o frontend
- [Kubb](https://kubb.dev/): alternativa ao Orval com suporte a Zod schemas e mocks MSW gerados a partir do spec
- [ADR-0022](./0022-convencao-de-documentacao-de-codigo-com-jsdoc.md): convenção de JSDoc que proíbe anotações em controllers — motivação para rejeitar abordagens de anotação
- [ADR-0023](./0023-convencoes-de-controllers-e-roteamento-rest.md): convenção de controller fino que reforça a separação entre código de produção e documentação

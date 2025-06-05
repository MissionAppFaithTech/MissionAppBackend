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

Adotaremos uma abordagem **design-first com spec estático**: o contrato da API é descrito manualmente em `docs/api/v1/openapi.yaml` (OpenAPI 3.x), e o [Scalar](https://scalar.com/) renderiza esse arquivo como documentação interativa.

O spec YAML é a **fonte de verdade do contrato entre backend e frontend**. Qualquer mudança na superfície da API — nova rota, campo adicionado ou removido, status code alterado — deve ser refletida no YAML no mesmo PR.

Ferramentas como [Orval](https://orval.dev/) e [Kubb](https://kubb.dev/) podem consumir o `openapi.yaml` para gerar clientes TypeScript type-safe e hooks no frontend, tornando o spec o ponto de sincronização entre as duas camadas.

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

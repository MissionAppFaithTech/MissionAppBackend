# [ADR-0003]: Arquitetura de Diretórios — Scaffolding do AdonisJS e Extensões do Projeto

## Dados

- **Status:** 🔵 Em Uso
- **Data:** 2026-07-05
- **Proponentes:** [Allber Ferreira](https://github.com/AFSFerreira)

---

## Contexto e Problema

Nenhum ADR documenta a árvore de diretórios do projeto como um todo. Isso não é um problema para as pastas que vêm do scaffolding padrão do AdonisJS (`bin/`, `config/`, `start/`, `database/`, `providers/`, `commands/`, `tests/`, e a maioria de `app/`) — essas já são documentadas pela [documentação oficial do AdonisJS](https://docs.adonisjs.com/guides/getting-started/folder-structure) e não precisam de um ADR próprio só para redizer o que o framework já explica.

O problema aparece no que o scaffold padrão não prevê. Três tipos de artefato — constantes de valor, funções utilitárias e declarações de tipo compartilhadas entre camadas — não têm pasta própria no scaffold do AdonisJS, e sem uma convenção explícita cada um seria criado de forma ad hoc: uma constante aqui, uma função ali, um `type` solto dentro do arquivo que mais precisa dele. Paralelamente, a convenção de cinco métodos padrão por controller (ADR-0025) tem um efeito colateral direto: cada operação não-CRUD de um domínio vira um controller de método único, e o mesmo vale para services à medida que a lógica de negócio de um domínio cresce. Sem um critério de organização, `app/controllers/` e `app/services/` tendem a virar listas planas onde nenhum agrupamento visual comunica quais arquivos pertencem ao mesmo domínio — e cada domínio novo decidiria por conta própria se cria ou não uma subpasta, produzindo inconsistência entre partes do código escritas em momentos diferentes.

Um contribuidor que lê só a documentação oficial do AdonisJS não encontra resposta para nenhum desses pontos — precisa decidir por conta própria onde um arquivo novo deveria morar, com risco real de divergir do que o resto do time decidiria.

A questão central é: **qual convenção de diretórios — além do que o scaffold padrão do AdonisJS já resolve — mantém `app/controllers/`, `app/services/` e os artefatos compartilhados (constantes, utilitários, tipos) navegáveis e previsíveis à medida que o número de domínios cresce?**

## Decisão

### 1. Estrutura padrão do AdonisJS — referência, não redefinição

As pastas abaixo seguem exatamente a convenção do scaffold `api` oficial do AdonisJS v7 (ver [ADR-0001](./0001-adocao-do-adonisjs-como-framework-backend.md) para a decisão de adoção do framework). Este ADR não redefine o propósito delas — só lista para dar visão completa da árvore antes de detalhar as extensões:

| Diretório | Propósito (padrão AdonisJS) |
| --- | --- |
| `bin/` | Entrypoints do processo — `server.ts` (HTTP), `console.ts` (Ace), `test.ts` (Japa) |
| `config/` | Arquivos de configuração de cada pacote instalado (`app.ts`, `auth.ts`, `database.ts` etc.) |
| `start/` | Bootstrap da aplicação — `routes.ts`, `kernel.ts` (middleware), `env.ts` (schema de variáveis de ambiente), `validator.ts` |
| `database/` | `migrations/` (fonte da verdade do schema) e `schema.ts` (auto-gerado, nunca editado à mão) |
| `providers/` | Service providers customizados, registrados em `adonisrc.ts` |
| `commands/` | Comandos Ace customizados (`node ace make:command`) |
| `tests/` | Suítes Japa — `unit/` e `functional/`, configuradas em `adonisrc.ts` |
| `app/controllers/` | Handlers HTTP finos |
| `app/models/` | Models Lucid ORM |
| `app/validators/` | Schemas VineJS |
| `app/middleware/` | Middleware HTTP |
| `app/exceptions/` | Handler global de erros |

Para o significado detalhado de cada uma — e de qualquer outra pasta do scaffold não usada de forma não-convencional neste projeto — a fonte de verdade é a [documentação oficial do AdonisJS](https://docs.adonisjs.com/guides/getting-started/folder-structure). Divergências desse padrão só acontecem nos pontos descritos a seguir, e são deliberadas.

### 2. Três pastas dedicadas para artefatos compartilhados, nunca misturados entre si

```
app/
  constants/    valores, strings, maps e objects exportados — nunca uma função
  utils/        funções puras reutilizáveis — nunca uma constante de valor solta
  types/        type/interface utilizada por um ou mais arquivos
```

Cada pasta deve aceitar exatamente um tipo de conteúdo — nunca se misturam entre si. Um arquivo de `utils/` que precisar de um valor fixo (ex: um mapa de conversão) deve importar de `constants/` em vez de declarar o valor inline.

**`app/types/` não deve agrupar arquivos por tema livre — a pasta espelha a camada e o domínio de quem declara o tipo.** A regra de posicionamento: um tipo mora no mesmo caminho, dentro de `app/types/`, do arquivo que o declara conceitualmente — não de todo arquivo que o importa. Por exemplo, se um domínio `campaign` tivesse um `CampaignService` produzindo um resumo consumido tanto pelo próprio service quanto por um controller, o tipo desse resumo pertenceria à subpasta do service, não à do controller que apenas o repassa adiante:

```
app/types/
  services/
    campaign/
      campaign_summary.ts   # espelha app/services/campaign/campaign_service.ts,
                             # não app/controllers/campaign/, mesmo sendo
                             # consumido também por lá
```

### 3. Subpasta por domínio

Esta convenção estende-se para qualquer pasta em que o seguinte princípio se aplica: agrupar arquivos por domínio de negócio da aplicação em vez de manter uma lista plana ou em subpastas com nomes arbitrários. Por exemplo, um domínio `campaign` com mais de uma operação não-CRUD (ADR-0025) organizaria seus arquivos assim:

```
app/controllers/
  campaign/
    campaigns_controller.ts
    campaign_status_controller.ts
    ...

app/services/
  campaign/
    campaign_service.ts
    ...
  shared/
    <client_ou_utilitário_reutilizável_por_qualquer_domínio>.ts

app/exceptions/
  campaign/
    campaign_not_found_exception.ts
    ...
  handler.ts

app/jobs/
  campaign/
    close_expired_campaigns_job.ts
    ...
```

**Diferença de regra entre as camadas:** em `app/controllers/`, a subpasta deve ser criada para alocar controllers de um mesmo domínio de negócio — a convenção de cinco métodos padrão (ADR-0025) faz isso acontecer rápido, já que toda operação não-CRUD vira um controller de método único. Uma lógica análoga se aplica às pastas `app/services/`, `app/exceptions/` e `app/jobs/`: subpasta obrigatória desde o primeiro arquivo do domínio — toda classe de exceção (ex: `CampaignNotFoundException`) e todo job (ex: `close_expired_campaigns_job.ts`) vai direto para a subpasta do seu domínio, nunca para a raiz. Um service que não pertencer a nenhum domínio específico (ex: um client de infraestrutura reutilizável por qualquer domínio futuro) vai para `app/services/shared/`, nunca para a raiz. Já `app/exceptions/handler.ts` é o único arquivo que permanece na raiz — é o handler global exigido pelo scaffold do AdonisJS (seção 1), não uma exceção de domínio.

O nome da subpasta deve seguir o mesmo domínio documentado em `docs/api/v1/<domínio>/` (ADR-0027): o que o endpoint/serviço faz, não em qual tabela o dado é persistido.

## Justificativa

**Por que um ADR para pastas que "só" organizam arquivos, e não para o resto do scaffold?**
O scaffold padrão já tem justificativa pronta — é o AdonisJS, com documentação oficial mantida por terceiros. Documentá-lo de novo aqui seria duplicação que fica desatualizada a cada nova versão do framework. As extensões do projeto não têm essa documentação em lugar nenhum — se não ficarem aqui, não ficam em lugar nenhum.

**Por que `app/types/` deve espelhar a árvore de `app/` em vez de agrupar por tema?**
Um arquivo nomeado por tema (`http.ts`, `auth.ts`) força quem procura "qual tipo um determinado service usa" a adivinhar em qual arquivo temático ele foi parar. Espelhando a árvore, a pergunta "onde está o tipo de X" sempre tem a mesma resposta: no mesmo caminho de X, dentro de `app/types/`.

**Por que não usar `declare module` (module augmentation) para os tipos do projeto?**
Module augmentation é o mecanismo que o próprio AdonisJS reserva para estender tipos de bibliotecas do framework (ver `RoutesList` em `.adonisjs/server/routes.d.ts`, gerado pelo Tuyau). Tipos de domínio do projeto não devem competir por esse mecanismo — `export type`/`export interface` explícito em `app/types/`, importado via `#types/*`, é mais rastreável e não depende de ordem de carregamento de augmentation.

## Alternativas Consideradas

**1. Documentar a árvore de diretórios inteira, scaffold incluso, com o mesmo nível de detalhe**

Descartada. Duplicaria a documentação oficial do AdonisJS e ficaria desatualizada a cada mudança de versão do framework. Este ADR referencia a documentação oficial para o scaffold padrão e reserva o detalhamento para o que é específico deste projeto.

**2. Um único arquivo `app/types/index.ts` com tudo**

Descartada. Concentraria imports não relacionados no mesmo arquivo, forçando qualquer mudança a tocar um arquivo compartilhado por todo o projeto — o oposto do isolamento que subpastas por domínio garantem nas outras camadas.

**3. Nomear arquivos de `app/types/` por tema livre (`auth-types.ts`, `http-types.ts`)**

Descartada. Funciona enquanto há poucos tipos, mas não escala: a que tema pertence um tipo usado por um service E por um controller do mesmo domínio? A resposta vira arbitrária. Espelhar a camada de origem remove a ambiguidade.

**4. Colocar tipos dentro de cada pasta de domínio (ex: `app/services/campaign/types.ts`) em vez de centralizar em `app/types/`**

Parcialmente descartada. Funciona para tipos usados só dentro daquele domínio, mas um tipo típico deste projeto tende a ser consumido por mais de uma camada do mesmo domínio (ex: um tipo de metadados produzido por um service e repassado por um controller). Centralizar em `app/types/` com a árvore espelhada preserva a regra "constants/utils/types nunca misturados com código executável" sem perder a rastreabilidade de origem.

## Consequências (Trade-offs)

### Positivas / Benefícios

- Um novo contribuidor tem uma única fonte para "onde esse arquivo deveria morar": documentação oficial do AdonisJS para o scaffold, este ADR para tudo que o projeto adiciona por cima
- Pastas que compartilham contexto de domínio de negócios (como `app/controllers/` e `app/services/`) seguem a mesma convenção de subpasta por domínio — uma única regra mental para toda a árvore de `app/`
- `app/types/` responde sempre à mesma pergunta ("onde está o tipo de X") com a mesma lógica de busca — o caminho espelha `app/`
- A navegação pelo código-fonte se torna mais direta: como a localização de um arquivo passa a ser determinada pela camada e pelo domínio a que ele pertence, e não por convenções particulares de quem o escreveu, tanto a busca manual quanto o uso de ferramentas de navegação (IDE, busca por caminho, indexação por IA) chegam ao arquivo certo com menos passos intermediários

### Negativas / Riscos

- Domínio errado na hora de criar a subpasta é um erro de julgamento que só aparece depois — mitigado por seguir o mesmo domínio já documentado em `docs/api/v1/<domínio>/` (ADR-0027), que existe antes do código
- Subpastas de domínio ou contexto acompanhando desde o primeiro arquivo significa que um domínio com um único service futuro, por exemplo, ainda ganha uma pasta com um arquivo só — aceito conscientemente (ver Justificativa) em troca de nunca precisar de um PR só de reorganização
- Espelhar a árvore de `app/` dentro de `app/types/` significa que mover um arquivo de camada (ex: um service de subpasta) exige lembrar de mover o tipo correspondente junto — não há verificação automática dessa correspondência
- Este ADR precisa ser revisado e atualizado se o scaffold do AdonisJS mudar de forma relevante em versões futuras ou se alguma nova convenção estrutural do projeto for criada eventualmente  — a seção 1 é um resumo, não uma cópia, mas ainda é uma superfície que pode divergir da versão real instalada

## Referências

- [AdonisJS — Folder Structure](https://docs.adonisjs.com/guides/getting-started/folder-structure): documentação oficial da estrutura de diretórios padrão do scaffold
- [ADR-0001 — Adoção do AdonisJS como Framework Backend](./0001-adocao-do-adonisjs-como-framework-backend.md): decisão de adotar o framework e sua filosofia de convenções fortes
- [ADR-0024 — Convenção de Documentação de Código com JSDoc](./0024-convencao-de-documentacao-de-codigo-com-jsdoc.md): convenção de JSDoc por camada, incluindo `app/services/`, `app/utils/` e `app/types/`
- [ADR-0025 — Convenções de Controllers e Roteamento REST](./0025-convencoes-de-controllers-e-roteamento-rest.md) §7: organização de controllers por domínio, critério de nomeação de subpasta
- [ADR-0027 — Documentação de Endpoints com OpenAPI Estático e Scalar](./0027-documentacao-de-endpoints-com-openapi-estatico-e-scalar.md): critério de separação por domínio (o que o endpoint faz, não a tabela onde o dado é persistido), reaproveitado aqui para nomear subpastas de código
- [ADR-0023 — Estratégia de Autenticação JWT Híbrido com Revogação via DragonflyDB](./0023-estrategia-de-autenticacao-jwt-hibrido-com-revogacao-via-dragonflydb.md): implementação que expôs a necessidade das extensões descritas aqui

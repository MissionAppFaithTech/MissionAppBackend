# [ADR-0018]: Padrão de Composição de Mixins para Comportamentos Compartilhados em Models

## Dados

- **Status:** Proposto
- **Data:** 2026-06-04
- **Proponentes:** [Allber Ferreira](https://github.com/AFSFerreira)

---

## Contexto e Problema

O projeto usa AdonisJS Lucid como ORM. Cada Model Lucid é uma classe TypeScript que representa uma tabela do banco de dados. Vários Models precisam de comportamentos idênticos: todo Model tem uma chave primária UUID v7 ([ADR-0017](./0017-adocao-de-uuid-v7-como-estrategia-de-chave-primaria.md)); a maioria tem timestamps de criação e atualização; no futuro, alguns precisarão de exclusão lógica (soft delete) e rastreabilidade de ator (quem criou/alterou o registro).

Sem uma convenção para encapsular esses comportamentos compartilhados, as alternativas naturais são:

**Herança de classe base:**
Criar `AppModel extends BaseModel` e adicionar nela todos os comportamentos comuns. Funciona para comportamentos que toda entidade precisa (timestamps), mas quebra quando entidades precisam de subconjuntos diferentes: uma tabela de junção precisa de UUID mas não de soft delete; uma tabela de auditoria precisa de UUID e ator mas não de timestamps gerenciados. Herança única não permite compor subconjuntos — leva ao problema clássico de "herança profunda com herança acidental de comportamentos indesejados".

**Copy-paste por Model:**
Duplicar a declaração `@column({ isPrimary: true }) declare id: string` e o `@beforeCreate()` em cada Model. Funciona inicialmente, mas qualquer mudança na lógica (ex: trocar a versão do UUID) precisa ser propagada manualmente para todos os Models — garantia de inconsistência ao longo do tempo.

**Decoradores e mixins ad hoc:**
Cada desenvolvedor implementa sua própria solução para o problema imediato. Resulta em múltiplas implementações incompatíveis do mesmo comportamento espalhadas pelo codebase.

O AdonisJS já adota o padrão de mixin TypeScript com a função `compose()` internamente (ex: `withAuthFinder`). A questão é: **como padronizar a extensão de comportamentos compartilhados em Models de forma que seja composável, sem herança acidental, e alinhada com o idioma do framework?**

## Decisão

Adotaremos o **padrão de mixin TypeScript via `compose()`** do AdonisJS para encapsular todos os comportamentos reutilizáveis entre Models. Novos comportamentos compartilhados **nunca** devem ser adicionados diretamente às classes de Model nem a uma classe base genérica — devem ser implementados como mixins em `app/models/mixins/` e compostos explicitamente nos Models que os necessitam.

**Estrutura de três camadas:**

```typescript
// 1. Schema (auto-gerado por node ace migration:run — NUNCA editar)
export class PostSchema extends BaseModel {
  @column() declare content: string
  @column() declare missionaryId: string
  // ...
}

// 2. Mixins (comportamentos compartilháveis — vivem em app/models/mixins/)
// WithPrimaryUuid  → chave primária UUID v7 com geração automática
// WithTimestamps   → createdAt / updatedAt gerenciados pelo Lucid
// WithSoftDelete   → deletedAt + escopo de query para filtrar excluídos (futuro)

// 3. Model (domínio — lógica, relacionamentos, scopes específicos da entidade)
export default class Post extends compose(PostSchema, WithPrimaryUuid, WithTimestamps) {
  // relacionamentos, scopes, métodos de domínio
}
```

**Regras de composição:**

1. **Nunca declare `@column` no Model.** Todas as colunas vêm do Schema gerado. Declarar `@column` no Model cria duplicidade e pode colidir com a geração automática do `database/schema.ts`.

2. **Nunca declare `id` manualmente.** A chave primária é responsabilidade exclusiva do mixin `WithPrimaryUuid`. Declarar `id` no Schema ou no Model resulta em comportamento indefinido com `selfAssignPrimaryKey = true`.

3. **Nunca declare `createdAt` / `updatedAt` manualmente.** São responsabilidade do mixin `WithTimestamps`. O Schema gerado não declara essas colunas quando o Model compõe `WithTimestamps`.

4. **Cada mixin resolve uma única responsabilidade.** Um mixin não deve acumular comportamentos não relacionados — cria o mesmo problema de herança acidental que motivou evitar a classe base.

5. **Mixins vivem em `app/models/mixins/`.** Cada mixin em seu próprio arquivo, nomeado pela convenção `with_<comportamento>.ts`.

**Ordenação obrigatória dos argumentos de `compose()`:**

A ordem dos argumentos em `compose()` não é arbitrária. O TypeScript resolve a cascata de tipagem da esquerda para a direita — um mixin que depende de propriedades definidas por um mixin anterior (ex: `withAuthFinder` precisa que `id` e `password_hash` já existam no tipo) falha silenciosamente ou produz erros de tipo difíceis de rastrear se a ordem estiver errada. A convenção adotada é do mais fundamental ao mais abstrato:

| Posição | Camada                  | O que vai aqui                                                                            | Exemplos                                              |
| ------- | ----------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 1º      | **Schema (base)**       | Sempre o Schema gerado — define as colunas e o tipo estrutural do Model                   | `UserSchema`, `PostSchema`                            |
| 2º      | **Mixins estruturais**  | Comportamentos que afetam o banco em nível baixo — geração de PK, soft delete, timestamps | `WithPrimaryUuid`, `WithTimestamps`, `WithSoftDelete` |
| 3º      | **Mixins de domínio**   | Lógica da aplicação que depende da estrutura já estabelecida pelas camadas anteriores     | `withAuthFinder(hash)`, `WithAuditableActor`          |
| 4º      | **Mixins de utilidade** | Formatadores, serializadores e modificadores de leitura que não alteram o schema          | `WithAvatarFormatter`                                 |

```typescript
export default class User extends compose(
  UserSchema, // 1º — estrutura base (colunas)
  WithPrimaryUuid, // 2º — infraestrutura (PK)
  WithTimestamps, // 2º — infraestrutura (timestamps)
  WithSoftDelete, // 2º — infraestrutura (exclusão lógica)
  withAuthFinder(hash) // 3º — domínio (autenticação depende de id + password_hash)
) {}
```

A regra prática: se mixin B depende de uma propriedade introduzida por mixin A, A vem antes de B. Mixins estruturais nunca dependem de mixins de domínio — a dependência flui sempre do mais fundamental para o mais abstrato.

## Justificativa

- **Composição explícita sobre herança implícita:** `compose(PostSchema, WithPrimaryUuid, WithTimestamps)` declara explicitamente quais comportamentos o Model possui. Um leitor do código sabe exatamente o que cada Model herda sem precisar subir a hierarquia de classes. Com uma classe base, o leitor precisa inspecionar `AppModel` para entender o que `Post` herda — e `AppModel` cresce até conter comportamentos que nem todos os Models precisam.

- **Subconjuntos sem acoplamento:** Uma tabela de junção como `campaign_projects` pode compor apenas `WithPrimaryUuid` sem carregar timestamps ou soft delete. Uma tabela de auditoria pode compor `WithPrimaryUuid` e `WithAuditableActor` sem timestamps gerenciados automaticamente. A composição seletiva é impossível com herança simples.

- **Alinhamento com o idioma do AdonisJS:** O próprio framework usa `compose()` para `withAuthFinder`, o que significa que o ecossistema de plugins e a documentação oficial adotam o mesmo padrão. Contribuidores familiarizados com AdonisJS reconhecem o padrão imediatamente.

- **Centralização da lógica de geração:** Qualquer mudança na estratégia de PK (ex: trocar a versão do UUID, adicionar validação de formato) é feita em um único arquivo — `with_primary_uuid.ts` — e propagada automaticamente para todos os Models que compõem o mixin.

- **Separação entre schema e domínio:** O Schema gerado pelo migration contém apenas declarações de colunas — é um espelho direto do DDL. O Model contém apenas lógica de domínio — relacionamentos, scopes, métodos. Os Mixins contêm comportamentos transversais. Essa separação torna cada camada previsível e testável em isolamento.

## Alternativas Consideradas

- **Classe base `AppModel extends BaseModel`:** Centraliza comportamentos compartilhados em um ancestral comum. Descartado porque: (1) herança única do JavaScript impede que um Model componha subconjuntos de comportamentos — todos os Models herdariam tudo de `AppModel`, incluindo comportamentos que não precisam; (2) `AppModel` tende a crescer indefinidamente, tornando-se um "god object" de comportamentos implícitos; (3) não é o idioma que o AdonisJS usa internamente, criando inconsistência com o ecossistema.

- **Copy-paste de declarações por Model:** Duplicar `@column({ isPrimary: true }) declare id: string` e o hook `@beforeCreate()` em cada Model. Descartado porque qualquer mudança precisa ser propagada manualmente para todos os Models — inconsistências são inevitáveis em projetos com múltiplos colaboradores.

- **Decoradores customizados (ex: `@withUUID()`):** Implementar o comportamento via decorador TypeScript. Descartado porque decoradores em TypeScript têm semântica de execução diferente de mixins e interagem de forma imprevisível com os decoradores do Lucid (`@column`, `@beforeCreate`). O `compose()` do AdonisJS é especificamente projetado para essa composição segura com o sistema de decoradores do Lucid.

- **Comportamento implementado diretamente no Model:** Cada Model implementa sua própria lógica de geração de UUID. Descartado pelas mesmas razões do copy-paste — sem centralização, sem garantia de consistência.

## Consequências (Trade-offs)

### Positivas / Benefícios

- Comportamentos compartilhados têm uma única implementação, testável em isolamento.
- Composição seletiva: cada Model declara explicitamente apenas os comportamentos que precisa.
- Alinhado com o idioma do AdonisJS — curva de aprendizado menor para contribuidores com experiência no framework.
- Extensível: novos comportamentos transversais (`WithSoftDelete`, `WithAuditableActor`) seguem o mesmo padrão sem alterar Models existentes.

### Negativas / Riscos

- **Curva de aprendizado do padrão `compose()`:** Contribuidores sem experiência com mixins TypeScript podem achar a assinatura de tipo complexa. A regra "nunca declare `@column` no Model" é contraintuitiva para quem está acostumado com ORMs que declaram colunas diretamente na classe. A documentação deste ADR é a principal salvaguarda.

- **Ordem de composição importa:** Se dois mixins declararem o mesmo nome de propriedade ou método, o comportamento depende da ordem em `compose()`. Atualmente não há conflito, mas mixins futuros devem ser escritos com atenção a colisões de nomes com o Schema gerado e entre si.

## Referências

- [AdonisJS — Model mixins (`compose()`)](https://lucid.adonisjs.com/docs/model-factories#using-model-mixins)
- [TypeScript — Mixin pattern](https://www.typescriptlang.org/docs/handbook/mixins.html)
- [ADR-0017 — UUID v7 como Estratégia de Chave Primária](./0017-adocao-de-uuid-v7-como-estrategia-de-chave-primaria.md)
- [ADR-0016 — Convenções de Escrita de Migrações de Banco de Dados](./0016-convencoes-de-escrita-de-migracoes.md)

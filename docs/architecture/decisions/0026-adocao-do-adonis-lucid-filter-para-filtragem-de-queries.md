# [ADR-0026]: Adoção do adonis-lucid-filter para Filtragem Declarativa de Queries

## Dados

- **Status:** 🔵 Em Uso
- **Data:** 2026-06-14
- **Proponentes:** [Allber Ferreira](https://github.com/AFSFerreira)

---

## Contexto e Problema

Endpoints de listagem (`index`) frequentemente precisam filtrar registros com base em parâmetros de query fornecidos pelo cliente — busca por nome, filtro por status, por intervalo de datas, etc. Sem uma convenção estabelecida, essa lógica condicional se acumula no service responsável pela listagem:

```typescript
// O que emerge sem convenção — lógica condicional crescendo no service
export default class ListUsersService {
  async execute(filters: Record<string, string>) {
    const query = User.query()

    if (filters.name) {
      query.where('name', 'like', `%${filters.name}%`)
    }
    if (filters.status) {
      query.where('status', filters.status)
    }
    if (filters.role) {
      query.where('role', filters.role)
    }
    // ... cresce indefinidamente com novos filtros

    return query.paginate(page, perPage)
  }
}
```

O controller segue fino — apenas valida e repassa os query params ao service:

```typescript
async index({ request }: HttpContext) {
  const users = await new ListUsersService().execute(request.qs())
  return serialize(UserTransformer.transformCollection(users))
}
```

O problema não está no controller, mas no service: cada novo parâmetro de query exige uma nova ramificação condicional, a lógica de filtragem não tem um lugar testável de forma unitária por filtro, e a responsabilidade do service mistura regras de negócio com mapeamento de parâmetros HTTP.

A questão central é: **como encapsular a lógica de filtragem de query params de forma isolada, testável e extensível, sem acumular condicionais no service a cada novo parâmetro?**

## Decisão

Adotaremos o pacote **`@dirupt/adonis-lucid-filter`** para encapsular lógica de
filtragem de queries em classes dedicadas. Filter classes são criadas para models
expostos via endpoint de listagem (`index`) que aceitam query params de filtragem;
models internos, sem superfície de API pública (ex.: `AuthenticationAudit`,
tabelas de junção), não requerem filter class. Quando aplicável, um model possui
ao menos uma filter class associada via `$filter`; models cujos perfis de acesso
exigem perspectivas de filtragem conceitualmente distintas podem ter múltiplas
filter classes (ver seção "Quando usar blacklist vs. filter separado").

O `adonis-lucid-filter` é uma portabilização do padrão popularizado pelo pacote PHP `eloquent-filter` para o ecossistema AdonisJS. O pacote em uso é um fork mantido pela `dirupt-agency`, com suporte ao AdonisJS v7 e Lucid v21+, baseado no original de `lookinlab`. É o fork com PR aberto no registro oficial `adonis-packages` para substituir a entrada do original, e foi explicitamente referenciado pelo maintainer do repositório original como o fork canônico para v7.

O `filter()` é um método estático adicionado ao model pelo mixin `Filterable`. Para que o método exista, o model precisa de duas coisas: compor o mixin e declarar qual classe de filtro padrão usar:

```typescript
// app/models/user.ts
export default class User extends compose(UserSchema, WithPrimaryUuid, WithTimestamps, Filterable) {
  static $filter = () => UserFilter // associa a classe de filtro padrão ao model
}
```

Internamente, `User.filter(input)` itera sobre cada chave do input, normaliza para camelCase, verifica se existe um método de mesmo nome na `UserFilter` (e se não está na blacklist) e chama o método correspondente. Chaves sem método associado são **ignoradas silenciosamente** — `page`, `per_page` ou qualquer campo desconhecido passam sem efeito.

Cada filter class herda de `BaseModelFilter` e expõe métodos públicos cujo nome corresponde exatamente ao nome do query parameter recebido:

```typescript
// app/models/filters/user/user_filter.ts

/**
 * Filtros de query para o model User.
 * Cada método público mapeia implicitamente para o query param de mesmo nome:
 * `fullName(value)` é chamado quando `?full_name=value` está presente na URL.
 */
export default class UserFilter extends BaseModelFilter {
  declare $query: ModelQueryBuilderContract<typeof User>

  name(value: string): void {
    this.$query.where('name', 'like', `%${value}%`)
  }

  status(value: UserStatus): void {
    this.$query.where('status', value)
  }

  role(value: UserRole): void {
    this.$query.where('role', value)
  }
}
```

O controller valida os query params com VineJS antes de repassar ao service. A validação coerce tipos — `vine.boolean()` transforma `'true'`/`'false'` em `boolean`, `vine.enum()` garante valores permitidos — de modo que o filter recebe tipos corretos, não strings cruas:

```typescript
// app/validators/list_users_validator.ts
export const listUsersValidator = vine.compile(
  vine.object({
    name: vine.string().optional(),
    status: vine.enum(UserStatus).optional(),
    role: vine.enum(UserRole).optional(),
  })
)
```

```typescript
// app/controllers/users_controller.ts
async index({ request }: HttpContext) {
  const filters = await request.validateUsing(listUsersValidator)
  const users = await new ListUsersService().execute(filters)
  return serialize(UserTransformer.transformCollection(users))
}
```

```typescript
// app/services/list_users_service.ts
export default class ListUsersService {
  async execute(filters: Infer<typeof listUsersValidator>) {
    return User.filter(filters).paginate(page, perPage)
  }
}
```

Filters vivem em `app/models/filters/<domínio>/`, organizados em subpastas por domínio (ex.: `user/`, `transaction/`). O gerador suporta a criação direta com path: `node ace make:filter user/user`. A convenção de mapeamento implícito (nome do método = nome do query param) deve ser documentada com JSDoc de nível de classe, conforme ADR-0024.

### Uso complementar com scopes do Lucid

Filters e scopes são complementares, não alternativos. A distinção de responsabilidade é:

- **Filter**: mapeia um query parameter HTTP para uma condição de query. É o ponto de entrada da filtragem da API — existe porque o cliente passou um parâmetro.
- **Scope**: encapsula lógica de query reutilizável interna ao domínio. É consumido por services, outros scopes ou pelo próprio filter — existe porque a regra de negócio é recorrente.

Um filter pode e deve delegar para um scope quando a condição é reutilizável. Lucid expõe scopes como métodos tipados diretamente no query builder — `this.$query.active()` e `this.$query.apply(scopes => scopes.active())` são equivalentes:

```typescript
// app/models/filters/user/user_filter.ts
export default class UserFilter extends BaseModelFilter {
  declare $query: ModelQueryBuilderContract<typeof User>

  status(value: UserStatus): void {
    this.$query.where('status', value)
  }

  // Scopes são métodos tipados no query builder — chamada direta é equivalente a .apply()
  // Múltiplos scopes no mesmo método: cada chamada acumula AND no mesmo builder
  // Não há conflito — o filter é o único produtor de condições naquele momento
  role(value: UserRole): void {
    this.$query.forRole(value).withVerifiedEmail()
  }
}
```

```typescript
// app/models/user.ts — scopes reutilizáveis por services, listeners e outros filters
export default class User extends compose(UserSchema, WithPrimaryUuid, WithTimestamps, Filterable) {
  static $filter = () => UserFilter

  static scopeActive(query: ModelQueryBuilderContract<typeof User>) {
    query.where((q) => {
      q.where('status', 'active').whereNotNull('emailVerifiedAt')
    })
  }

  static scopeForRole(query: ModelQueryBuilderContract<typeof User>, role: UserRole) {
    query.where('role', role)
  }

  static scopeWithVerifiedEmail(query: ModelQueryBuilderContract<typeof User>) {
    query.whereNotNull('emailVerifiedAt')
  }
}
```

**Chamada direta vs `.apply()` com callback:**

Funcionalmente idênticos para um scope. A distinção é de contexto de uso:

```typescript
// No filter — chamada direta é mais concisa: você já está num método por parâmetro
role(value: UserRole): void {
  this.$query.forRole(value).withVerifiedEmail()
}

// No service — .apply() é idiomático para compor scopes condicionalmente
// ❌ nunca em controller — DB queries pertencem ao service
export default class ListUsersService {
  async execute(filters: Record<string, string>) {
    return User.query().apply(scopes => {
      if (condition) scopes.active()
      if (role) scopes.forRole(role)
    }).paginate(page, perPage)
  }
}
```

> **Regra:** `filter()` e composição de scopes via `.apply()` são exclusivos do **service layer**. Controllers passam parâmetros e `auth.user` — nunca montam queries diretamente.

O risco de vazamento com `orWhere` **não é uma propriedade de `.apply()`** — é responsabilidade do autor do scope. Um scope com `orWhere` sem callback vaza para a chain externa independente de como é chamado. A proteção está no scope, não no ponto de chamada.

O mixin `Filterable` também registra automaticamente um scope `filtration` no model. Isso permite combinar o filter com outros scopes via `.apply()` no service ou em preloads:

```typescript
// equivalente a User.filter(input), mas composável com outros scopes
User.query().apply((scopes) => {
  scopes.active() // scope estático do model
  scopes.filtration(input) // delegado ao UserFilter
})
```

### Controle de acesso por campo com blacklist

Por padrão, qualquer método público da filter class é invocável pelo despachador automático — basta que o input contenha a chave correspondente. Isso representa uma superfície de exposição: métodos de lógica interna ou filtros restritos a perfis específicos podem ser acionados por qualquer cliente que conheça o nome do parâmetro.

O mecanismo de proteção é `static blacklist`: métodos listados nele são ignorados pelo despachador, independente do input recebido. Para liberá-los condicionalmente, usa-se `setup()` com `whitelistMethod()`.

`setup()` é o único método da filter class que **sempre executa**, antes do despachador de input. É o ponto de controle da classe — adequado tanto para condições base que sempre se aplicam quanto para lógica condicional de liberação de campos.

```typescript
// app/models/filters/transaction/transaction_filter.ts

/**
 * Filtros de query para um model Transaction.
 * `minAmount(value)` é chamado quando `?min_amount=value` está presente na URL,
 * mas só é despachado para usuários com `_role === 'finance_manager'` (ver setup()).
 */
export default class TransactionFilter extends BaseModelFilter {
  declare $query: ModelQueryBuilderContract<typeof Transaction>

  // minAmount desligado por padrão — usuário comum não pode filtrar por valor
  static blacklist: string[] = ['minAmount']

  setup() {
    // Condição base: sempre aplica, independente do input
    this.$query.whereNull('deletedAt')

    // Contexto confiável injetado pelo service antes de chamar o filter.
    // O prefixo _ sinaliza que veio do auth.user, não da query string.
    if (this.$input._role === 'finance_manager') {
      this.whitelistMethod('minAmount')
    }
  }

  status(value: TransactionStatus): void {
    this.$query.where('status', value)
  }

  // Nunca invocado por input externo, a menos que liberado pelo setup()
  minAmount(value: number): void {
    this.$query.where('amount', '>=', value)
  }
}
```

O contexto confiável é injetado no **service**, não no controller. O controller valida os query params e passa o payload tipado junto com `auth.user` — o service enriquece com o contexto de auth antes de chamar o filter:

```typescript
// app/validators/list_transactions_validator.ts
export const listTransactionsValidator = vine.compile(
  vine.object({
    with_cancelled: vine.boolean().optional(),
    status: vine.enum(TransactionStatus).optional(),
  })
)
```

```typescript
// app/controllers/transactions_controller.ts
async index({ request, auth }: HttpContext) {
  const filters = await request.validateUsing(listTransactionsValidator)
  return new ListTransactionsService().execute(filters, auth.user)
}
```

```typescript
// app/utils/with_auth_context.ts
export function withAuthContext(
  filters: Record<string, unknown>,
  user: { role: UserRole }
): Record<string, unknown> {
  return { ...filters, _role: user.role }
}
```

```typescript
// app/services/list_transactions_service.ts
import { withAuthContext } from '#utils/with_auth_context'

export default class ListTransactionsService {
  async execute(filters: Infer<typeof listTransactionsValidator>, user: User) {
    return Transaction.filter(withAuthContext(filters, user)).paginate(page, perPage)
  }
}
```

Usar `_role` com o valor do enum (e não flags booleanas como `_isAdmin`) garante que adicionar novas roles não exige novos campos no input — apenas um novo `if` no `setup()` do filter. O helper `withAuthContext` (`app/utils/with_auth_context.ts`) centraliza o enriquecimento — múltiplos services importam a mesma função sem repetição.

**Relação com Bouncer e Policies:**

O blacklist do filter e o Bouncer são instrumentos de granularidade diferente e atuam em camadas sequenciais — não são alternativas:

| Camada                          | Ferramenta              | Pergunta que responde                        |
| ------------------------------- | ----------------------- | -------------------------------------------- |
| Autenticação                    | `middleware.auth()`     | Quem é você?                                 |
| Autorização de endpoint         | Bouncer / Policy        | Você pode acessar este recurso?              |
| Visibilidade de campo de filter | `blacklist` + `setup()` | Quais filtros você pode usar neste endpoint? |

Bouncer decide se o usuário pode **executar a ação**. O `setup()` do filter decide quais **campos de filtragem** estão disponíveis para ele dentro dessa ação. Um não substitui o outro: usar Bouncer para controlar campos de filter seria complexidade desnecessária; usar filter blacklist para controlar acesso ao endpoint ignoraria que o Bouncer resolve isso com uma linha e testes de policy isolados.

**Quando usar blacklist vs. filter separado:**

| Cenário                                                          | Abordagem                                    |
| ---------------------------------------------------------------- | -------------------------------------------- |
| Mesmo filtro base, alguns campos restritos por perfil            | `blacklist` + `whitelistMethod` em `setup()` |
| Perspectivas de filtragem conceitualmente distintas entre perfis | Classes separadas por perfil                 |
| `setup()` com mais de um bloco `if/else` por papel               | Sinal para criar classes separadas           |

#### Múltiplas filter classes por model

O `$filter` registra a classe de filtro **padrão** do model — a usada quando nenhuma alternativa é especificada. Mas o pacote suporta nativamente sobrescrever essa classe por chamada, via segundo argumento de `.filter()` e segundo argumento do scope `filtration`:

```typescript
// assinatura de .filter() — segundo parâmetro sobrescreve $filter
static filter(input: InputObject, filter?: LucidFilterContract): ModelQueryBuilderContract

// assinatura do scope filtration — segundo parâmetro sobrescreve $filter
static filtration(input: InputObject, filter?: LucidFilterContract): void
```

Isso significa que o model não precisa "conhecer" todas as suas filter classes — `$filter` aponta para a classe padrão (geralmente a perspectiva mais comum ou permissiva), e classes alternativas são passadas explicitamente no ponto de chamada.

**Convenção de nomenclatura e localização:**

Todas as filter classes de um model — a padrão e as alternativas — vivem na mesma subpasta de domínio. Classes alternativas seguem o padrão `<perfil>_<model>_filter.ts`:

```
app/models/filters/
  transaction/
    transaction_filter.ts            ← padrão ($filter), perspectiva geral
    finance_transaction_filter.ts    ← perspectiva do gestor financeiro
    admin_transaction_filter.ts      ← perspectiva administrativa
  user/
    user_filter.ts                   ← padrão ($filter), única variante
```

O gerador suporta a criação com path de domínio diretamente:

```bash
node ace make:filter transaction/transaction                # classe padrão
node ace make:filter transaction/finance_transaction        # variante por perfil
```

O model registra apenas a classe padrão:

```typescript
// app/models/transaction.ts
export default class Transaction extends compose(
  TransactionSchema,
  WithPrimaryUuid,
  WithTimestamps,
  Filterable
) {
  static $filter = () => TransactionFilter // classe padrão
}
```

**Seleção da classe no service:**

A decisão de qual filter class usar pertence ao **service** — é ele que detém o contexto de autenticação. O controller permanece fino: valida, extrai `auth.user`, e delega:

```typescript
// app/services/list_transactions_service.ts
import TransactionFilter from '#models/filters/transaction/transaction_filter'
import FinanceTransactionFilter from '#models/filters/transaction/finance_transaction_filter'

export default class ListTransactionsService {
  async execute(filters: Infer<typeof listTransactionsValidator>, user: User) {
    const FilterClass =
      user.role === UserRole.FINANCE_MANAGER ? FinanceTransactionFilter : TransactionFilter

    return Transaction.filter(filters, FilterClass).paginate(page, perPage)
  }
}
```

Quando compondo com outros scopes via `.apply()`, a classe alternativa é passada como terceiro argumento do scope `filtration`:

```typescript
// composição com scopes — classe alternativa via filtration
Transaction.query().apply((scopes) => {
  scopes.active()
  scopes.filtration(filters, FinanceTransactionFilter)
})
```

**Quando não usar classes separadas:**

Se a diferença entre perfis é apenas "mais campos" — o mesmo conjunto base com alguns campos adicionais por perfil — `blacklist` + `whitelistMethod` em `setup()` continua sendo a abordagem correta. Classes separadas se justificam quando as perspectivas são conceitualmente distintas: métodos diferentes, condições base diferentes, lógica de composição diferente. A regra prática é: se a classe alternativa duplicaria mais de 60% dos métodos da classe padrão, `blacklist` é mais econômico.

## Justificativa

- **Isolamento de responsabilidade:** lógica de filtragem sai do service para uma classe com responsabilidade única e testável de forma independente.
- **Convenção explícita:** o mapeamento método→param é determinístico e consistente em todos os models — não há lógica condicional espalhada no service.
- **Extensibilidade sem efeito colateral:** adicionar um novo filtro significa adicionar um método à filter class, sem tocar no service.
- **Integração nativa com Lucid:** o filter recebe o query builder do Lucid diretamente (`$query`), sem camadas de abstração extras — qualquer método do query builder está disponível.

## Alternativas Consideradas

**1. Filtragem condicional no service ou via `.if()` inline**

A filtragem condicional imperativa no service — descrita no contexto — acumula condicionais que crescem a cada novo parâmetro, mistura mapeamento HTTP com lógica de domínio e não é testável por filtro individual.

O `.if()` do Lucid é uma variante fluente do mesmo padrão — mantém a chain sem variável intermediária — mas não resolve os problemas de escala e reuso:

```typescript
// válido para 1–3 campos localizados, sem reuso previsto
User.query()
  .if(name, (q) => q.whereILike('name', `%${name}%`))
  .if(status, (q) => q.where('status', status))
  .paginate(page, perPage)
```

O limiar de decisão: quando o mesmo conjunto de filtros aparece em mais de um endpoint (ex.: listagem paginada + exportação CSV), ou quando os campos passam de 3–4, a duplicação da chain de `.if()` sinaliza que uma filter class é o lugar correto. Para casos simples e localizados sem reuso previsto, `.if()` é legítimo. Descartado como padrão geral de filtragem de API.

**2. Scopes de query como substituto dos filters**

Lucid suporta `static scopeXxx(query, value)` diretamente no model. Scopes não substituem filters: não há mapeamento automático de query params para scopes — o service ainda precisaria de lógica condicional para chamar o scope correto para cada parâmetro recebido. Descartado como padrão de filtragem de API; scopes são adotados como complemento (ver seção "Uso complementar com scopes do Lucid" acima).

**3. Filtragem condicional no controller**

Delegar a filtragem diretamente ao controller viola ADR-0025 (controller deve ser fino e sem lógica de negócio ou queries diretas). Descartada.

## Consequências (Trade-offs)

### Positivas / Benefícios

- Services de listagem permanecem limpos — uma linha substitui o bloco de condicionais
- Filtros são testáveis unitariamente por método, sem HTTP e sem instanciar o service
- Adicionar ou remover filtros não altera o service nem o controller
- A convenção é predizível: qualquer query param tem um método correspondente na filter class

### Negativas / Riscos

- **Convenção implícita não-óbvia:** o mapeamento método→param não é imediato para contribuidores que não conhecem o pacote — exige JSDoc de nível de classe (ADR-0024)
- **Pacote de comunidade com fork:** `@dirupt/adonis-lucid-filter` é um fork, não um pacote oficial do AdonisJS; se abandonado, o projeto precisará manter um fork próprio ou migrar para outra abordagem
- **Sem validação de parâmetros:** o filter não valida os valores recebidos — parâmetros inválidos produzem erros de query em vez de respostas 422; a validação dos query params deve ser feita no validator antes de passar ao filter

- **Gotcha em preloads:** ao aplicar filter dentro de `.preload()`, não passe `request.qs()` diretamente — filtros do model pai podem vazar semanticamente para o relacionamento; passe apenas as chaves relevantes para aquele relacionamento:

  ```typescript
  // ❌ vaza todo o qs() para o relacionamento
  .preload('posts', q => q.filter(request.qs()))

  // ✅ passa só o que pertence ao Post
  .preload('posts', q => {
    const { postStatus, postCategory } = request.qs()
    q.filter({ status: postStatus, category: postCategory })
  })
  ```

## Referências

- [`@dirupt/adonis-lucid-filter` (npm)](https://www.npmjs.com/package/@dirupt/adonis-lucid-filter): pacote em uso — fork canônico para AdonisJS v7, com PR aberto no registro oficial adonis-packages
- [`dirupt-agency/adonis-lucid-filter` (GitHub)](https://github.com/dirupt-agency/adonis-lucid-filter): repositório do fork em uso — inclui guia de migração a partir do original
- [adonis-lucid-filter (original, lookinlab)](https://github.com/lookinlab/adonis-lucid-filter): repositório original do padrão portado para AdonisJS; sem suporte ao v7, motivo da adoção do fork
- [lucid-filter no AdonisJS Packages](https://packages.adonisjs.com/packages/lucid-filter): documentação complementar alinhada com o uso atual da ferramenta — os comandos `ace` não têm suporte ao AdonisJS v7
- [eloquent-filter (PHP)](https://github.com/Tucker-Eric/EloquentFilter): inspiração original do padrão de filter class no ecossistema Eloquent/Laravel
- [ADR-0001](./0001-adocao-do-adonisjs-como-framework-backend.md): adoção do AdonisJS e Lucid ORM, sobre os quais o filter opera
- [ADR-0024](./0024-convencao-de-documentacao-de-codigo-com-jsdoc.md): exige JSDoc de nível de classe nos filters para documentar a convenção implícita de mapeamento
- [ADR-0025](./0025-convencoes-de-controllers-e-roteamento-rest.md): convenção de controller fino que motivou isolar a lógica de filtragem em classe dedicada

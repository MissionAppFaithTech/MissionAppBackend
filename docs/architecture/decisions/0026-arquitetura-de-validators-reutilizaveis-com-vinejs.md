# [ADR-0026]: Arquitetura de Validators Reutilizáveis com VineJS

## Dados

- **Status:** 🔵 Em Uso
- **Data:** 2026-06-19
- **Proponentes:** [Allber Ferreira](https://github.com/AFSFerreira)

---

## Contexto e Problema

À medida que o número de endpoints cresce, validadores escritos de forma isolada tendem a duplicar regras de campo — o formato de e-mail, os limites de senha, o padrão de UUID — em cada arquivo de forma inconsistente. Uma mudança no requisito (ex.: aumentar o limite de senha de 32 para 64 caracteres) exigiria editar todos os arquivos onde a regra foi repetida, com risco de discrepâncias silenciosas entre endpoints.

O VineJS não permite compor schemas como valores reutilizáveis diretamente: schemas VineJS são **mutáveis** e compartilhar uma instância entre múltiplos `vine.create()` causa comportamentos inesperados quando modificadores como `.optional()`, `.nullable()` ou regras extras são encadeados sobre a instância compartilhada.

A questão central é: **como estruturar os validators do projeto de forma que regras de campo sejam definidas uma única vez e reutilizadas de maneira segura, mantendo separação por domínio e um arquivo por endpoint?**

## Decisão

Adotaremos uma hierarquia de três camadas adaptada às restrições de mutabilidade do VineJS:

### Camada 1 — Fields (`app/validators/shared/fields/`)

Um arquivo por campo atômico. Cada arquivo exporta uma **factory** — uma função que retorna uma nova instância do schema a cada chamada. Isso contorna a mutabilidade do VineJS: cada `vine.create()` que importa um field recebe sua própria instância independente.

```
app/validators/shared/fields/
├── email.ts       # export const email = () => vine.string().email().maxLength(254)
├── password.ts    # export const password = () => vine.string().minLength(8).maxLength(32)
├── id.ts        # export const id = () => vine.string().uuid()
├── page.ts        # export const page = () => vine.number().positive()...
└── per_page.ts    # export const perPage = () => vine.number()...max(100)...
```

### Camada 2 — Schemas (`app/validators/shared/schemas/`)

Um arquivo por schema de objeto reutilizável. Também factories, compostas a partir dos fields da camada anterior. Usadas via `vine.object().merge(...)` para injetar campos transversais (como paginação) sem repetição.

```
app/validators/shared/schemas/
└── pagination.ts  # export const paginationSchema = () => vine.object({ page: page(), perPage: perPage() })
```

### Camada 3 — Validators (`app/validators/<domain>/`)

Um arquivo por handler HTTP, agrupado por domínio de entidade. Cada arquivo importa factories das camadas anteriores e exporta os validators compilados com `vine.create()`.

> **Regra:** validators de domínio **não importam `vine` diretamente para definir campos**. Todo campo deve vir de uma factory em `shared/fields/` ou de um schema em `shared/schemas/`. O `vine` só é importado para chamar `vine.create()`. Isso garante que qualquer regra de campo tenha exatamente uma definição canônica — e que futuras mudanças propaguem automaticamente para todos os endpoints.

"Um arquivo por handler" significa um arquivo por **request completa** — não um arquivo por schema. Um endpoint que valida params, body e query string exporta múltiplos validators do mesmo arquivo:

```typescript
// app/validators/user/update.ts
import { id } from '#validators/shared/fields/id'
import { password } from '#validators/shared/fields/password'

export const updateParamsValidator = vine.create({ id: id() })
export const updateBodyValidator = vine.create({
  fullName: vine.string().optional(),
  password: password().optional(),
})
```

O controller importa tudo de um único lugar:

```typescript
import { updateParamsValidator, updateBodyValidator } from '#validators/user/update'
```

A duplicação de campos como `id` entre endpoints (show, update, destroy) é resolvida pela factory `id()` em `shared/fields/` — cada arquivo de endpoint chama a factory individualmente, sem compartilhar instâncias.

```
app/validators/
└── user/
    ├── signup.ts   # signupValidator
    ├── login.ts    # loginValidator
    └── update.ts   # updateParamsValidator + updateBodyValidator
```

### Convenção de nomenclatura

O sufixo segue a camada, não o estado de compilação:

| Camada                 | Sufixo      | Critério                                                                                                                                      |
| ---------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `shared/fields/`       | nenhum      | Campos atômicos — o retorno (`vine.string()`, `vine.number()`) é inequívoco                                                                   |
| `shared/schemas/`      | `Schema`    | `vine.object()` não compilado — sem sufixo, `pagination()` seria indistinguível de um helper de query ou utilitário de paginação, por exemplo |
| `validators/<domain>/` | `Validator` | Compilado, pronto para `request.validateUsing()` — disambigua de actions do controller com o mesmo nome, por exemplo                          |

```ts
// Camada 1 — sem sufixo
export const email    = () => vine.string().email().maxLength(254)
export const page     = () => vine.number().positive().withoutDecimals().optional()

// Camada 2 — sufixo Schema
export const paginationSchema = () => vine.object({ page: page(), perPage: perPage() })
//                                                   ↑ fields sem sufixo — correto

// Camada 3 — sufixo Validator
export const signupValidator = vine.create({ ... })
```

O `paginationSchema` consome `page()` e `perPage()` sem sufixo — o critério não é compilação, é ambiguidade do nome no ponto de uso. `page()` dentro de um `vine.object()` não tem como ser confundido; `pagination()` como export de módulo poderia ser qualquer coisa.

### Estrutura de aliases

O alias `"#validators/*"` no `package.json` resolve caminhos de múltiplos níveis de pasta pelo padrão de subpath imports do Node.js, onde `*` é um wildcard greedy que inclui separadores de diretório.

```json
"#validators/*": "./app/validators/*.js",
"#validators/**/*": "./app/validators/*/*.js"
```

## Justificativa

- **Factories, não valores:** Schemas VineJS são objetos com estado. Uma factory `() => vine.string()...` garante que cada chamada retorna uma instância nova, eliminando efeitos colaterais entre validators que encadeiam modificadores diferentes sobre o mesmo campo.

- **Um arquivo por field/schema:** Segue o mesmo princípio de responsabilidade única aplicado ao restante do projeto. Renomear, restringir ou expandir uma regra de campo exige editar um único arquivo. O `git blame` no arquivo do field revela o histórico completo da regra.

- **Um arquivo por handler (não por schema):** Todo o contrato de validação de um request — params, body, query — vive no mesmo arquivo. Quem lê o controller sabe que um único import cobre tudo que o endpoint valida. Fragmentar params, body e query em arquivos distintos separaria o que é conceitualmente uma coisa só, forçando quem mantém o endpoint a rastrear três arquivos para entender um único handler.

- **Separação por domínio:** Validators agrupados por entidade (`user/`, `post/`, `transaction/`) crescem junto com as features do domínio. Adicionar um novo endpoint de usuário significa adicionar um arquivo em `user/`, não modificar um arquivo monolítico.

- **`vine.create()` como API padrão:** O método `vine.compile()` foi marcado como deprecated no VineJS v4. O projeto usa `vine.create()`, que é a API idiomática atual.

- **Nomenclatura por camada, não por estado:** O sufixo `Schema` marca objetos compostos (`vine.object()`) cuja identidade pelo nome seria ambígua — `pagination()` poderia ser um helper, `paginationSchema()` não pode. Campos atômicos dispensam sufixo porque o retorno (`vine.string()`) elimina qualquer ambiguidade. O sufixo `Validator` no resultado compilado evita colisão com actions do controller (`signup` vs `signupValidator`).

## Alternativas Consideradas

- **Um arquivo de validators por domínio (`user.ts` com todos os validators de usuário):** Mais simples no curto prazo, mas acumula validators não relacionados no mesmo arquivo à medida que o domínio cresce. Um arquivo com `signupValidator`, `updateProfileValidator`, `changePasswordValidator`, `adminUpdateUserValidator` mistura responsabilidades distintas.

- **Validators inline nos controllers:** Elimina a necessidade de arquivos separados de validator, mas acopla a lógica de validação ao controller (violando ADR-0023) e impede o reaproveitamento de schemas entre endpoints.

- **Valores exportados em vez de factories:** `export const emailSchema = vine.string().email()` funcionaria para uso em um único validator, mas falha silenciosamente quando dois validators aplicam modificadores diferentes sobre a mesma instância (ex.: um chama `.optional()`, o outro não).

## Consequências (Trade-offs)

### Positivas / Benefícios

- **Regra de campo definida uma vez:** Alterar o limite de `maxLength` do e-mail propaga automaticamente para todos os validators que importam `email()`.
- **Consistência garantida entre endpoints:** Signup e login usam a mesma definição de e-mail — não há divergência silenciosa.
- **Navegação previsível:** `app/validators/user/signup.ts` para o validator de signup, `app/validators/shared/fields/email.ts` para a regra de e-mail.

### Negativas / Riscos

- **Mais arquivos para operações simples:** Criar um novo endpoint exige pelo menos um arquivo de validator novo. Para projetos muito pequenos, pode parecer overhead.
- **Profundidade de diretório aumenta:** Três camadas de pasta podem ser navegadas com menos cliques no filesystem, mas a estrutura é previsível e estável.

## Referências

- [Documentação VineJS](https://vinejs.dev/docs/introduction): referência do sistema de validação adotado
- [ADR-0001](./0001-adocao-do-adonisjs-como-framework-backend.md): AdonisJS como framework, que inclui VineJS como validator padrão
- [ADR-0023](./0023-convencoes-de-controllers-e-roteamento-rest.md): controllers sempre delegam validação a validators — nunca inline

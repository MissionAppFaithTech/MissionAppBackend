# Copilot Instructions

Custom instructions for GitHub Copilot in this repository.

---

## Project

MissionApp Backend is an open-source REST API built with **AdonisJS v7 + TypeScript** connecting missionaries and supporters. Maintained by [FaithTech](https://faithtech.com/). Three user roles: `ADMIN`, `MISSIONARY`, `SUPPORTER`.

- **Runtime:** Node.js 24.x
- **Package manager:** pnpm 11.x (enforced via Corepack — never suggest `npm` or `yarn`)
- **Language:** TypeScript (strict mode); no `any`, no `as unknown as X` escape hatches

---

## Architecture

### Request pipeline

```
HTTP Request
  → server middleware (force_json_response, container_bindings, cors)
  → router middleware (bodyparser, session, shield, auth init, silent_auth)
  → Controller  — validate input (VineJS), call Service, return serialize()
  → Service     — business logic, DB transaction, emit domain event
  → Listener    — receive event, enqueue BullMQ Job only (< 1ms, no logic)
  → BullMQ Queue (persisted in DragonflyDB)
  → Worker      — Ace command with loadApp:true, executes heavy async work
```

### Directory map

```
app/
  controllers/    thin HTTP handlers — validate, delegate, serialize
  services/       business logic and relational transactions
  listeners/      event routers — emit → enqueue job, nothing else
  jobs/           BullMQ job definitions
  models/         Lucid ORM models (extend generated schema + mixins)
  models/mixins/  WithPrimaryUuid, WithTimestamps
  transformers/   shape API response data
  validators/     VineJS schemas for all input boundaries
  middleware/     HTTP middleware
  enums/          TypeScript enums by domain subdirectory
  exceptions/     global error handler
commands/         BullMQ worker entry points (Ace CLI commands)
database/
  migrations/     source of truth for schema — edit here, never in schema.ts
  schema.ts       AUTO-GENERATED — never edit manually
start/
  routes.ts       all route definitions
  kernel.ts       middleware registration
  env.ts          validated environment variable schema
config/           AdonisJS package configuration files
providers/
  api_provider.ts adds ctx.serialize() to HttpContext
```

---

## Code Patterns

Follow these patterns precisely in all suggestions and completions.

### Controller — always thin

```typescript
export default class PostController {
  async store({ request, serialize }: HttpContext) {
    const payload = await request.validateUsing(createPostValidator)
    const post = await new CreatePostService().execute(payload)
    return serialize(PostTransformer.transform(post))
  }
}
```

- Destructure `serialize` from `HttpContext` — always use it for responses, never `response.json()`
- Validate via `request.validateUsing(validator)` — never inline validation
- No business logic, no direct DB queries, no side effects

### Service — owns the transaction

```typescript
export default class CreatePostService {
  async execute(payload: CreatePostPayload) {
    const post = await db.transaction(async (trx) => {
      return Post.create({ ...payload }, { client: trx })
    })
    await emitter.emit('post:created', { postId: post.id })
    return post
  }
}
```

- Owns the DB transaction
- Emits domain events **after committing** — never inside the transaction
- Never calls Elasticsearch, sends email, or triggers external side effects directly — those go through the event pipeline

### Listener — router only, under 1ms

```typescript
export default class OnPostCreated {
  async handle({ postId }: PostCreatedPayload) {
    await indexPostQueue.add('index-post', { postId })
  }
}
```

- Single responsibility: serialize payload → enqueue Job
- No HTTP calls, no DB queries, no business logic

### Worker — Ace command

```typescript
export default class IndexPostWorker extends BaseCommand {
  static commandName = 'worker:index-post'
  static options = { loadApp: true }

  async run() {
    new Worker(
      'index-post',
      async (job) => {
        const post = await Post.findOrFail(job.data.postId)
        // heavy async work here
      },
      { connection }
    )
    await new Promise(() => {}) // keep process alive
  }
}
```

- `loadApp: true` is mandatory — provides Lucid, Env, DI without an HTTP server
- Job payload carries **IDs only** — worker always fetches fresh data from the DB at runtime
- Lives in `commands/`

### Model — never declare `@column`

```typescript
export default class Post extends compose(
  PostSchema, // AUTO-GENERATED — columns and types
  WithPrimaryUuid, // UUID v7 PK, auto-set on beforeCreate
  WithTimestamps // createdAt / updatedAt
) {}
```

- Column definitions live in the auto-generated `PostSchema` — never add `@column` to the model class
- Add relationships, scopes, and custom methods only

### Transformer — allow-list fields

```typescript
export default class PostTransformer extends BaseTransformer<Post> {
  toObject() {
    return this.pick(this.resource, ['id', 'content', 'createdAt'])
  }
}
```

- Use `this.pick()` to allow-list fields — never serialize a model directly in a controller

### Validator — VineJS, always in `app/validators/`

```typescript
export const createPostValidator = vine.create({
  content: vine.string().minLength(1).maxLength(5000),
  highlightLink: vine.string().url().optional(),
})
```

---

## Routing

Use the Tuyau-generated barrel `#generated/controllers` — never import controller classes directly:

```typescript
// ✅ correct
import { controllers } from '#generated/controllers'
router.post('posts', [controllers.Post, 'store'])

// ❌ wrong — never do this
import PostController from '#controllers/post_controller'
router.post('posts', [PostController, 'store'])
```

All routes are prefixed `/api/v1` and grouped in `start/routes.ts`.

---

## Environment Variables

Always access via the `env` service — never `process.env`:

```typescript
import env from '#start/env'
const port = env.get('PORT')
```

New variables must be declared and validated in `start/env.ts` before being used anywhere else.

---

## Database

- **`database/schema.ts` is auto-generated** — never suggest edits to it; run `node ace migration:run` to regenerate
- All primary keys are UUID v7 strings via `WithPrimaryUuid`
- Timestamps use Luxon `DateTime`, not native `Date`
- Soft deletes use a `deletedAt` column (`DateTime | null`) — no plugin

### Migration column order

Inside every `createTable`, always follow this declaration order:

```
1. table.comment(...)   table-level description
2. id                   UUID v7 primary key
3. data columns         grouped by semantic domain, blank line between groups
4. FK uuid columns      with // FK: <ACTION> — <reason> comment above each
5. .foreign()           in the same order as FK column declarations
6. .unique()
7. .check()
8. .index()
```

Every column and every table must have a `.comment('...')` — no exceptions.

---

## Testing

- `tests/unit/` — pure logic (Services, Validators, utilities); no HTTP, no real DB
- `tests/functional/` — full HTTP stack; hits a real test database (`.env.test`)
- Test framework: **Japa** — never suggest Jest or Vitest imports
- Single file: `node ace test --files=tests/path/foo.spec.ts`

---

## Prohibited Patterns

Never suggest any of the following:

| Pattern                                              | Why                                                                  |
| ---------------------------------------------------- | -------------------------------------------------------------------- |
| `npm install` / `yarn add`                           | pnpm-only repo                                                       |
| `process.env.VAR`                                    | Use `env.get('VAR')` from `#start/env`                               |
| Edit `database/schema.ts`                            | Auto-generated, will be overwritten                                  |
| `@column` on a Model class                           | Columns come from the generated Schema mixin                         |
| Business logic or DB queries in a Listener           | Latency must stay < 1ms                                              |
| Side effects in Lucid hooks (`@afterCreate`, etc.)   | Breaks transaction isolation                                         |
| Direct Elasticsearch/SMTP/storage calls in a Service | Must go through the event pipeline                                   |
| A separate `Dockerfile` per worker                   | Breaks layer cache reuse; use single image with multiple entrypoints |
| Standalone `.ts`/`.js` worker scripts                | Workers must be Ace commands                                         |
| Hard-coding `any` type                               | Use proper TypeScript types or generics                              |
| Secrets or real tokens in `bruno/` files             | Collection is public; use `{{variavel}}` backed by `.env`            |

---

## Commit Messages

All commit messages must be in **Brazilian Portuguese (PT-BR)**, following Conventional Commits:

```
feat(missionaries): adicionar endpoint de listagem paginada
fix(auth): corrigir expiração de token JWT
chore(deps): atualizar adonisjs para v7.3.0
```

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `build`, `ci`, `revert`.
Use imperative present tense (`adicionar`, `corrigir`, `remover`). Scope in lowercase.

---

## Architectural Decisions

Before suggesting a new external dependency, service, or architectural pattern, check `docs/architecture/decisions/`. Every framework-level or infrastructure dependency requires a documented ADR.

| Area                     | ADR                                           |
| ------------------------ | --------------------------------------------- |
| Framework                | ADR-0001 (AdonisJS)                           |
| Database                 | ADR-0002 (PostgreSQL)                         |
| Cache / queue broker     | ADR-0003 (DragonflyDB)                        |
| Object storage           | ADR-0004 (MinIO)                              |
| Full-text search         | ADR-0005 (Elasticsearch)                      |
| Containerization         | ADR-0006 (Docker)                             |
| Package manager          | ADR-0007 (pnpm)                               |
| Async operations         | ADR-0008 (EDA + BullMQ)                       |
| Email                    | ADR-0010 (Resend)                             |
| Dependency updates       | ADR-0011 (Renovate)                           |
| Vulnerability scanning   | ADR-0012 (Snyk)                               |
| Worker packaging         | ADR-0013 (single image, multiple entrypoints) |
| Container registry       | ADR-0014 (GHCR)                               |
| HTTP client / collection | ADR-0015 (Bruno)                              |
| Migration conventions    | ADR-0016                                      |
| Primary key strategy     | ADR-0017 (UUID v7)                            |
| Model mixin pattern      | ADR-0018 (compose())                          |

---

## Security

This application handles sensitive personal data (religious affiliation, banking information) under LGPD Art. 46. Security controls are not optional. Report vulnerabilities to **missionapp.faithtech@gmail.com** — not as public issues.

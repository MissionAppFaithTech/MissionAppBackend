# Copilot Instructions

Custom instructions for GitHub Copilot in this repository.

> **Response language:** Always respond in **Brazilian Portuguese (pt-BR)**, regardless of the language used in the user's message or this file.

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
  auth/
    guards/       custom Lucid guards (e.g. JwtGuard)
    providers/    custom Lucid user providers
  controllers/    thin HTTP handlers — validate, delegate, serialize
  services/       business logic and relational transactions
  listeners/      event routers — emit → enqueue job, nothing else
  jobs/           BullMQ job definitions
  models/         Lucid ORM models (extend generated schema + mixins)
  models/filters/ adonis-lucid-filter query filter classes, organized by domain subdirectory (e.g. filters/user/)
  models/mixins/  WithPrimaryUuid, WithTimestamps, WithCreatedAt, AuthFinder
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

## Ace-First: use the tooling before implementing manually

Before scaffolding or creating any new file, always run `node ace list` (or check the known commands below) to verify whether a native Ace command already handles or assists the task:

```
node ace list
```

If no native command exists, follow this decision chain before writing code manually:

1. **Should a command exist for this?** If the task is routine scaffolding (new class type, new layer file, new pattern file), a generator likely should exist.
2. **If yes — search for a package.** Look for an AdonisJS-compatible package or community plugin that provides the missing generator or feature. Prefer maintained packages registered in `packages.adonisjs.com`.
3. **Only if no package exists** — implement manually and, if the pattern will be repeated, consider creating a custom `make:*` command in `commands/` + a stub in `stubs/make/<type>/main.stub`.

**Known custom generators in this project:**

| Command                     | Generates             | Location                |
| --------------------------- | --------------------- | ----------------------- |
| `node ace make:util <Name>` | `app/utils/<name>.ts` | `commands/make_util.ts` |

This rule exists to prevent: (a) manually writing boilerplate that the framework already generates correctly, (b) missing community solutions that handle the problem more robustly, and (c) introducing inconsistencies in naming or location that the generator would have enforced.

---

## Just-First: prefer Justfile commands for operational tasks

For any operational task — starting the server, running tests, migrating, linting, managing Docker — prefer `just <command>` over the raw underlying command whenever a recipe exists. Justfile recipes sequence and guard steps correctly (e.g., `just start` = up + wait-for-healthy + migrate + dev server).

```
just --list   # or: just list
```

Examples: `just start` (up + wait-for-healthy + migrate + dev server), `just ci` (lint + typecheck), `just migrate`, `just test`. The full list is in `justfile` — always check it first. Use the raw command only when you need flags the recipe does not expose, or when `just` is not available on the machine.

---

## Proactive Review Before Implementing

Before confirming any implementation, check whether the request:

1. **Introduces a security vulnerability** — plaintext credential storage, sensitive data exposed in an API response, missing validation at an input boundary, inadequate cryptographic algorithm, token stored where JavaScript can access it, etc.
2. **Violates an established architectural pattern** — bypasses the event pipeline, accumulates logic in a controller, calls infrastructure directly from a service, creates a side effect in a Lucid hook, etc.
3. **Has a more appropriate alternative** — a more scalable solution, one more consistent with the active ADRs, or better suited to an open-source project with multiple contributors.

If any of these conditions apply, **flag it and present the alternative before implementing**. Do not implement silently and do not leave the decision implicit. The goal is for the maintainer to make an informed decision — not for the agent to decide alone.

---

## Code Patterns

Follow these patterns precisely in all suggestions and completions.

### Comments

Write comments **only when the reason or logic is non-obvious** — a hidden constraint, a subtle invariant, a workaround for a specific bug, behavior that would surprise a future reader. If removing the comment wouldn't confuse anyone, don't write it.

Never describe **what** the code does (well-named identifiers already do that). Never reference the task, PR, or caller ("used by X", "added for the Y flow") — those belong in the PR description and rot as the codebase evolves.

All inline code comments must be written in **Portuguese (pt-BR)**.

**Tag every comment that survives the rule above** — a bare `//` explanation is a code smell; tag it so its intent is scannable:

| Tag | When to use |
| --- | --- |
| `NOTE:` | Important, non-obvious information — invariant, expected behavior, security/design rationale |
| `TODO:` | Work not yet done, proposed by whoever is reading/writing the code right now |
| `FIXME:` / `BUG:` | Known incorrect behavior that needs fixing |
| `HACK:` | Deliberate, temporary workaround — not the ideal solution |
| `OPTIMIZE:` | Works correctly but could be faster/cheaper |
| `REVIEW:` / `CHECK:` | Needs a second pair of eyes or technical validation |
| `DEPRECATED:` | Old code kept only for compatibility — points to the replacement |
| `WARNING:` | Risky or sensitive code — changing it carelessly breaks something |
| `LEGACY:` | Inherited code kept only for backwards compatibility |
| `UNDONE:` | A feature was reverted and may need reimplementing |
| `#region` / `#endregion` | Groups a block of code in editors that support folding |

```typescript
// NOTE: fail-closed — Dragonfly indisponível nunca deve virar "aceitar o token"
// TODO: validar outputs do Dragonfly contra um schema antes de confiar neles
```

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

**Resourceful method names** — this is an API-only project; `create` and `edit` (form-rendering) are prohibited:

| Method    | Verb      | Route           | Purpose            |
| --------- | --------- | --------------- | ------------------ |
| `index`   | GET       | `/resource`     | List records       |
| `show`    | GET       | `/resource/:id` | Show single record |
| `store`   | POST      | `/resource`     | Create a record    |
| `update`  | PUT/PATCH | `/resource/:id` | Update a record    |
| `destroy` | DELETE    | `/resource/:id` | Delete a record    |

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
- Declare relationships in this order: `@belongsTo` → `@hasOne` → `@hasMany` → `@hasManyThrough` → `@manyToMany`

**Scope precedence rule:** any scope that uses `orWhere` internally must wrap its logic in a callback. This makes the scope a closed unit — safe to compose with any external condition without leaking.

```typescript
// ✅ correct — closed unit
static scopeSearch(query, term: string) {
  query.where((q) => {
    q.where('name', 'like', `%${term}%`).orWhere('bio', 'like', `%${term}%`)
  })
}

// ❌ wrong — orWhere leaks into caller's WHERE chain
static scopeSearch(query, term: string) {
  query.where('name', 'like', `%${term}%`).orWhere('bio', 'like', `%${term}%`)
}
```

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

### When to use `.resource()` vs explicit routes

| Situation                                                          | Pattern                                |
| ------------------------------------------------------------------ | -------------------------------------- |
| Action without a collection (`signup`, `login`, `logout`)          | Explicit route                         |
| Singleton (`profile`, resource status attribute)                   | Explicit route                         |
| Collection with CRUD (`organizations`, `members`)                  | `.resource().apiOnly()`                |
| Sub-collection (`members` of an org)                               | Nested `.resource().apiOnly()`         |
| Attribute with its own business rule (status transition, approval) | Explicit route with semantic HTTP verb |

```typescript
router
  .group(() => {
    // ─── Auth ─────────────────────────────────────────────────────────────
    // Pure actions — no collection, no CRUD — explicit routes correct
    router
      .group(() => {
        router.post('signup', [controllers.NewAccount, 'store'])
        router.post('login', [controllers.AccessTokens, 'store'])
      })
      .prefix('auth')
      .as('auth')

    // ─── Account (authenticated) ───────────────────────────────────────────
    // Profile is singleton (no /profile/:id) — explicit routes correct
    // Logout is an action on the current token — DELETE is the semantic verb
    router
      .group(() => {
        router.get('profile', [controllers.Profile, 'show'])
        router.patch('profile', [controllers.Profile, 'update'])
        router.post('logout', [controllers.AccessTokens, 'destroy'])
      })
      .prefix('account')
      .as('account')
      .use(middleware.auth())

    // ─── Domain resources ──────────────────────────────────────────────────
    router
      .group(() => {
        // Collection with CRUD — .resource()
        router.resource('organizations', [controllers.Organizations]).apiOnly()

        // Sub-collection — nested .resource()
        router.resource('organizations.members', [controllers.OrganizationMembers]).apiOnly()

        // Attribute with its own business rule — explicit route
        // (status transition validates prior state, fires notification, etc.)
        router.patch('organizations/:organization_id/members/:id/status', [
          controllers.OrganizationMemberStatus,
          'update',
        ])
      })
      .use(middleware.auth())
  })
  .prefix('/api/v1')
  .as('v1')
```

---

## API Documentation

The public API contract lives in `docs/api/v1/openapi.yaml` (OpenAPI 3.x, maintained manually). Scalar renders it as interactive documentation.

**This file is the contract between backend and frontend.** Tools like [Orval](https://orval.dev/) and [Kubb](https://kubb.dev/) consume it to generate typed TypeScript clients and hooks for frontend consumers — a spec change propagates to generated client code automatically.

### Mandatory: keep the spec in sync

Whenever you create a new endpoint **or** modify anything visible to external consumers, update `docs/api/v1/openapi.yaml` in the same PR:

| Change                                            | What to update in the spec      |
| ------------------------------------------------- | ------------------------------- |
| New route                                         | Add path + operation            |
| New/renamed/removed request field                 | Update `requestBody` schema     |
| New/renamed/removed response field or type change | Update `responses` schema       |
| New path or query parameter                       | Update `parameters`             |
| New error response or changed status code         | Update `responses`              |
| Route renamed or removed                          | Update or remove the path entry |

A PR that changes the API surface without updating the spec must not be merged.

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

**Functional test URL convention:** always resolve URLs via `router.builder().make()` — never hardcode path strings:

```typescript
import router from '@adonisjs/core/services/router'

test('deve logar com credenciais válidas', async ({ client }) => {
  const response = await client
    .post(router.builder().make('auth.login'))
    .json({ email: 'user@example.com', password: 'secret' })

  response.assertStatus(200)
})
```

Hardcoded paths (`'/api/v1/auth/login'`) break silently when routes are renamed — named routes propagate the change automatically.

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

When creating a new ADR, **always** use `docs/architecture/templates/adr-template.md` as the structural reference. If any section of the template is ambiguous, consult the existing ADRs in `docs/architecture/decisions/` as reference implementations — they represent the canonical style for this project.

After creating the ADR file, **always** update `docs/architecture/decisions/README.md`: add the new entry to the **📚 Índice de ADRs** table with the correct ADR number, full title, and current status. The table must stay in sync with the files in the directory — a missing or outdated entry in the index is a documentation bug.

Full index (including infrastructure ADRs): `docs/architecture/decisions/README.md`.

### ADR compliance in code review

When reviewing changes in a PR, verify that they align with the ADRs documented in `docs/architecture/decisions/`. When you identify a possible violation, cite the corresponding ADR by number and title, and reference the specific section of the document that supports the observation.

The table below lists the ADRs that directly affect daily code decisions, along with the key checkpoints to verify during review:

| ADR                                  | Area                  | Key Checkpoints                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------ | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ADR-0001** — AdonisJS              | Framework & ecosystem | All code follows AdonisJS conventions: Lucid ORM for data access, VineJS for validation, Japa for tests, Tuyau barrel for controller imports. Never suggest Express, Fastify, NestJS, Jest, Vitest, Prisma, TypeORM, Zod, or class-validator.                                                                                                                                                                                                      |
| **ADR-0010** — EDA + BullMQ          | Async operations      | Side effects (email, Elasticsearch, storage) must go through the event pipeline: Service emits domain event → Listener enqueues BullMQ Job (< 1ms, no logic) → Worker executes. Never call external services directly from a Service. Never put business logic or DB queries in a Listener. Never use Lucid hooks (`@afterCreate`, etc.) for side effects.                                                                                         |
| **ADR-0018** — Migration conventions | Database migrations   | Every `createTable` must follow the declaration order: `table.comment()` → id → data columns → FK uuid columns → `.foreign()` → `.unique()` → `.check()` → `.index()`. Every column and table must have `.comment()`. File references must use `uuid` FK to `media_assets`, never `string` URLs. All indexes, constraints, and foreign keys must have explicit names following the naming pattern (`fk_`, `uq_`, `idx_`, `chk_`).                  |
| **ADR-0019** — UUID v7               | Primary key strategy  | All tables use UUID v7 as primary key — no exceptions, including internal and junction tables. Never suggest `SERIAL`, `BIGSERIAL`, or UUID v4. PKs are generated via the `WithPrimaryUuid` mixin, never declared manually in the Model or Schema.                                                                                                                                                                                                 |
| **ADR-0020** — Model mixins          | Model composition     | Models use `compose(Schema, ...Mixins)` — never a single base class. Never declare `@column` on the Model class (columns come from the auto-generated Schema). Never declare `id`, `createdAt`, or `updatedAt` manually — they come from mixins. Mixin order matters: Schema first, then structural mixins, then domain mixins, then utility mixins.                                                                                               |
| **ADR-0021** — JWT hybrid auth       | Authentication        | Access tokens are JWT (15 min TTL) validated in 3 steps: signature verification (CPU-local), `auth_version` check (DragonflyDB), `jti` blocklist check (DragonflyDB). Refresh tokens are opaque, stored as SHA-256 hash in PostgreSQL, rotated on each use with family tracking. Password change or role change must increment `auth_version`. Never store tokens in `localStorage`. Web clients receive refresh token via `httpOnly` cookie only. |
| **ADR-0022** — JSDoc convention      | Code documentation    | JSDoc is selective and why-focused — document invariants, security constraints, and surprising behavior only. Never describe what the code does (identifiers already do that). Services and auth guards require class-level JSDoc. Controllers, listeners, validators, and transformers must NOT have JSDoc. All comments in Portuguese (pt-BR).                                                                                                   |
| **ADR-0023** — Controllers & routing | Controller & routing  | Controllers expose only the 5 standard methods: `index`, `show`, `store`, `update`, `destroy`. No arbitrary method names (`publish`, `approve`, `archive`). Non-CRUD operations get dedicated controllers. Routes use `#generated/controllers` barrel — never import controllers directly. Maximum 2 levels of nesting. Singleton attributes (e.g. `status`) use explicit routes, not `.resource()`.                                               |
| **ADR-0024** — Query filters         | Query filtering       | Filter classes live in `app/models/filters/<domain>/`, organized by domain subdirectory. Each public method maps to a query parameter. Filters handle HTTP→query mapping; reusable query logic belongs in scopes. `filter()` and scope composition via `.apply()` are exclusive to the service layer — controllers never build queries. Use `blacklist` + `whitelistMethod` for field-level access control by role.                                |
| **ADR-0025** — OpenAPI + Scalar      | API documentation     | The API contract lives in `docs/api/v1/openapi.yaml` (design-first, manually maintained). Any PR that changes the API surface (new route, changed field, new error response) must update the spec in the same PR. Never use JSDoc annotations or decorators in controllers for API documentation.                                                                                                                                                  |

---

## Opening PRs and Issues

When opening a Pull Request, **always** use `.github/pull-request-template.md` as the strict structural base — no exceptions. Keep every section (Motivação, O que foi feito, Como Testar, Evidências, Checklist, Links) and fill out the checklist honestly instead of removing or skipping it. Do not invent a different PR body format, even for small changes.

When opening an issue, **always** use the matching template from `.github/ISSUE_TEMPLATE/` (`bug_report.md`, `feature_request.md`, or `technical_task.md`) as the strict structural base — same principle: keep every section, fill it out completely, don't freelance a different structure.

---

## Security

This application handles sensitive personal data (religious affiliation, banking information) under LGPD Art. 46. Security controls are not optional. Report vulnerabilities to **missionapp.faithtech@gmail.com** — not as public issues.

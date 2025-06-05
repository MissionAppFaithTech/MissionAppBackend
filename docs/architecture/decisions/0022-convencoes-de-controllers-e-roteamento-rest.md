# [ADR-0022]: Convenções de Controllers e Roteamento REST

## Dados

- **Status:** 🔵 Em Uso
- **Data:** 2026-06-14
- **Proponentes:** [Allber Ferreira](https://github.com/AFSFerreira)

---

## Contexto e Problema

O AdonisJS gera automaticamente cinco rotas RESTful via `.resource().apiOnly()`, cada uma mapeada para um método de controller com nome padronizado: `index`, `show`, `store`, `update` e `destroy`. Sem uma convenção explícita que obrigue o uso desses cinco métodos, o time passa a adicionar métodos arbitrários a controllers existentes para cobrir operações que "não encaixam" perfeitamente no CRUD. O resultado é previsível:

```typescript
// O que emerge sem convenção — controllers com métodos de nomes arbitrários
router.patch('/projects/:id/publish', [ProjectsController, 'publish'])
router.patch('/projects/:id/archive', [ProjectsController, 'archive'])
router.patch('/projects/:id/deadline', [ProjectsController, 'updateDeadline'])
router.post('/projects/:id/members', [ProjectsController, 'addMember'])
router.get('/projects/:id/report', [ProjectsController, 'report'])
router.patch('/posts/:id/approve', [PostsController, 'approve'])
router.patch('/posts/:id/reject', [PostsController, 'reject'])
router.get('/users/:id/history', [UsersController, 'history'])
router.post('/users/import', [UsersController, 'importCsv'])
```

Nesse cenário: a responsabilidade de `ProjectsController` tornou-se indefinida; `publish` e `archive` são transições de estado com regras de negócio próprias (validação do estado anterior, emissão de eventos) embutidas no mesmo controller que gerencia CRUD; `report` é uma sub-coleção com identidade própria que acabou como método avulso; e `importCsv` mistura uma operação de importação em lote com operações de usuários individuais.

A questão central é: **como estruturar controllers e rotas de forma que cada controller tenha uma única responsabilidade bem definida, sem nomes de método arbitrários, sem crescimento desordenado, e de forma que a URL comunique explicitamente a hierarquia de domínio?**

---

## Decisão

### 1. Controllers expõem apenas os cinco métodos RESTful padrão

Todo controller do projeto pode expor no máximo esses cinco métodos, nessa nomenclatura exata:

| Método    | Verbo HTTP | Rota            | Descrição            |
| --------- | ---------- | --------------- | -------------------- |
| `index`   | GET        | `/resource`     | Lista registros      |
| `show`    | GET        | `/resource/:id` | Exibe um registro    |
| `store`   | POST       | `/resource`     | Cria um registro     |
| `update`  | PUT/PATCH  | `/resource/:id` | Atualiza um registro |
| `destroy` | DELETE     | `/resource/:id` | Remove um registro   |

Métodos como `publish`, `archive`, `approve`, `reject`, `addMember`, `importCsv`, `report`, `history` são proibidos em controllers. Toda operação que não é CRUD puro de uma entidade recebe seu próprio controller, e a operação é mapeada para o método padrão semanticamente mais próximo.

### 2. Operações não-CRUD ganham controllers dedicados

Quando uma operação de negócio não se encaixa no CRUD da entidade principal, ela ganha um controller próprio com um nome que identifica exatamente o que está sendo gerenciado. O método do controller é sempre um dos cinco padrões:

```typescript
// ❌ Errado — transições de estado como métodos arbitrários no controller principal
router.patch('/projects/:id/publish', [controllers.Projects, 'publish'])
router.patch('/projects/:id/archive', [controllers.Projects, 'archive'])

// ✅ Correto — controller dedicado à transição de status, método update
router.patch('/projects/:id/status', [controllers.ProjectStatus, 'update'])
```

```typescript
// ❌ Errado — atributo singleton como método arbitrário
router.patch('/projects/:id/deadline', [controllers.Projects, 'updateDeadline'])

// ✅ Correto — controller dedicado ao atributo, método update
router.patch('/projects/:id/deadline', [controllers.ProjectDeadline, 'update'])
```

```typescript
// ❌ Errado — operação em lote misturada no controller de usuários
router.post('/users/import', [controllers.Users, 'importCsv'])

// ✅ Correto — controller dedicado à operação de importação, método store
router.post('/users/imports', [controllers.UserImports, 'store'])
```

Um controller com um único método é perfeitamente válido e preferível a um controller com dez métodos de responsabilidades distintas.

### 3. Padrão de roteamento por situação

O critério central para escolher o padrão correto é: **o recurso tem `:id` próprio?**

- **Sim** → é uma coleção com identidade → `.resource().apiOnly()`
- **Não** → é um singleton (propriedade ou ação sobre o pai) → rota explícita

Um **atributo singleton** é uma propriedade de um recurso que existe exatamente uma vez por pai e não possui `:id` próprio — exemplos: `status`, `deadline`, `visibility`. É diferente de um sub-recurso (coleção com identidade própria, onde cada item tem seu próprio `id`). Usar `.resource()` para um singleton gera uma URL com `:id` fantasma (`/posts/:post_id/status/:id`) que não corresponde a nenhuma entidade real.

Um controller dedicado para um atributo singleton só é justificado quando a operação tem **regras de negócio ou efeitos colaterais próprios** — validação de estado anterior, emissão de evento de domínio, notificações. Se a alteração do atributo não carrega lógica além de persistir o novo valor, `PostsController#update` com o campo no body é suficiente e preferível. A rota explícita continua correta em ambos os casos; o que muda é se ela aponta para um controller dedicado ou para o `update` do recurso pai.

| Situação                                                        | Padrão                                                  |
| --------------------------------------------------------------- | ------------------------------------------------------- |
| Coleção com CRUD completo                                       | `.resource().apiOnly()`                                 |
| Sub-coleção com identidade própria                              | `.resource().apiOnly()` aninhado                        |
| Coleção com CRUD parcial (regra de negócio restringe operações) | `.resource().apiOnly().only([...])` ou `.except([...])` |
| Ação sem coleção (`login`, `logout`)                            | Rota explícita                                          |
| Atributo singleton de um recurso (`status`, `deadline`)         | Rota explícita com verbo semântico                      |
| Sub-recurso singleton (`profile` do usuário autenticado)        | Rota explícita                                          |

**Sobre `.only()` e `.except()`:** quando a regra de negócio proíbe determinadas operações em uma coleção real, use `.only()` ou `.except()` para restringir as rotas geradas. O modelo semântico continua sendo coleção — apenas algumas operações não estão disponíveis. O único caso em que `.only()` indica um problema de design é quando o resultado é `.only(['update'])`: se um recurso tem apenas `update`, provavelmente é um singleton e deveria ser uma rota explícita.

```typescript
router
  .group(() => {
    // ─── Coleção com CRUD completo — .resource()
    router.resource('posts', [controllers.Posts]).apiOnly()

    // ─── Sub-coleção com CRUD completo — tags têm identidade própria e ciclo de vida completo
    router.resource('posts.tags', [controllers.PostTags]).apiOnly()

    // ─── Sub-coleção com CRUD parcial — comentários podem ser criados e lidos,
    //     mas a regra de negócio não permite edição ou deleção individual
    router
      .resource('posts.comments', [controllers.PostComments])
      .apiOnly()
      .only(['index', 'store', 'show'])

    // ─── Sub-coleção sem deleção — anexos podem ser gerenciados mas não removidos
    router
      .resource('posts.attachments', [controllers.PostAttachments])
      .apiOnly()
      .except(['destroy'])

    // ─── Atributo singleton — rota explícita; .resource() geraria :id fantasma
    router.patch('posts/:id/status', [controllers.PostStatus, 'update'])

    // ─── Criação de conta — coleção própria, fora do namespace auth
    //     signup cria um usuário (recurso), não uma sessão ou token
    router.post('accounts', [controllers.Accounts, 'store'])

    // ─── Ações de autenticação — login cria token, logout destrói
    router
      .group(() => {
        router.post('login', [controllers.AccessTokens, 'store'])
        router.delete('logout', [controllers.AccessTokens, 'destroy']).use(middleware.auth())
      })
      .prefix('auth')
      .as('auth')

    // ─── Sub-recurso singleton — rota explícita direta, sem grupo desnecessário
    //     não usar .resource('account.profile') — singleton não tem :id próprio;
    //     a notação de ponto pressupõe coleção e geraria um :profile_id fantasma
    router.get('account/profile', [controllers.Profile, 'show']).use(middleware.auth())
  })
  .prefix('/api/v1')
  .as('v1')
```

### 4. Aninhamento de recursos

O aninhamento máximo é **dois níveis**. Além disso, a URL começa a comunicar mal: o cliente precisa conhecer toda a hierarquia para qualquer operação, e uma mudança estrutural no domínio quebra todas as URLs.

```typescript
// ✅ Dois níveis — correto
router.resource('missions.updates', [controllers.MissionUpdates]).apiOnly()
// GET /missions/:mission_id/updates
// GET /missions/:mission_id/updates/:id

// ❌ Três níveis — sinal de alerta
router.resource('missions.updates.attachments', [...]).apiOnly()
// Alternativa: promover attachments a top-level com filtro por query param
```

### 5. Shallow routing — critério de decisão

O AdonisJS suporta `.shallow()` em `.resource()` aninhado, gerando URLs curtas para operações de item individual (`show`, `update`, `destroy`). A escolha entre aninhamento completo e shallow segue este critério:

| Pergunta                                                    | Shallow | Aninhamento completo |
| ----------------------------------------------------------- | ------- | -------------------- |
| O pai acrescenta escopo de segurança ou autorização?        | Não     | Sim                  |
| O pai tem significado de negócio na operação de item?       | Não     | Sim                  |
| O recurso é multi-tenant (escopo por organização/entidade)? | Raro    | Quase sempre         |
| Remover o pai empobrece logs, traces e documentação?        | Não     | Sim                  |

**Aninhamento completo** é o padrão para recursos que vivem dentro de um contexto de negócio relevante. O `:parent_id` na URL funciona como filtro de escopo implícito na query e como contrato documentado na URL:

```typescript
// PATCH /missions/:mission_id/updates/:id
const update = await MissionUpdate.query()
  .where('id', params.id)
  .where('mission_id', params.mission_id) // WHERE duplo — protege acesso cruzado
  .firstOrFail()
```

**Shallow** é adequado quando o recurso filho é operacionalmente autossuficiente e o pai não acrescenta segurança nem semântica à operação de item:

```typescript
// Criação e listagem precisam do contexto do post
// Download e remoção do arquivo não dependem do contexto
router.resource('posts.attachments', [controllers.Attachments]).apiOnly().shallow()
// POST   /posts/:post_id/attachments  → store
// GET    /posts/:post_id/attachments  → index
// GET    /attachments/:id             → show   (shallow)
// DELETE /attachments/:id             → destroy (shallow)
```

### 6. Imports via barrel gerado

Rotas sempre referenciam controllers via barrel gerado em `.adonisjs/server/controllers.ts`. Nunca importar controller diretamente:

```typescript
// ✅ Correto
import { controllers } from '#generated/controllers'
router.resource('missions', [controllers.Missions]).apiOnly()

// ❌ Errado
import MissionsController from '#controllers/missions_controller'
```

---

## Justificativa

**Por que apenas os cinco métodos?**
A convenção cria um contrato implícito entre o router e o controller. Qualquer contribuidor sabe que pode abrir qualquer controller e encontrar no máximo `index`, `show`, `store`, `update`, `destroy` — sem precisar ler a documentação do arquivo para entender o que está disponível. Controllers com métodos arbitrários (`open`, `close`, `approve`) exigem leitura do código para mapear a intenção. Com cinco métodos e controllers dedicados, o nome do controller carrega a intenção.

**Por que controllers de método único são válidos?**
Um controller com apenas `update` para gerenciar transição de status de uma missão tem responsabilidade mais clara do que um controller com `store`, `update`, `destroy` e `updateStatus`. Quando a lógica de transição de status crescer (validação de estado anterior, notificações, audit log), ela estará isolada — sem risco de crescer acoplada ao CRUD da entidade principal.

**Por que a URL deve carregar o contexto do pai?**
A URL aninhada serve três propósitos simultâneos: (1) o WHERE duplo na query protege acesso cruzado entre recursos de domínios distintos sem depender de disciplina do desenvolvedor; (2) logs e traces mostram o contexto completo da operação sem precisar resolver o relacionamento; (3) ferramentas de documentação como OpenAPI/Swagger exibem a hierarquia de domínio automaticamente, sem anotação manual adicional.

---

## Alternativas Consideradas

**1. Métodos arbitrários em controllers existentes**

É o estado descrito na seção de contexto — o ponto de chegada natural quando não há convenção. O custo é um controller com responsabilidades indefinidas, nomes de método não previsíveis e crescimento difícil de rastrear em code review. Descartado.

**2. Rotas completamente planas (sem aninhamento)**

Evita o aninhamento mas perde o escopo de segurança implícito no WHERE duplo e empobrece a documentação automática. Em projetos com dados sensíveis e múltiplas entidades de domínio, a URL plana exige disciplina de implementação extra em cada controller para não vazar dados entre contextos. Descartado como padrão; válido apenas nos casos cobertos pela regra de shallow.

**3. Permitir aninhamento ilimitado**

Tecnicamente suportado pelo AdonisJS — o dot notation processa recursivamente. Na prática, URLs com três ou mais níveis criam acoplamento forte entre o cliente e a hierarquia do domínio: qualquer reestruturação quebra todos os clientes. O limite de dois níveis preserva a hierarquia sem criar fragilidade. Descartado.

---

## Consequências

**Positivas:**

- Qualquer controller do projeto é previsível: no máximo cinco métodos, nomes sempre iguais
- Separação de responsabilidades emerge naturalmente da convenção — a lógica de transição de estado nunca mistura com CRUD
- URLs aninhadas geram documentação OpenAPI mais rica automaticamente, sem anotação manual da hierarquia
- O WHERE duplo em recursos aninhados protege acesso cruzado como efeito colateral da estrutura de URL

**Negativas:**

- Controllers de método único proliferam — o número de arquivos em `app/controllers/` cresce mais rápido do que em projetos sem essa convenção
- A decisão entre aninhamento completo e shallow exige julgamento: contribuidores novos podem não aplicar o critério corretamente sem leitura deste ADR
- Operações que envolvem múltiplas entidades simultaneamente (ex: bulk operations) não mapeiam naturalmente para os cinco métodos e exigem uma decisão caso a caso

---

## Referências

- [ADR-0016](./0016-convencoes-de-escrita-de-migracoes.md): convenção análoga para migrações de banco de dados
- [ADR-0021](./0021-convencao-de-documentacao-de-codigo-com-jsdoc.md): convenção de documentação — controllers são camada sem JSDoc por serem intencionalmente finos
- [AdonisJS Routing — Resource Routes](https://docs.adonisjs.com/guides/basics/routing#resource-routes): documentação oficial do `.resource()` e `.apiOnly()`
- [REST Resource Naming Guide](https://restfulapi.net/resource-naming/): convenções REST para nomenclatura de recursos e hierarquia de URLs

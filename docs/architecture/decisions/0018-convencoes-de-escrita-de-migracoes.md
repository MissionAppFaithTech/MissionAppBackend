# [ADR-0018]: Convenções de Escrita de Migrações de Banco de Dados

## Dados

- **Status:** 🔵 Em Uso
- **Data:** 2026-06-04
- **Proponentes:** [Allber Ferreira](https://github.com/AFSFerreira)

---

## Contexto e Problema

O projeto adota AdonisJS Lucid como ORM e gerencia o schema do banco de dados exclusivamente via arquivos de migração TypeScript em `database/migrations/`. À medida que o projeto cresce e novos colaboradores contribuem, migrações escritas sem uma convenção explícita tendem a divergir em três dimensões:

**Ordem das declarações dentro da migração:**
Sem uma ordem estabelecida, cada colaborador decide onde colocar colunas de chave estrangeira, onde declarar o `.foreign()`, onde ficam os índices. O resultado são migrações inconsistentes que exigem leitura completa do arquivo para entender a estrutura da tabela — em vez de seguir um padrão previsível.

**Ausência de documentação inline:**
Knex suporta comentários de tabela e coluna via `.comment()` que são persistidos diretamente no catálogo do PostgreSQL (`pg_catalog`). Esses comentários aparecem em ferramentas de introspectação (pgAdmin, DBeaver, `\d+ tablename` no psql, diagramas ER gerados automaticamente) sem nenhuma configuração adicional. Sem uma convenção que obrigue o uso de `.comment()`, o schema do banco fica sem documentação acessível fora do código TypeScript.

**Inconsistência em tipos de colunas para referências externas:**
Sem uma regra explícita, colaboradores podem usar `string` para armazenar URLs de arquivos em vez de referenciar a tabela central `media_assets` via UUID. Isso cria ilhas de armazenamento de metadados de arquivo fora do controle centralizado.

A questão central é: **como garantir que todas as migrações do projeto sigam uma estrutura previsível, sejam autodocumentadas no nível do banco de dados e apliquem tipos corretos para referências a recursos externos?**

## Decisão

Todas as migrações do MissionApp Backend seguirão as convenções abaixo. Qualquer PR que adicione ou modifique uma migração e não as respeite será solicitado a corrigir antes do merge.

### 1. Ordenação obrigatória das declarações dentro de `createTable`

```
1. table.comment(...)          — comentário da tabela
2. id                          — chave primária UUID v7
3. colunas de dados            — agrupadas por domínio semântico
4. colunas UUID de FK          — apenas as declarações de coluna
5. .foreign()                  — na mesma ordem das colunas FK
6. .unique()                   — constraints de unicidade
7. .check()                    — constraints de verificação
8. .index()                    — índices de leitura
```

As colunas de dados devem ser agrupadas semanticamente (ex: dados de identidade juntos, dados de autenticação juntos, contadores juntos, timestamps juntos) com uma linha em branco entre os grupos. Colunas FK ficam após todas as colunas de dados para que a estrutura principal da tabela seja lida sem interrupção de ponteiros externos.

### 2. Comentário obrigatório em toda coluna e tabela

**Toda tabela** deve ter `table.comment('...')` como primeira instrução dentro de `createTable`, descrevendo o propósito da tabela no sistema.

**Toda coluna** deve ter `.comment('...')` descrevendo o que ela representa. O comentário deve responder ao menos uma das perguntas:

- O que este campo armazena?
- Por que existe (qual regra ou comportamento suporta)?
- Qual o significado de null?
- Qual o formato esperado (quando não óbvio)?

**Colunas FK** devem ter adicionalmente um comentário de código acima da declaração explicando o comportamento de cascade:

```typescript
// FK: CASCADE — registro excluído junto com o pai
table.uuid('missionary_id').notNullable().comment('...')
```

### 3. Referências a arquivos via `media_assets`

Colunas que armazenam referências a arquivos (imagens, vídeos, documentos, QR Codes) devem usar `uuid` FK para `media_assets` — nunca `string` com URL ou caminho. O padrão `uuid('field_asset_id')` sinaliza a intenção ao leitor e garante rastreabilidade via a tabela centralizada.

```typescript
// correto
table.uuid('cover_image_asset_id').notNullable().comment('FK para media_assets; ...')

// incorreto
table.string('cover_image_url').notNullable().comment('URL da imagem de capa')
```

### 4. Comprimento de strings em `.comment()`

Strings de comentário longas devem ser quebradas com formatação multiline para respeitar o limite de linha do Prettier:

```typescript
.comment(
  'Descrição longa que não cabe em uma única linha sem exceder o limite configurado'
)
```

### 5. Nomenclatura obrigatória de índices, constraints e chaves estrangeiras

Todo índice, constraint e chave estrangeira deve receber um nome explícito seguindo o padrão abaixo. Nunca confiar no nome gerado automaticamente pelo Knex ou pelo PostgreSQL — nomes automáticos são não-determinísticos entre ambientes e impossíveis de referenciar com precisão em scripts de manutenção, logs de erro e ferramentas de DBA.

| Objeto            | Padrão                     | Exemplo                                     |
| ----------------- | -------------------------- | ------------------------------------------- |
| Chave estrangeira | `fk_<tabela>_<coluna>`     | `fk_posts_missionary_id`                    |
| Unique constraint | `uq_<tabela>_<colunas>`    | `uq_posts_slug`, `uq_likes_user_id_post_id` |
| Índice de leitura | `idx_<tabela>_<colunas>`   | `idx_posts_missionary_id_created_at`        |
| Check constraint  | `chk_<tabela>_<descricao>` | `chk_users_followers_count_non_negative`    |

Para objetos com múltiplas colunas, concatenar os nomes com `_`: `uq_campaign_projects_campaign_id_project_id`.

```typescript
// correto
table.unique(['user_id', 'post_id'], { indexName: 'uq_likes_user_id_post_id' })
table.foreign('missionary_id', 'fk_posts_missionary_id').references('id').inTable('missionaries')
table.index(['missionary_id', 'created_at'], 'idx_posts_missionary_id_created_at')
table.check('?? >= 0', ['followers_count'], 'chk_users_followers_count_non_negative')

// incorreto — nome gerado automaticamente pelo Knex, não determinístico
table.unique(['user_id', 'post_id'])
table.foreign('missionary_id').references('id').inTable('missionaries')
```

## Justificativa

- **Comentários persistidos no catálogo do PostgreSQL:** `.comment()` gera `COMMENT ON COLUMN` e `COMMENT ON TABLE` no DDL. Ferramentas de introspectação (pgAdmin, DBeaver, `\d+`, geradores de diagrama ER) leem esses comentários diretamente do banco sem acesso ao código-fonte — essencial para onboarding de novos colaboradores e para diagnóstico de produção.

- **Ordenação previsível reduz carga cognitiva em reviews:** Um revisor que conhece a convenção sabe exatamente onde olhar para encontrar os índices, as FKs e as constraints. Não é necessário ler o arquivo de cima a baixo para encontrar uma declaração específica.

- **Colunas de dados antes de FKs:** As FKs são ponteiros para outras entidades — não são parte do "conteúdo" da tabela. Agrupá-las ao final, junto com as declarações `.foreign()`, permite que o leitor entenda o que a tabela armazena antes de entender suas dependências externas.

- **`media_assets` como ponto único de controle de arquivos:** Toda referência a arquivo passa pela mesma tabela, garantindo que tamanho, tipo MIME, provider e bucket sejam sempre rastreáveis. Colunas `string` com URLs quebram esse invariante — um arquivo poderia ser deletado do storage sem que nenhuma FK impedisse ou notificasse.

- **E.164 como convenção de telefone:** Formato canônico internacional que permite validação e formatação programática sem ambiguidade. Documentar o formato no comentário da coluna elimina dúvida sobre se o campo espera `(11) 91234-5678`, `11912345678` ou `+5511912345678`.

## Alternativas Consideradas

- **Sem convenção de ordenação (freestyle):** Cada colaborador organiza como preferir. Descartado porque o projeto tem muitas migrações e a ausência de convenção resulta em inconsistências durante o desenvolvimento.

- **Comentários apenas como comentários de código TypeScript (`//`):** Não persiste no banco de dados — invisível para ferramentas de introspectação. Descartado em favor do `.comment()` que gera SQL `COMMENT ON` real.

- **Documentação de schema em arquivo separado (markdown, wiki):** Cria documentação fora de sincronia com o código. Descartado porque `.comment()` é co-localizado com a definição da coluna e atualizado no mesmo commit que a migração.

- **Geração automática de comentários via ferramenta externa:** Adicionaria dependência de tooling para um problema resolvível com uma convenção de código. Descartado pelo princípio de não introduzir dependências sem necessidade proporcional.

## Consequências (Trade-offs)

### Positivas / Benefícios

- Schema autodocumentado: qualquer ferramenta conectada ao PostgreSQL exibe descrições de tabelas e colunas sem acesso ao repositório.

- Reviews de migração mais rápidos: estrutura previsível permite verificação sistemática em vez de leitura completa.

- Rastreabilidade completa de arquivos: toda referência a asset passa por `media_assets`, garantindo que deleções sejam controladas por FK.

- Onboarding: novo colaborador entende o modelo de dados lendo o catálogo do banco, não apenas o código TypeScript.

### Negativas / Riscos

- Custo por migração: escrever comentários significativos para cada coluna adiciona tempo de escrita. O benefício de documentação persistente justifica o custo.

- Comentários podem ficar desatualizados: se uma coluna muda de propósito e o comentário não é atualizado junto, o banco documenta algo incorreto. A revisão de PRs é a principal salvaguarda — qualquer alteração de coluna deve incluir revisão do `.comment()`.

- Prettier pode rejeitar strings longas sem quebra de linha: mitigado pela regra de formatação multiline definida neste ADR.

## Referências

- [PostgreSQL — `COMMENT` command](https://www.postgresql.org/docs/current/sql-comment.html): comando SQL que persiste comentários de tabela e coluna diretamente no schema
- [Knex.js — `table.comment()` e `column.comment()`](https://knexjs.org/guide/schema-builder.html#comment): API do Knex usada pelo Lucid para declarar comentários nas migrações
- [ITU-T E.164 — The international public telecommunication numbering plan](https://www.itu.int/rec/T-REC-E.164): padrão internacional para telefones, referenciado na convenção de colunas de telefone
- [ADR-0004](./0004-adocao-do-postgresql-como-banco-de-dados.md): PostgreSQL como banco alvo das migrações cujas convenções são definidas aqui
- [ADR-0009](./0009-adocao-do-pnpm-como-gerenciador-de-pacotes.md): pnpm como gerenciador de pacotes, mencionado na convenção de comandos de migração

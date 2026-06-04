# [ADR-0017]: Adoção de UUID v7 como Estratégia de Chave Primária

## Dados
* **Status:** Proposto
* **Data:** 2026-06-04
* **Proponentes:** [Allber Ferreira](https://github.com/AFSFerreira)

---

## Contexto e Problema

Todo registro persistido no banco de dados precisa de um identificador primário único. A escolha da estratégia de geração desse identificador tem consequências diretas em três dimensões: **performance de escrita** (padrão de inserção no índice B-tree), **segurança** (enumerabilidade e vazamento de informação) e **consistência arquitetural** (uniformidade de tipos entre tabelas, FKs e respostas da API).

O projeto precisava definir uma estratégia única aplicável a todas as tabelas — incluindo tabelas de negócio expostas via API, tabelas de suporte internas (como `user_action_audits` e `authentication_audits`) e tabelas de junção — sem exceções baseadas em pressupostos sobre "quem vai acessar cada tabela".

**O problema com inteiros auto-incrementais:**
A intuição comum é usar `SERIAL` ou `BIGSERIAL` para tabelas internas que "nunca serão acessadas externamente". Essa premissa é frágil: uma tabela classificada como interna hoje pode ser exposta amanhã por um endpoint de auditoria, uma ferramenta de monitoramento, uma exportação de dados ou uma integração com sistema externo. Uma vez que IDs inteiros sequenciais estão em produção e expostos em qualquer endpoint, o dano é irreversível: qualquer cliente que gravou esses IDs mantém uma referência que viola a confidencialidade do volume de registros. Além disso, IDs inteiros diferentes de UUIDs criam heterogeneidade de tipo no schema — FKs de tabelas UUID para tabelas integer exigem coerção explícita e produzem inconsistências no modelo de dados.

**O problema com UUID v4:**
UUID v4 é gerado aleatoriamente. Cada novo registro inserido em uma tabela com índice B-tree no UUID (que inclui o índice da PK) cai em uma posição aleatória dentro da árvore, forçando splits de página e fragmentação do índice. Em tabelas de alto volume de inserção (audit logs, likes, followers), esse comportamento degrada progressivamente a performance de escrita e aumenta o consumo de disco.

A pergunta central é: **qual estratégia de geração de chave primária oferece performance de inserção previsível, ausência de enumeração, geração sem coordenação e tipo uniforme em todo o schema?**

## Decisão

Adotaremos **UUID v7** como estratégia de chave primária para **todas as tabelas** do banco de dados, sem exceção. A implementação é centralizada no mixin `WithPrimaryUuid` em `app/models/mixins/with_primary_uuid.ts`, que todo Model deve compor.

```typescript
// app/models/mixins/with_primary_uuid.ts
export const WithPrimaryUuid = <Model extends NormalizeConstructor<typeof BaseModel>>(
  superclass: Model
) => {
  class WithPrimaryUuidClass extends superclass {
    static selfAssignPrimaryKey = true

    @column({ isPrimary: true })
    declare id: string

    @beforeCreate()
    static generateId(model: any) {
      model.id ??= randomUUID() // uuid v7
    }
  }
  return WithPrimaryUuidClass
}
```

UUID v7 é definido pelo [RFC 9562](https://www.rfc-editor.org/rfc/rfc9562) como um UUID com os primeiros 48 bits preenchidos pelo timestamp Unix em milissegundos. Os bits restantes são aleatórios. O resultado é um UUID **lexicograficamente ordenável por tempo de criação**.

**Por que UUID v7 também em tabelas internas como `user_action_audits`:**

A distinção entre "tabela interna" e "tabela exposta externamente" é uma premissa de design, não uma garantia permanente. `user_action_audits` registra ações administrativas sensíveis — uma futura interface de auditoria para administradores, uma exportação de logs para conformidade com LGPD, ou uma integração com sistema SIEM exporia esses IDs. Se forem inteiros sequenciais, qualquer cliente externo pode deduzir o volume exato de eventos de auditoria do sistema — informação estratégica e sensível.

Mais objetivamente: o custo de aplicar UUID v7 a uma tabela interna é zero (o mixin existe, a migração usa `.uuid('id').primary()`). O custo de migrar de integer para UUID em produção — com dados existentes, FKs referenciando a tabela, backups, exportações históricas — é alto. Aplicar a convenção uniformemente desde o início elimina essa dívida.

## Justificativa

- **Inserções sequenciais sem fragmentação de índice:** UUID v7 é monotonicamente crescente dentro do mesmo milissegundo. Novos registros são sempre inseridos no final do índice B-tree da PK — o mesmo comportamento de um `SERIAL`, sem os problemas de enumeração. Em tabelas de alto volume como `authentication_audits`, `followers` e `likes`, isso mantém a performance de escrita constante independentemente do tamanho da tabela.

- **Geração sem coordenação:** UUID v7 é gerado na aplicação, sem roundtrip ao banco para obter o próximo valor de sequência. Isso elimina um ponto de contenção em cenários de alta concorrência e permite que o ID seja conhecido antes da inserção — facilitando logs de correlação, respostas de API que incluem o ID antes do commit, e testes unitários que não dependem de banco.

- **Não enumerável:** Um atacante que conhece o ID `01960d3e-4b00-7000-0000-000000000000` não consegue inferir o ID do registro anterior ou seguinte, nem o volume total de registros. Isso é especialmente relevante para recursos acessados via URL (ex: `/api/v1/missionaries/:id`) e para IDs de tokens, auditorias e configurações financeiras.

- **Timestamp extraível do ID:** Os primeiros 48 bits do UUID v7 codificam o timestamp de criação com precisão de milissegundo. É possível reconstruir o momento de criação de qualquer registro a partir do ID, sem depender da coluna `created_at` — útil para diagnóstico em produção e para ordenação aproximada sem índice em `created_at`.

- **Tipo uniforme em todo o schema:** Todo `id` é `uuid`, toda FK é `uuid`. Não há coerção de tipo em joins, não há inconsistência entre tabelas "importantes" e tabelas "auxiliares". O modelo TypeScript gerado pelo `database/schema.ts` declara todos os PKs e FKs como `string` — um único tipo para raciocinar.

- **Compatibilidade com sharding horizontal sem coordenação de sequência:** Sequências auto-incrementais gerenciadas pelo banco exigem, em arquiteturas com particionamento horizontal dos dados (sharding), um mecanismo de coordenação entre os nós para garantir unicidade global — seja um serviço centralizado de sequência (ponto único de falha), seja uma estratégia de interleaving (nó 1 gera ímpares, nó 2 gera pares) ou step sequences (nó 1 gera 1, 1001, 2001...; nó 2 gera 2, 1002, 2002...). Qualquer dessas abordagens introduz acoplamento entre os nós de banco ou restringe a elasticidade do cluster. UUID v7, gerado inteiramente na camada de aplicação com base em timestamp + entropia local, produz identificadores globalmente únicos sem que os nós de banco precisem se comunicar — cada instância da aplicação emite IDs válidos de forma totalmente autônoma.

- **Convenção aplicada pelo mixin — custo zero por tabela:** `WithPrimaryUuid` encapsula a lógica de geração. Compor o mixin no Model é suficiente; não há código de geração espalhado pelo codebase.

## Alternativas Consideradas

* **`SERIAL` / `BIGSERIAL` (inteiro auto-incremental):** Gerado pelo banco, sequencial, eficiente em B-tree. Descartado porque: (1) enumerável — qualquer cliente externo pode inferir volume de registros e iterar sobre todos os IDs válidos; (2) vaza informação de negócio — o ID `42` revela que existem exatamente 41 registros anteriores; (3) pressupor que certas tabelas "nunca serão expostas" é uma aposta contra a evolução natural do sistema; (4) cria heterogeneidade de tipo no schema quando misturado com UUIDs em outras tabelas.

* **UUID v4 (aleatório):** Padrão amplamente adotado, sem enumeração. Descartado porque: (1) geração completamente aleatória causa inserções em posições arbitrárias do índice B-tree, forçando page splits e fragmentação progressiva — efeito mensurável em tabelas que crescem acima de milhões de registros; (2) sem ordenação temporal, impossível reconstruir sequência de criação a partir do ID.

* **ULID (Universally Unique Lexicographically Sortable Identifier):** Sortável por tempo, sem fragmentação de índice, não enumerável. Descartado porque: (1) não é um padrão RFC — menor adoção em ecossistema de ferramentas, drivers e ORMs; (2) formato de string diferente do UUID (`01ARZ3NDEKTSV4RRFFQ69G5FAV`) quebra a expectativa de formato UUID em ferramentas e APIs; (3) PostgreSQL não tem tipo nativo `ulid` — armazenado como `text` ou `bytea`, perde validação de formato em nível de banco; (4) UUID v7 oferece os mesmos benefícios com suporte nativo do tipo `uuid` do PostgreSQL.

* **CUID2:** Similar ao ULID em benefícios, com foco em segurança contra colisão. Descartado pelos mesmos motivos de falta de padronização e suporte de tipo nativo no PostgreSQL.

* **Snowflake ID (Twitter):** Inteiro de 64 bits composto por timestamp em milissegundos (41 bits), identificador de máquina/datacenter (10 bits) e número de sequência por milissegundo (12 bits). Sortável por tempo, compacto (8 bytes vs 16 bytes do UUID), armazenado nativamente como `BIGINT`. Descartado porque: (1) exige atribuição e gerenciamento de identificadores únicos de máquina para cada instância da aplicação — em ambientes de auto-scaling (containers efêmeros, Kubernetes pods), garantir que cada instância receba um machine ID único sem colisão introduz exatamente o tipo de coordenação que se busca evitar; (2) dois processos com o mesmo machine ID geram IDs idênticos para o mesmo milissegundo e posição de sequência — falha silenciosa, sem mecanismo de detecção em tempo de execução; (3) o espaço de machine IDs é limitado a 1.024 valores (2¹⁰) — em deploys com muitos workers ou microserviços, este limite pode se tornar um gargalo; (4) é um inteiro de 64 bits — embora não sequencial como `SERIAL`, o padrão temporal nos bits mais significativos permite estimar a janela de tempo em que um ID foi gerado, o que pode ser indesejável em contextos de auditoria; (5) não é um padrão aberto (sem RFC), dependente da implementação de cada biblioteca.

* **UUID v7 apenas para tabelas externas, SERIAL para internas:** Estratégia híbrida. Descartado porque: (1) a linha entre "interna" e "externa" é móvel e subjetiva; (2) cria dois padrões para raciocinar — aumenta carga cognitiva e superfície de erro; (3) o custo de aplicar UUID v7 universalmente é zero dado o mixin existente.

## Consequências (Trade-offs)

### Positivas / Benefícios

* Performance de inserção previsível em qualquer tabela, independentemente do volume.
* IDs não enumeráveis por padrão — sem vazamento de volume de registros em nenhuma tabela.
* Tipo uniforme no schema: todo PK e FK é `uuid`, sem coerção em joins.
* Timestamp de criação extraível do ID para diagnóstico sem depender de `created_at`.
* Geração na aplicação sem roundtrip ao banco — ID conhecido antes da inserção.

### Negativas / Riscos

* **UUID v7 ainda não é suportado nativamente pelo pacote `uuid` em versões antigas:** O projeto usa o pacote `uuid` versão 14+, que suporta `v7`. Fixar a versão mínima do pacote no `package.json` é necessário para garantir disponibilidade da função.

* **Tamanho de armazenamento maior que integer:** UUID ocupa 16 bytes como tipo nativo `uuid` do PostgreSQL versus 4 bytes para `INTEGER` ou 8 bytes para `BIGINT`. Em tabelas de altíssimo volume isso pode ser relevante; para o perfil de dados do MissionApp, o impacto é desprezível.

* **Precisão de milissegundo não garante unicidade em geração distribuída de alta frequência:** UUID v7 adiciona bits aleatórios nos bits restantes do timestamp, o que torna colisões extremamente improváveis mesmo em geração simultânea. O mixin usa `??=` — se o ID já foi atribuído externamente, é preservado, evitando sobrescrita acidental.

## Referências

* [RFC 9562 — Universally Unique IDentifiers (UUIDs), Section 5.7: UUID Version 7](https://www.rfc-editor.org/rfc/rfc9562#section-5.7)
* [PostgreSQL — UUID type](https://www.postgresql.org/docs/current/datatype-uuid.html)
* [uuid (npm) — v7 support](https://github.com/uuidjs/uuid)
* [ADR-0002 — PostgreSQL como Banco de Dados Relacional](./0002-adocao-do-postgresql-como-banco-de-dados.md)
* [ADR-0016 — Convenções de Escrita de Migrações de Banco de Dados](./0016-convencoes-de-escrita-de-migracoes.md)

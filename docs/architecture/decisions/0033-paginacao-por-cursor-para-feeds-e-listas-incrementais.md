# [ADR-0033]: Paginação por Cursor para Feeds e Listas Incrementais

## Dados

- **Status:** 🟡 Proposto
- **Data:** 2026-11-01
- **Proponentes:** [@Amaro-peter](https://github.com/Amaro-peter)

---

## Contexto e Problema

A API ainda não pagina nenhuma lista:

- `GET /missionary-agencies` e `GET /faith-communities` devolvem tudo, ordenado por nome (`app/services/missionary/missionary_agencies_service.ts`).
- O `paginationSchema` (`page` + `perPage`, máximo 100) existe em `app/validators/shared/schemas/pagination.ts`, mas nenhum endpoint o usa.
- Os exemplos dos ADR-0026 e ADR-0028 assumem paginação por offset (`.paginate(page, perPage)` do Lucid).
- Nenhum ADR define o envelope de resposta de uma lista paginada.

As próximas features são majoritariamente listas que crescem no topo e são lidas de forma incremental:

- feed pessoal e feed de quem o usuário segue (RF 4.4.2, 5.3.1);
- aba "Postagens" do perfil (RF 10.4);
- listas de seguidores e seguidos com "Carregar mais" (RF 10.6, 11.6);
- "Explorar" (RF 14).

O [site de requisitos](https://missionappfaithtech.github.io/MissionAppRequirementsList/) é explícito:

- **NF 2.2** pede "Paginação por Key Cursor (baseada em _timestamp_ ou ID)" e o feed carregado em menos de 2 s para os primeiros 10 itens.
- **NF 2.3** pede "Retorno **máximo** de 20 itens por requisição da API" em listagens extensas (seguidores, feed, resultados de busca), com scroll infinito no frontend.

Offset nesses casos tem dois problemas conhecidos:

- **Itens duplicados ou pulados:** quando um post novo entra no topo entre a página 1 e a página 2, o deslocamento muda e o cliente recebe repetido o último item da página anterior.
- **Custo crescente:** `OFFSET n` obriga o PostgreSQL a ler e descartar `n` linhas, e piora conforme o usuário rola.

Ao mesmo tempo, as telas do painel administrativo (RF 17, 18, 20: missionários pendentes, campanhas, denúncias, auditoria) precisam de total de registros e de "ir para a página N", que cursor não oferece de forma barata.

A questão central é: **qual estratégia de paginação e qual envelope de resposta a API adota para listas, de modo que o frontend implemente rolagem infinita e "Carregar mais" sem duplicar itens?**

## Decisão

A API adota **duas estratégias de paginação, escolhidas pelo tipo de lista**:

| Tipo de lista                                                                     | Estratégia                             | Exemplos                                                         |
| --------------------------------------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------- |
| Leitura incremental pelo usuário final (feeds, "Carregar mais", rolagem infinita) | **Cursor (keyset)**                    | feeds, posts de um perfil, seguidores, seguidos, explorar, busca |
| Tabelas de gestão (painel admin/avaliador)                                        | **Offset** (`paginate`, ADR-0026/0028) | missionários pendentes, campanhas, denúncias, auditoria          |

### Contrato da paginação por cursor

**Requisição:** `GET /api/v1/<recurso>?limit=20&cursor=<opaco>`

- `limit`: padrão **20**, mínimo 1, máximo **20**. O NF 2.3 fixa 20 como teto por requisição. Telas que precisam de menos (ex.: os 10 primeiros itens do NF 2.2) pedem um `limit` menor. Validado por um novo `cursorPaginationSchema` em `app/validators/shared/schemas/`, ao lado do `paginationSchema`.
- `cursor`: opcional. Ausente significa primeira página.

**Ordenação e chave:**

- A ordem é sempre total e estável: `ORDER BY created_at DESC, id DESC`.
- O cursor codifica o par `(created_at, id)` do último item entregue.
- A próxima página usa a comparação de tupla `WHERE (created_at, id) < (:createdAt, :id)`, coberta por índice composto. O índice `idx_posts_missionary_id_created_at` de `posts` passa a incluir `id`, numa migração nova (ADR-0020).
- O `id` UUID v7 (ADR-0021) desempata itens criados no mesmo instante.
- Listas com outra ordem natural (ex.: seguidores por data em que seguiram) usam o par `(<coluna de ordem>, id)` da mesma forma.

**Cursor opaco:**

- É o par serializado em JSON e codificado em base64url.
- O cliente não interpreta nem constrói cursores; só repassa o `nextCursor` recebido.
- Cursor malformado → **422**, no envelope de erro do [ADR-0034](./0034-envelope-de-erro-unico-com-codigo.md), com `code: 'E_INVALID_CURSOR'`.

**Busca do próximo item:** a query busca `limit + 1` linhas. Se vier a linha extra, há próxima página; ela é descartada da resposta.

**Envelope**, coerente com o `serialize()` atual (`{ data: { <nome>: ... } }`):

```json
{
  "data": {
    "posts": [{ "id": "…", "createdAt": "…" }]
  },
  "meta": {
    "nextCursor": "eyJjcmVhdGVkQXQiOiIyMDI2LTExLTAxVDEyOjAwOjAwWiIsImlkIjoiMDE5Mi4uLiJ9",
    "hasMore": true
  }
}
```

- `nextCursor` é `null` na última página, e então `hasMore` é `false`.
- **Sem `total`** por padrão: `COUNT(*)` em tabelas grandes anula o ganho do keyset. Quando a tela exibir um número (ex.: "1.234 seguidores", RF 10.6), ele vem de um contador desnormalizado no recurso pai, não da lista.

A lógica fica num helper compartilhado (ex.: `app/utils/cursor_pagination.ts`) usado pelos services, para que cada endpoint não reimplemente codificação, comparação e `limit + 1`. Cada endpoint paginado documenta `limit`, `cursor` e o `meta` no OpenAPI (ADR-0027) por meio de um schema reutilizável.

### O que não muda

- A paginação por offset dos ADR-0026 e ADR-0028 continua válida para as tabelas de gestão, com o envelope padrão do Lucid (`meta.total`, `meta.currentPage`, `meta.lastPage`…).
- As listas pequenas e limitadas de catálogos podem continuar sem paginação enquanto forem pequenas.

## Justificativa

- **Atende os NF 2.2 e 2.3 literalmente:** cursor por timestamp/ID e no máximo 20 itens por requisição.
- **Sem duplicação nem buraco** quando chegam itens novos no topo do feed, o que é o caso normal numa rede social.
- **Custo constante por página:** a comparação de tupla usa o índice e não depende de quantas páginas o usuário já rolou. Isso importa para o NF 2.5 (1.000 usuários simultâneos).
- **UUID v7 favorece o keyset:** a chave primária já é ordenada no tempo e serve de desempate sem coluna extra.
- **Encaixa no cliente:** o `useInfiniteQuery` do TanStack Query (ADR-0002 do frontend) consome `meta.nextCursor` diretamente.
- **Offset onde ele é melhor:** o admin precisa de total e de salto de página, e as listas dele são filtradas e menores.

## Alternativas Consideradas

**1. Offset em todas as listas (manter os exemplos atuais)**

Mais simples e já previsto nos ADRs. Contraria o NF 2.2, que pede cursor, duplica e pula itens em feeds com inserção contínua e degrada com a profundidade. Descartada para listas de usuário final.

**2. Cursor em todas as listas, inclusive no admin**

Um contrato só, mas o painel perderia total e "ir para a página N", que as telas de gestão usam. Descartada.

**3. Cursor transparente (ex.: `?before=<id>`)**

Mais fácil de depurar, mas expõe a implementação. Mudar a ordenação ou a chave depois quebraria clientes. O cursor opaco permite mudar a codificação sem mudar o contrato. Descartada.

**4. Cursor só pelo `id` UUID v7**

Funciona enquanto a ordem for por criação, mas não serve para listas ordenadas por outra coluna (data em que seguiu, destaque de campanha). O par `(coluna, id)` cobre todos os casos com a mesma regra. Descartada como regra geral.

## Consequências (Trade-offs)

### Positivas / Benefícios

- Contrato único e documentado para todas as listas incrementais, pronto antes de os endpoints sociais serem escritos.
- Desempenho previsível no feed, independentemente da profundidade.
- O frontend implementa rolagem infinita e "Carregar mais" sem lógica de deduplicação.

### Negativas / Riscos

- **Dois padrões de paginação** na mesma API. Mitigação: a tabela da Decisão define qual usar, e os schemas do OpenAPI deixam explícito em cada endpoint.
- **Sem "ir para a página N" e sem total** nas listas por cursor. Contagens exibidas exigem contadores desnormalizados, com a manutenção que isso implica (atualizar no follow/unfollow, de forma transacional, NF 5.2).
- **Índices compostos** precisam ser criados para cada ordenação usada, e revisados quando surgir uma ordem nova.
- **Itens editados ou apagados** entre páginas não reaparecem nem geram buraco, mas uma página já carregada pode mostrar um item apagado até o cliente revalidar.

## Referências

- [Site de requisitos](https://missionappfaithtech.github.io/MissionAppRequirementsList/): NF 2.2 (key cursor), NF 2.3 (máximo de 20 itens por requisição), NF 2.5, RF 4.4.2, 5.3.1, 10.4, 10.6, 11.6, 14
- [ADR-0021](./0021-adocao-de-uuid-v7-como-estrategia-de-chave-primaria.md): UUID v7 ordenado no tempo, usado como desempate
- [ADR-0026](./0026-adocao-do-adonis-lucid-filter-para-filtragem-de-queries.md) e [ADR-0028](./0028-arquitetura-de-validators-reutilizaveis-com-vinejs.md): paginação por offset, mantida para o admin
- [ADR-0034](./0034-envelope-de-erro-unico-com-codigo.md): formato do erro de cursor inválido
- [ADR-0002 do frontend](https://github.com/MissionAppFaithTech/MissionAppFrontend/blob/main/docs/architecture/decisions/0002-adocao-do-tanstack-query-para-estado-de-servidor.md): consumo do `meta.nextCursor` com `useInfiniteQuery`
- [Use The Index, Luke — Paging Through Results](https://use-the-index-luke.com/no-offset): por que keyset escala e offset não
- [PostgreSQL — Row Constructor Comparison](https://www.postgresql.org/docs/current/functions-comparisons.html#ROW-WISE-COMPARISON): comparação de tupla usada no keyset

# [ADR-0033]: Paginação por Cursor para Feeds e Listas Incrementais

## Dados

- **Status:** 🟢 Aceito
- **Data:** 2026-11-01
- **Revisão:** 2026-11-22, contadores desnormalizados com buffer no Dragonfly (seção própria na Decisão)
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

### Contadores desnormalizados (buffer no Dragonfly)

Os números exibidos (`users.followers_count`, `users.following_count`, `posts.likes_count`) não são atualizados na transação do follow/like. Num perfil popular, um `UPDATE … SET followers_count = followers_count + 1` por clique serializa todas as escritas na mesma linha (linha quente) e vira o gargalo justamente nos picos (NF 2.5). Por isso as **relações são transacionais e os contadores são eventualmente consistentes**:

1. **Escrita.** O service grava a relação direto no PostgreSQL de forma idempotente: `INSERT … ON CONFLICT (follower_id, following_id) DO NOTHING RETURNING id` (unique `uq_followers_follower_id_following_id`; em curtidas, `uq_likes_user_id_post_id`) e `DELETE … RETURNING id`. Só quando a linha mudou de fato ele faz `HINCRBY` do delta no Dragonfly (ADR-0007), **dentro da transação e antes do commit**. Cliques repetidos ou simultâneos não contam duas vezes, e o caminho de escrita nunca faz `UPDATE` em `users` nem em `posts`. Dragonfly fora do ar desfaz a transação (fail-closed), então nunca existe relação sem o delta correspondente.
2. **Chaves.** Um hash por contador, campo = id da entidade, valor = delta: `counter:pending:<alvo>` recebe os incrementos e `counter:processing:<alvo>` guarda o que um flush está aplicando (`user_followers`, `user_following`, `post_likes`). Só `CounterBufferService` conhece as chaves.
3. **Flush** (`queue:counters-sync`, a cada 10 s). Com o lock `counter:sync:lock` (`SET NX EX` com token), para cada alvo: um script Lua move atomicamente o pendente para o de processamento (incrementos novos caem num hash novo, sem perda; se sobrou processamento de um flush que caiu, soma em vez de sobrescrever); aplica tudo numa transação com `UPDATE t SET col = GREATEST(t.col + v.delta, 0) FROM (VALUES …) v(id, delta)` em lotes de 500, ids ordenados; e só depois do commit apaga o hash de processamento.
4. **Semântica de falha.** Queda antes do commit: o processamento fica e é reaplicado no flush seguinte. Queda entre o commit e o `DEL` (milissegundos): aquele lote é aplicado de novo, ou seja, entrega **pelo menos uma vez**; a reconciliação corrige.
5. **Reconciliação** (diária, 04:30). Percorre cada tabela por keyset em blocos de 1.000, segurando o lock do flush em cada bloco: compara o valor gravado com `COUNT(*)` da relação, pula ids que têm delta pendente ou em processamento e corrige os demais. Também cobre o que não gera delta: remoção em cascata (usuário ou post apagado não decrementa o outro lado) e o `GREATEST` que trava em 0.
   - **Por que não há corrida:** uma relação R grava o delta em `ta` e faz commit em `tb`, com `ta < tb`. O bloco conta em `s1` e lê os ids sujos em `s2 > s1`, sem flush no meio (lock). Se `ta < s2`, o id está sujo e é pulado. Se `ta > s2`, então `tb > s1`: o `COUNT(*)` não viu R e o flush soma R depois. Nos dois casos o valor final fica certo.
6. **Leitura.** O valor exibido é `max(banco + pendente + processamento, 0)`, lido com `HMGET` por página ou perfil, para quem clicou ver o número mudar na hora. Em erro do Dragonfly a leitura é fail-open: mostra o valor do banco. Entre o commit de um flush e o `DEL` pode haver sobrecontagem por milissegundos (aceita).
7. **Perfil público.** Mudança de contador não dispara `PublicProfileChanged`: o atraso do cache do site já é aceito pelo ADR-0037. O estado "eu sigo" fica fora do perfil público, que é compartilhado entre visitantes (ADR-0036), e vem de `GET /users/{id}/follow`.

Um evento de domínio futuro (ex.: `UserFollowed`, para notificação) deve ser emitido após o commit e só quando `RETURNING` devolveu linha.

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

### Alternativas para os contadores desnormalizados

**5. `UPDATE` do contador na mesma transação do follow/like**

Consistência imediata, mas cada clique trava a linha do perfil ou do post até o commit. Num missionário popular, em pico, as escritas se enfileiram nessa linha. Descartada.

**6. Trigger no PostgreSQL**

Mantém o contador sem código na aplicação, mas tem o mesmo problema de linha quente da alternativa 5 e esconde a regra fora do código versionado com o service. Descartada.

**7. `COUNT(*)` na leitura**

Sempre correto, mas custa proporcional ao número de seguidores em cada exibição de perfil e card de post. Contraria o objetivo de não usar `COUNT(*)` em tabelas grandes. Descartada.

**8. Dragonfly como fonte da verdade do contador**

Mais simples (só `INCR`), mas o cache é volátil: perder os dados do Dragonfly perderia o contador. No desenho adotado o banco é a fonte da verdade e o Dragonfly guarda só deltas de no máximo alguns segundos. Descartada.

**9. Flush com entrega exatamente uma vez (tabela-livro de lotes)**

Gravar um `batch_id` na mesma transação do flush e ignorar lotes já aplicados elimina a reaplicação rara, ao custo de uma tabela e uma escrita a mais por lote. A janela de reaplicação é de milissegundos e a reconciliação diária já corrige. Descartada por custo/benefício.

## Consequências (Trade-offs)

### Positivas / Benefícios

- Contrato único e documentado para todas as listas incrementais, pronto antes de os endpoints sociais serem escritos.
- Desempenho previsível no feed, independentemente da profundidade.
- O frontend implementa rolagem infinita e "Carregar mais" sem lógica de deduplicação.

### Negativas / Riscos

- **Dois padrões de paginação** na mesma API. Mitigação: a tabela da Decisão define qual usar, e os schemas do OpenAPI deixam explícito em cada endpoint.
- **Sem "ir para a página N" e sem total** nas listas por cursor. Contagens exibidas exigem contadores desnormalizados, com a manutenção que isso implica: relação transacional, contador eventualmente consistente via buffer no Dragonfly, worker `queue:counters-sync` rodando em deploy (ADR-0017) e reconciliação diária.
- **Contador pode atrasar ou divergir por pouco tempo:** até um ciclo de flush no banco (a resposta da API compensa somando os deltas) e, em falha rara do flush, até a próxima reconciliação.
- **Índices compostos** precisam ser criados para cada ordenação usada, e revisados quando surgir uma ordem nova.
- **Itens editados ou apagados** entre páginas não reaparecem nem geram buraco, mas uma página já carregada pode mostrar um item apagado até o cliente revalidar.

## Referências

- [Site de requisitos](https://missionappfaithtech.github.io/MissionAppRequirementsList/): NF 2.2 (key cursor), NF 2.3 (máximo de 20 itens por requisição), NF 2.5, RF 4.4.2, 5.3.1, 10.4, 10.6, 11.6, 14
- [ADR-0007](./0007-adocao-do-dragonfly-como-cache-e-armazenamento-temporario.md): Dragonfly para contadores de seguidores e curtidas
- [ADR-0017](./0017-padrao-imagem-unica-multiplos-entrypoints-para-workers.md): o worker `queue:counters-sync` é mais um entrypoint da mesma imagem
- [ADR-0036](./0036-perfil-publico-anonimo-e-orcamento-de-rate-limit-do-servidor-do-bff.md) e [ADR-0037](./0037-api-avisa-o-site-para-descartar-o-cache-do-perfil-publico.md): perfil público cacheado e atraso aceito dos contadores
- [ADR-0021](./0021-adocao-de-uuid-v7-como-estrategia-de-chave-primaria.md): UUID v7 ordenado no tempo, usado como desempate
- [ADR-0026](./0026-adocao-do-adonis-lucid-filter-para-filtragem-de-queries.md) e [ADR-0028](./0028-arquitetura-de-validators-reutilizaveis-com-vinejs.md): paginação por offset, mantida para o admin
- [ADR-0034](./0034-envelope-de-erro-unico-com-codigo.md): formato do erro de cursor inválido
- [ADR-0002 do frontend](https://github.com/MissionAppFaithTech/MissionAppFrontend/blob/main/docs/architecture/decisions/0002-adocao-do-tanstack-query-para-estado-de-servidor.md): consumo do `meta.nextCursor` com `useInfiniteQuery`
- [Use The Index, Luke — Paging Through Results](https://use-the-index-luke.com/no-offset): por que keyset escala e offset não
- [PostgreSQL — Row Constructor Comparison](https://www.postgresql.org/docs/current/functions-comparisons.html#ROW-WISE-COMPARISON): comparação de tupla usada no keyset

# [ADR-0042]: Busca de Catálogos Tolerante a Erros no Elasticsearch

## Dados

- **Status:** 🟢 Aceito
- **Data:** 2026-11-05
- **Proponentes:** [Pedro Amaro](https://github.com/Amaro-peter)
- **Complementa:** [ADR-0041](./0041-busca-e-deduplicacao-de-catalogos-com-coluna-normalizada-unaccent-e-pg-trgm.md), [ADR-0009](./0009-adocao-do-elasticsearch-como-mecanismo-de-busca.md)

---

## Contexto e Problema

O ADR-0041 tornou a busca de agências missionárias e comunidades de fé indiferente a acentos e maiúsculas, mas ela ainda exigia o termo **exato**: o nome tinha de começar com ele ou contê-lo inteiro. No banco de desenvolvimento:

- `jocun brasil` e `jovens missao` não achavam "JOCUM Brasil (Jovens Com Uma Missão)" (letra errada, palavras faltando);
- `igrja` e `batsita` não achavam as igrejas batistas (letra faltando, letras invertidas).

O autocomplete do cadastro depende dessa busca, e quem não acha a própria agência tende a cadastrá-la de novo. O lançamento prevê cerca de **3 mil igrejas**, com crescimento depois disso.

**Como sugerir os itens certos mesmo com erros de digitação e palavras faltando ou fora de ordem, sem carregar o catálogo inteiro e sem percorrer a tabela a cada letra digitada?**

## Decisão

1. **Elasticsearch como busca principal** dos dois catálogos, para termos com 3 ou mais caracteres (`CATALOG_FUZZY_MIN_LENGTH`). O PostgreSQL continua sendo a fonte de verdade:
   - o índice guarda só os campos que a busca usa (`name`, `city`, `state`, `country`);
   - a busca devolve só IDs, e os registros vêm do banco na ordem do Elasticsearch (`search_catalog.ts`). Um ID que não existe mais no banco é descartado.
2. **Índice** (`catalog_search_service.ts`), um por catálogo, atrás de um alias (`catalog_missionary_agencies`, `catalog_faith_communities`):
   - **Análise:** `lowercase` + `asciifolding`, como o `catalog_normalize` do banco.
   - **`name`:** texto para a busca aproximada.
   - **`name.prefix`:** edge n-grams de 2 a 20 letras, para o autocomplete achar "jove" em "Jovens".
   - **`name.sort`:** keyword normalizado, para ordenar e pontuar quem começa com o termo.
   - **Localidade:** só filtra.
   - **Configuração:** mapping `strict`, 1 shard e `auto_expand_replicas: 0-1`.
3. **Consulta:**
   - **Cada palavra digitada (até 5) é obrigatória, em qualquer ordem.** Uma palavra casa de dois jeitos:
     - com até 1 ou 2 letras erradas (`fuzziness: AUTO`: 0 edições para palavras de 1–2 letras, 1 para 3–5, 2 para 6 ou mais; a inversão de duas letras conta como 1 edição);
     - como começo de uma palavra do nome.
   - **Pontuação:** começa com o termo (×8) → contém a frase (×4) → tem as palavras exatas (×2). O desempate é pelo nome.
4. **Escrita na hora, com fila de reserva** (`syncCatalogSearchAfterCommit`):
   - criar, editar e remover levam a mudança ao índice **depois do commit** (`trx.after('commit')`), com `refresh: wait_for`;
   - o item do "+ Adicionar" já aparece na próxima busca, e um rollback nunca chega ao índice;
   - vale também para o item criado dentro da transação do cadastro de missionário;
   - se o Elasticsearch falhar, a operação no banco não falha: um job `index-catalog-item` na fila `search-indexing` (5 tentativas, backoff exponencial) relê o item no banco e o indexa ou o remove.
   - A escrita usa `require_alias`: sem o índice criado, não cria um índice vazio com mapping dinâmico.
5. **Reconstrução sem buraco** (`node ace search:reindex-catalogs`, também em `just start` e no deploy):
   - cria `<alias>_<timestamp>` e carrega o banco em lotes de 500;
   - troca o alias numa única operação atômica e apaga os índices antigos.
6. **Reserva no PostgreSQL:** com o Elasticsearch fora do ar ou sem índice, a busca usa a versão tolerante a erros no banco (`applySearchFilters`). Essa versão casa as palavras em qualquer ordem, por trecho, por semelhança `pg_trgm` ≥ 0,45 ou por até 1–2 edições com `levenshtein_less_equal` (extensão `fuzzystrmatch`). Os resultados são os mesmos; a reserva só fica mais lenta em catálogos grandes. A troca para a reserva é registrada como aviso no log.
7. **Isolamento por ambiente:** `ELASTIC_INDEX_PREFIX` prefixa os aliases, com `test_` nos testes e `e2e_` na suíte E2E do frontend. Assim, todos usam o mesmo cluster local sem tocar nos índices de desenvolvimento.

Termos de 1 ou 2 caracteres e a listagem sem termo continuam no PostgreSQL (prefixo no B-tree, ADR-0041). O contrato não muda (`search`, `limit`, `meta.hasMore`), nem o cache do BFF no frontend.

## Justificativa

- **Medições com 50 mil itens sintéticos** (nomes de 5 palavras, Elasticsearch 9.4 com um nó, mediana de 10 execuções):

  | Abordagem                                                                                                             | Tempo      |
  | --------------------------------------------------------------------------------------------------------------------- | ---------- |
  | Busca tolerante a erros no PostgreSQL (o Levenshtein por palavra impede o índice e força a leitura da tabela inteira) | ≈ 515 ms   |
  | PostgreSQL com o GIN de trigramas filtrando antes                                                                     | ≈ 45 ms    |
  | **Elasticsearch**                                                                                                     | **5–8 ms** |

  No Elasticsearch, "batsita lagoina" levou 8 ms, "igrja batista" e "lagoinha" levaram 5 ms, e termos sem resultado, 1 ms. Nos três primeiros, "Igreja Batista da Lagoinha" veio em 1º lugar. O tempo cresce pouco com o volume, ao contrário da leitura sequencial.

- **Medições no banco de desenvolvimento** (`word_similarity`), que justificam o limiar da reserva:

  | Termo     | Melhor resultado | Nota                         |
  | --------- | ---------------- | ---------------------------- |
  | `jocun`   | JOCUM            | 0,67                         |
  | `lagoina` | Lagoinha         | 0,75                         |
  | `tribus`  | Tribos           | 0,57                         |
  | `igrja`   | Igreja           | 0,50                         |
  | `batsita` | Batista          | 0,38, por isso o Levenshtein |

  O ruído fica abaixo do limiar: `jocun` contra "Junta de Missões" dá 0,17.

- **Por que IDs e não `_source`:** o banco continua sendo a única fonte dos dados exibidos (pastores, telefone, endereço). Um documento desatualizado no índice no máximo muda a ordem, nunca o conteúdo.
- **Por que exigir todas as palavras:** mantém a lista curta e relevante. Casar qualquer palavra traria todo item com "igreja" ou "missão".
- **Por que escrever na hora e não só pela fila** (como missionários, ADR-0009): o autocomplete precisa achar o item recém-cadastrado. A fila fica só como reserva, para que uma falha do Elasticsearch não derrube o cadastro.

## Alternativas Consideradas

- **Só PostgreSQL** (`pg_trgm` + `fuzzystrmatch`, a primeira versão deste ADR). Não precisa de infraestrutura nova, mas a leitura da tabela inteira cresce linearmente (≈ 100 ms com 10 mil itens). Filtrar antes pelo índice de trigramas reduz isso para ≈ 45 ms com 50 mil itens, mas ainda é uma ordem de grandeza acima do Elasticsearch e perde sinônimos e análise de idioma no futuro. Ficou como reserva.
- **Fuse.js / MiniSearch no navegador.** Só buscam no que já está no cliente: exigiriam baixar o catálogo inteiro, o oposto do ADR-0041. Aplicados aos 10 resultados do servidor, não recuperam o que o servidor não devolveu.
- **Fuse.js no BFF do Next.** Manteria o catálogo inteiro na memória de cada instância, com invalidação a cada cadastro, e duplicaria a lógica de busca.
- **Indexar só pela fila.** É mais simples e uniforme com a indexação de missionários, mas o item novo só aparece quando o worker processa o job e depende dos workers estarem rodando.

## Consequências (Trade-offs)

### Positivas / Benefícios

- O autocomplete acha o item com erros comuns de digitação e palavras faltando ou fora de ordem, o que reduz cadastros duplicados.
- Responde em poucos milissegundos com dezenas de milhares de itens, e o caminho fica aberto para sinônimos, siglas ("JMN") e análise de português.
- O banco continua sendo a fonte de verdade, e a busca continua funcionando com o Elasticsearch fora do ar.

### Negativas / Riscos

- Mais um ponto de sincronização. Se a escrita na hora e as 5 tentativas da fila falharem, o índice fica desatualizado até a próxima reconstrução (`search:reindex-catalogs`). Escritas feitas durante uma reconstrução podem se perder pelo mesmo motivo; se isso ocorrer, rodar a reconstrução de novo resolve.
- Itens gravados fora dos services (seeders, SQL manual) só entram no índice pela reconstrução.
- O deploy precisa rodar `search:reindex-catalogs`. Até lá, a busca usa o PostgreSQL.
- A reserva no PostgreSQL percorre a tabela inteira e fica lenta com catálogos grandes. Ela é aceitável como contingência, não como caminho principal.
- Palavras de 3 a 5 letras aceitam 1 edição, o que pode trazer itens pouco relacionados quando o termo é curto. Exigir todas as palavras limita o efeito.
- A busca por trecho no meio de uma palavra ("goinha" em "Lagoinha") só existe na reserva. No Elasticsearch, a palavra casa pelo começo ou com até 1–2 letras erradas.

## Referências

- [Elasticsearch — fuzziness](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/common-options#fuzziness)
- [Elasticsearch — edge n-gram token filter](https://www.elastic.co/docs/reference/text-analysis/analysis-edgengram-tokenfilter)
- [Elasticsearch — aliases](https://www.elastic.co/docs/manage-data/data-store/aliases)
- [PostgreSQL — pg_trgm (`word_similarity`)](https://www.postgresql.org/docs/18/pgtrgm.html)
- [PostgreSQL — fuzzystrmatch (`levenshtein_less_equal`)](https://www.postgresql.org/docs/18/fuzzystrmatch.html)
- [ADR-0009](./0009-adocao-do-elasticsearch-como-mecanismo-de-busca.md), [ADR-0041](./0041-busca-e-deduplicacao-de-catalogos-com-coluna-normalizada-unaccent-e-pg-trgm.md)

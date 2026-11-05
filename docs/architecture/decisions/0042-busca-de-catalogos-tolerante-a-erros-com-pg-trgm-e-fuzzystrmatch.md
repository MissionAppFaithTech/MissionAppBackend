# [ADR-0042]: Busca de Catálogos Tolerante a Erros com pg_trgm e fuzzystrmatch

## Dados

- **Status:** 🟢 Aceito
- **Data:** 2026-11-05
- **Proponentes:** [Pedro Amaro](https://github.com/Amaro-peter)
- **Complementa:** [ADR-0041](./0041-busca-e-deduplicacao-de-catalogos-com-coluna-normalizada-unaccent-e-pg-trgm.md)

---

## Contexto e Problema

O ADR-0041 fez a busca de agências missionárias e comunidades de fé ignorar acentos e maiúsculas, mas ela ainda exigia o termo **exato**: o nome tinha de começar com ele ou contê-lo inteiro. No banco de desenvolvimento:

- `jocun brasil` e `jovens missao` não achavam "JOCUM Brasil (Jovens Com Uma Missão)" (letra errada; palavras faltando);
- `igrja` e `batsita` não achavam as igrejas batistas (letra faltando; letras invertidas).

O autocomplete do cadastro depende dessa busca: quem não acha a própria agência tende a cadastrá-la de novo. **Como sugerir os itens certos mesmo com erros de digitação, palavras faltando ou fora de ordem, sem carregar o catálogo inteiro?**

## Decisão

Para termos de 3 ou mais caracteres (os de 2 continuam por prefixo, ADR-0041), numa única consulta em `applySearchFilters`:

1. **Cada palavra digitada precisa casar com o nome, em qualquer ordem.** O termo normalizado é quebrado nas palavras (sem pontuação, sem repetidas, até 5: `CATALOG_SEARCH_MAX_WORDS`). Palavras que faltam no termo não atrapalham.
2. **Uma palavra casa** quando:
   - tem 1–2 letras e o nome a contém; ou
   - tem 3 ou mais e (a) o nome a contém, (b) `word_similarity(palavra, name_normalized) >= 0,45` (`CATALOG_FUZZY_MIN_SIMILARITY`, do `pg_trgm`: letras faltando ou trocadas), ou (c) alguma palavra do nome está a até N edições por `levenshtein_less_equal` (extensão `fuzzystrmatch`), com N = 1 para 3–5 letras e N = 2 para 6 ou mais (`catalogMaxEdits`).
3. **Ordenação por relevância:** começa com o termo → contém o termo inteiro → maior soma de `word_similarity` das palavras → nome e id.
4. O contrato não muda (`search`, `limit`, `meta.hasMore`), nem o cache do BFF no frontend.

## Justificativa

- **Medições no banco de desenvolvimento** (`word_similarity`): `jocun` → JOCUM 0,67; `lagoina` → Lagoinha 0,75; `tribus` → Tribos 0,57; `igrja` → Igreja 0,50; `batsita` → Batista **0,38**. O ruído fica abaixo: `jocun` → "Junta de Missões" 0,17. O limite de 0,45 aceita os erros comuns e descarta o ruído (o padrão do `pg_trgm`, 0,6, perderia `igrja` e `tribus`).
- **Por que o Levenshtein:** o trigrama pontua mal letras invertidas (`batsita`). O `levenshtein` do PostgreSQL conta uma inversão como 2 edições, por isso 2 edições a partir de 6 letras — as mesmas faixas do `fuzziness: AUTO` do Elasticsearch (0 até 2 letras, 1 até 5, 2 depois).
- **Por que todas as palavras:** exigir cada palavra mantém a lista curta e relevante; casar qualquer palavra traria todo item com "igreja" ou "missão".
- **Custo medido** (`EXPLAIN ANALYZE`, termo de uma palavra, nomes com 5 palavras): catálogos da seed 0,4 ms; tabela sintética com 5 mil linhas ≈ 50 ms, 10 mil ≈ 100 ms, 20 mil ≈ 200 ms, 50 mil ≈ 500 ms. O `OR` com o Levenshtein por palavra impede o uso dos índices, então a busca lê a tabela inteira (crescimento linear). Com os catálogos atuais (dezenas de itens) e o cache por termo no BFF, é aceitável.

## Alternativas Consideradas

- **Elasticsearch** ([ADR-0009](./0009-adocao-do-elasticsearch-como-mecanismo-de-busca.md)). Tem `fuzziness` com inversões nativas e escala melhor, mas exige indexar e sincronizar os catálogos (evento, fila, reindexação) e é eventualmente consistente: um item recém-cadastrado pelo "+ Adicionar" demoraria a aparecer. Desproporcional para tabelas pequenas.
- **Fuse.js / MiniSearch no navegador.** Só buscam no que já está no cliente: exigiriam baixar o catálogo inteiro, o oposto da busca no servidor do ADR-0041. Aplicados aos 10 resultados do servidor, não recuperam o que o servidor não devolveu.
- **Fuse.js no BFF do Next.** Manteria o catálogo inteiro na memória de cada instância, com invalidação a cada cadastro, e duplicaria a lógica de busca fora do banco.
- **Só trigrama.** Mais simples, mas não acha letras invertidas.

## Consequências (Trade-offs)

### Positivas / Benefícios

- O autocomplete acha o item com erros comuns de digitação, palavras faltando ou fora de ordem, o que reduz cadastros duplicados.
- Tudo numa consulta, no banco, com a mesma normalização da deduplicação; contrato e frontend inalterados.

### Negativas / Riscos

- Mais uma extensão (`fuzzystrmatch`, contrib do PostgreSQL), instalada pela migration.
- Leitura sequencial da tabela a cada termo novo: **reavaliar ao passar de ~10 mil itens em um catálogo** (≈ 100 ms). Caminhos: pré-filtrar pelo índice de trigramas (`<%` com `pg_trgm.word_similarity_threshold`) e deixar o Levenshtein só para quando ele não achar nada, ou migrar a busca para o Elasticsearch.
- Resultados aproximados podem trazer itens pouco relacionados quando o termo é curto (3–5 letras aceitam 1 edição); exigir todas as palavras limita o efeito.

## Referências

- [PostgreSQL — pg_trgm (`word_similarity`)](https://www.postgresql.org/docs/18/pgtrgm.html)
- [PostgreSQL — fuzzystrmatch (`levenshtein_less_equal`)](https://www.postgresql.org/docs/18/fuzzystrmatch.html)
- [Elasticsearch — fuzziness AUTO](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/common-options#fuzziness)
- [ADR-0009](./0009-adocao-do-elasticsearch-como-mecanismo-de-busca.md), [ADR-0041](./0041-busca-e-deduplicacao-de-catalogos-com-coluna-normalizada-unaccent-e-pg-trgm.md)

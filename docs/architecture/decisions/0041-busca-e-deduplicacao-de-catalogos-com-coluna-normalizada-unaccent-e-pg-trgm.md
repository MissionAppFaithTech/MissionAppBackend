# [ADR-0041]: Busca e Deduplicação de Catálogos com Coluna Normalizada, unaccent e pg_trgm

## Dados

- **Status:** 🟢 Aceito
- **Data:** 2026-11-05
- **Proponentes:** [Pedro Amaro](https://github.com/Amaro-peter)
- **Complementado por:** [ADR-0042](./0042-busca-de-catalogos-tolerante-a-erros-com-pg-trgm-e-fuzzystrmatch.md) (busca tolerante a erros)

---

## Contexto e Problema

Agências missionárias e comunidades de fé são catálogos escolhidos no cadastro de missionário, no "Sobre" e nas configurações da conta. Até aqui:

- `GET /missionary-agencies` e `GET /faith-communities` devolviam **todos** os registros que casavam com o filtro, sem limite, e o frontend carregava a lista inteira num `<select>`.
- A busca usava `ILIKE '%termo%'`, que ignora maiúsculas mas **não acentos** (`missoes` não achava `Missões`), sobre um B-tree simples em `name`, que esse padrão não aproveita (varredura sequencial).
- A deduplicação no cadastro (`find_catalog_duplicate.ts`) normalizava o nome em tempo de execução com `translate()` (a extensão `unaccent` não estava instalada), também sem índice, e só um advisory lock evitava duplicatas concorrentes — a regra não era garantida pelo banco.
- Busca e deduplicação tinham **duas** definições de "mesmo nome" (o `translate()` em SQL e o `normalizeCatalogKey` em JS), que podiam divergir.

O frontend passa a usar um autocomplete com busca no servidor. A questão é: **como buscar e deduplicar catálogos de forma eficiente, sem distinção de acentos e maiúsculas, com uma só definição de normalização e sem carregar a tabela inteira, conforme os catálogos crescem?**

## Decisão

1. **Normalização no banco, numa só função.** As extensões `unaccent` e `pg_trgm` são instaladas, e `catalog_normalize(text)` (IMMUTABLE) aplica `unaccent` com o dicionário qualificado (`public.unaccent`), minúsculas, `btrim` e espaços únicos. É a única definição de "mesmo nome" para busca e deduplicação.
2. **Colunas geradas** `name_normalized` e `city_normalized` (`GENERATED ALWAYS AS (...) STORED`) nas duas tabelas: o banco as mantém, nenhum código grava nelas.
3. **Índices** sobre as colunas normalizadas:
   - GIN `gin_trgm_ops` em `name_normalized`: busca por trecho (`LIKE '%termo%'`) com 3 ou mais caracteres;
   - B-tree `text_pattern_ops` em `name_normalized`: busca por prefixo (`LIKE 'termo%'`) e ordenação;
   - único em (`name_normalized`, `city_normalized`): a deduplicação passa a ser **garantida pelo banco**, inclusive sob concorrência. O B-tree antigo em `name` é removido.
4. **Busca** (`applySearchFilters` + `paginateCatalog`, compartilhados pelos dois catálogos):
   - `search` com no mínimo 2 caracteres (validator);
   - 2 caracteres: começa com o termo; 3 ou mais: contém o termo, com quem começa com ele primeiro; depois ordem alfabética;
   - `limit` padrão 10, máximo 20 (NF 2.3), lendo `limit + 1` para responder `meta.hasMore`; sem `search`, só a primeira página;
   - resposta `{ data: { missionaryAgencies | faithCommunities }, meta: { hasMore } }` — compatível com a lista anterior.
5. **Deduplicação** compara `name_normalized = catalog_normalize(?)` e a cidade, usando o índice único. O advisory lock continua: serializa cadastros do mesmo nome para que o segundo **reaproveite** o registro em vez de receber um `23505`, que abortaria a transação do cadastro de missionário.
6. **Sem cache de resposta no backend:** com os índices, a consulta é barata. O cache fica no frontend: `use cache` no BFF do Next, chaveado pelo termo normalizado e invalidado (`updateTag`) quando um item é criado, mais TanStack Query no navegador.
7. **Cota própria para a busca cacheada no Next.** A função com `use cache` não lê o IP do usuário, então chama a API como servidor do BFF autenticado, sem `x-missionapp-client-ip`. Como no perfil público ([ADR-0036](./0036-perfil-publico-anonimo-e-orcamento-de-rate-limit-do-servidor-do-bff.md)), esse tráfego usa a chave `rate_limit:public_catalog:<catálogo>:bff_server`, com 600 requisições por minuto, sem consumir os 20/min por IP de nenhum visitante. O BFF limita cada IP antes de buscar um termo novo; os pedidos com IP repassado continuam nos 20/min por IP.

## Justificativa

- **Por que coluna gerada, e não índice funcional sobre `catalog_normalize(name)`:** o índice funcional só é usado se cada query repetir a expressão exatamente igual; a coluna dá um nome estável à normalização (queries legíveis, sem risco de divergência) e serve ao mesmo tempo à busca, à ordenação e à constraint única. O custo é pouco espaço por linha.
- **Por que `pg_trgm` + `text_pattern_ops`:** o GIN de trigramas atende `LIKE '%termo%'` em qualquer posição, que é como as pessoas buscam ("lagoinha" em "Igreja Batista da Lagoinha"). Termos de 2 caracteres não geram trigramas úteis; para eles, o prefixo no B-tree `text_pattern_ops` é eficiente e mais relevante para o autocomplete.
- **Por que `unaccent` com dicionário qualificado:** `unaccent()` é STABLE (depende do dicionário em uso); fixando `public.unaccent`, a função pode ser IMMUTABLE, condição para coluna gerada e índice.
- **Medições** (`EXPLAIN` com `enable_seqscan = off`, para ver o índice escolhido mesmo numa tabela pequena):
  - `name_normalized LIKE '%missoes%'` → `Bitmap Index Scan on idx_missionary_agencies_name_normalized_trgm`;
  - `name_normalized LIKE 'jo%'` → `Index Scan using idx_missionary_agencies_name_normalized_prefix` (`~>=~ 'jo' AND ~<~ 'jp'`);
  - deduplicação → `Index Scan using uq_missionary_agencies_name_normalized_city_normalized`.
    `catalog_normalize(?)` é avaliada uma vez no planejamento (função IMMUTABLE sobre o parâmetro), então o termo vira constante e o índice é usado.

## Alternativas Consideradas

- **Índice funcional, sem coluna nova.** Descartada pelos motivos acima (expressão repetida em toda query; a deduplicação continuaria sem garantia do banco).
- **Elasticsearch** ([ADR-0009](./0009-adocao-do-elasticsearch-como-mecanismo-de-busca.md)). Tolera erros de digitação, mas é eventualmente consistente: um item recém-cadastrado demoraria a aparecer e não serviria à deduplicação, além de exigir evento, fila e listener para cada catálogo. O ADR-0009 trata da busca de missionários e projetos, não dos catálogos.
- **Normalização só em JS (coluna gravada pela aplicação).** Dispensaria `unaccent`, mas qualquer escrita fora do service (seed, SQL manual) deixaria a coluna desatualizada; a coluna gerada não tem esse risco.
- **Cache em Dragonfly** ([ADR-0007](./0007-adocao-do-dragonfly-como-cache-e-armazenamento-temporario.md)). Sem ganho real com consultas indexadas e termos variados, e com o custo de invalidar a cada cadastro.

## Consequências (Trade-offs)

### Positivas / Benefícios

- Busca sem distinção de acentos e maiúsculas, indexada, que nunca carrega a tabela inteira.
- Uma só definição de normalização para busca e deduplicação.
- Deduplicação garantida pelo banco mesmo sob concorrência.
- `applySearchFilters` e `paginateCatalog` são compartilhados pelos dois catálogos.

### Negativas / Riscos

- Duas extensões novas no PostgreSQL (`unaccent`, `pg_trgm`); presentes no contrib da imagem oficial e nos provedores gerenciados mais comuns, mas exigem permissão de `CREATE EXTENSION` na migration.
- Sem cursor: o autocomplete refina o termo em vez de paginar; uma tela que precise percorrer todo o catálogo precisará de cursor (ADR-0033).
- A cota de 600/min do servidor do BFF é compartilhada: termos inéditos (cache miss) de muitos usuários somam nela. O limite por IP feito no BFF e o debounce de 300 ms com mínimo de 2 caracteres no frontend reduzem o risco, mas o consumo deve ser acompanhado.
- A chave do advisory lock ainda usa a normalização em JS (`normalizeCatalogKey`); se ela divergir de `catalog_normalize` em algum caractere raro, a concorrência cai no índice único (`23505`) em vez de reaproveitar o registro.

## Referências

- [PostgreSQL — pg_trgm](https://www.postgresql.org/docs/18/pgtrgm.html)
- [PostgreSQL — unaccent](https://www.postgresql.org/docs/18/unaccent.html)
- [PostgreSQL — Generated Columns](https://www.postgresql.org/docs/18/ddl-generated-columns.html)
- [ADR-0009](./0009-adocao-do-elasticsearch-como-mecanismo-de-busca.md), [ADR-0020](./0020-convencoes-de-escrita-de-migracoes.md), [ADR-0033](./0033-paginacao-por-cursor-para-feeds-e-listas-incrementais.md), [ADR-0034](./0034-envelope-de-erro-unico-com-codigo.md)

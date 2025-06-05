# [ADR-0009]: Adoção do Elasticsearch como Mecanismo de Busca

## Dados

- **Status:** 🔵 Em Uso
- **Data:** 2026-05-30
- **Proponentes:** [Allber Ferreira](https://github.com/AFSFerreira)

---

## Contexto e Problema

O MissionApp possui um requisito explícito de busca global (Req. 11) que permite a qualquer usuário localizar missionários por nome ou nome de usuário (Req. 11.2.1) e projetos de impacto por título (Req. 11.2.2). O requisito não funcional NF.4 eleva a exigência: a busca deve ser **tolerante a erros de digitação em termos individuais** — um usuário que digita "missonario" ou "missioanrio" deve encontrar resultados relevantes mesmo com a grafia incorreta.

A combinação de busca textual com tolerância a erros não é trivial de implementar sobre um banco relacional de propósito geral:

**PostgreSQL como mecanismo de busca (tsvector / pg_trgm):**
O PostgreSQL oferece dois mecanismos de busca textual: `tsvector`/`tsquery` para full-text search com stemming, e a extensão `pg_trgm` para similaridade por trigramas (base para busca fuzzy). A avaliação de ambos revela limitações relevantes para os requisitos do MissionApp:

- O `tsvector` com dicionário `portuguese` realiza stemming morfológico, mas não tolera erros de digitação — `"missioanrio"` não encontra `"missionário"` porque o erro ocorre antes do stemming.
- O `pg_trgm` permite similaridade aproximada, mas opera com threshold de similaridade global sem controle por posição do erro no token, produzindo falsos positivos em termos curtos e falsos negativos em termos com erros nas primeiras letras.
- Ambos adicionam carga de CPU ao mesmo banco de dados transacional que processa escritas, leituras relacionais e operações financeiras — misturar carga de busca com carga transacional degrada os dois perfis de acesso.
- Relevância de resultados no PostgreSQL é binária ou baseada em rank simples (`ts_rank`) — sem controle fino sobre scoring, boosting por campo ou personalização de relevância por tipo de entidade.

**Ausência de infraestrutura dedicada para busca:**
Sem um mecanismo de busca dedicado, o crescimento do volume de missionários e projetos indexados degradaria progressivamente as queries de busca no PostgreSQL — impactando o restante da aplicação que compartilha o mesmo pool de conexões e I/O de disco.

A questão central é: **qual mecanismo de busca atende ao requisito de busca tolerante a erros de digitação (NF.4), com suporte ao idioma Português, sem sobrecarregar o banco de dados transacional?**

## Decisão

Adotaremos o **Elasticsearch** como mecanismo de busca dedicado do MissionApp.

O Elasticsearch é um mecanismo de busca e análise de dados distribuído de código aberto, desenvolvido e mantido pela Elastic. Construído sobre o Apache Lucene, é especializado em busca de texto completo (full-text search) com suporte a análise linguística por idioma (tokenização, stemming, remoção de stopwords), relevância configurável, fuzzy matching nativo baseado em distância de edição (Levenshtein) e consultas de alta complexidade sobre grandes volumes de dados. Sua API REST com payloads JSON o torna a escolha padrão da indústria para buscas que exigem mais do que um banco relacional oferece via `LIKE` ou `tsvector`.

Os seguintes índices serão mantidos no Elasticsearch:

- **`missionaries`:** campos `full_name`, `username`, `bio`, `missionary_agency_name` — com analyzer `portuguese`.
- **`projects`:** campos `title`, `description`, `missionary_username` — com analyzer `portuguese`.

A sincronização dos índices seguirá o padrão de eventos de domínio da aplicação: a camada de serviço (`app/services/`) emite um evento após concluir a operação no banco; um Listener dedicado captura o evento e enfileira um Job no BullMQ (via DragonflyDB); o worker do Job executa a indexação no Elasticsearch de forma assíncrona e com retries automáticos em caso de falha. Esse fluxo desacopla a indexação do ciclo de vida da requisição HTTP e garante resiliência a quedas temporárias do Elasticsearch — jobs não processados permanecem na fila até o serviço se recuperar. A arquitetura detalhada desse padrão será documentada em ADR próprio.

Toda requisição à rota de busca (Req. 11) consultará exclusivamente o Elasticsearch — o PostgreSQL não será envolvido no caminho de busca. Os IDs retornados pelo Elasticsearch serão usados para recuperar dados completos do PostgreSQL apenas quando necessário (ex: dados financeiros ou de perfil não indexados).

O Elasticsearch será provisionado via Docker Compose em modo single-node para desenvolvimento. Em produção, o deployment será avaliado conforme o crescimento do volume de dados indexados.

## Justificativa

O Elasticsearch foi escolhido por ser a ferramenta que atende diretamente ao conjunto de requisitos de busca do MissionApp sem comprometer a estabilidade do banco transacional:

- **Fuzzy matching nativo para NF.4:** O Elasticsearch implementa busca fuzzy baseada em distância de edição de Levenshtein, configurável por nível de erro (`fuzziness: AUTO`). Uma query com `"missioanrio"` ou `"missonario"` encontra `"missionário"` porque o mecanismo calcula a distância de edição entre o termo da query e os tokens do índice — não depende de trigramas nem de threshold global.

- **Analyzer `portuguese` com stemming configurável:** O Elasticsearch possui analyzer nativo para Português que aplica stemming morfológico (`"missionários"` → `"missionari"`), remoção de stopwords e normalização de acentos — garantindo que variações de flexão do mesmo termo retornem resultados consistentes, independentemente da forma exata digitada pelo usuário.

- **Separação entre carga de busca e carga transacional:** Ao isolar queries de busca no Elasticsearch, o PostgreSQL permanece dedicado a operações transacionais, relacionais e financeiras — sem competição por conexões, I/O ou CPU entre os dois perfis de acesso. Isso é crítico para manter o SLA de uptime de 99,5% (NF.5.1) e a integridade transacional (NF.5.2) independentemente do volume de buscas.

- **Relevância configurável por campo e tipo de entidade:** O Elasticsearch permite boosting por campo (`full_name^3`, `username^2`, `bio^1`), o que significa que um match no nome completo de um missionário recebe score maior que um match na bio — produzindo resultados mais intuitivos sem lógica customizada na aplicação.

- **Escalabilidade horizontal independente:** O volume de dados indexados cresce com o número de missionários e projetos cadastrados. O Elasticsearch escala horizontalmente (shards e réplicas) de forma independente do PostgreSQL — sem impacto no banco de dados transacional.

## Alternativas Consideradas

- **PostgreSQL full-text search (`tsvector` + `pg_trgm`):** Solução sem serviço adicional, usando capacidades nativas do banco já adotado. Descartado porque: (1) `tsvector` não tolera erros de digitação — viola diretamente o NF.4; (2) `pg_trgm` produz busca fuzzy imprecisa para termos curtos e com erros nas primeiras letras, sem controle por posição do erro; (3) mistura carga de busca com carga transacional no mesmo banco, criando competição por recursos com operações financeiras e relacionais; (4) ausência de scoring de relevância configurável por campo — a experiência de busca seria inferior à esperada pelos usuários.

- **Typesense:** Motor de busca moderno, focado em simplicidade operacional, com busca tolerante a erros por padrão e configuração mínima. Descartado porque: (1) o suporte ao idioma Português é menos maduro que o do Elasticsearch — o analyzer `portuguese` do Elasticsearch possui stemming e tratamento de acentuação superiores; (2) o ecossistema de clientes Node.js e documentação de casos de uso avançados é menor; (3) a comunidade open-source e a adoção em produção são significativamente menores, o que reduz a disponibilidade de contribuidores familiarizados com a ferramenta.

- **Meilisearch:** Motor de busca open-source com excelente DX, busca fuzzy por padrão e setup trivial. Descartado porque: (1) a configuração de analyzers por idioma é menos granular — não oferece stemming morfológico para Português comparável ao do Elasticsearch; (2) os recursos de relevância customizada (boosting por campo, scoring composto) são mais limitados; (3) foi projetado para buscas instantâneas em datasets menores — o Elasticsearch oferece mais controle para os requisitos de busca específicos por entidade (missionários vs. projetos) do MissionApp.

- **Algolia:** SaaS de busca com excelente performance, DX e suporte a múltiplos idiomas. Descartado porque: (1) é um serviço pago com custo baseado em volume de buscas e registros indexados — incompatível com o modelo open-source do MissionApp, que não pode impor dependência de serviço pago a colaboradores e deployments; (2) cria vendor lock-in a uma plataforma externa sem alternativa de auto-hospedagem.

## Consequências (Trade-offs)

### Positivas / Benefícios

- **Atendimento direto ao NF.4:** Busca tolerante a erros de digitação implementada com distância de edição de Levenshtein — comportamento consistente para qualquer variação ortográfica nos campos indexados.

- **Isolamento da carga de busca:** Queries de busca não competem com transações financeiras, escritas relacionais ou operações de auditoria no PostgreSQL — cada sistema opera no seu perfil de carga ideal.

- **Experiência de busca mais relevante:** Scoring configurável por campo (nome > username > bio) produz resultados mais intuitivos sem lógica adicional na camada de aplicação.

- **Escalabilidade independente:** O volume de buscas pode crescer sem impacto no banco transacional — a camada de busca escala separadamente conforme a plataforma cresce.

### Negativas / Riscos

- **Consistência eventual entre PostgreSQL e Elasticsearch:** O índice é uma projeção assíncrona dos dados do PostgreSQL. Mesmo com retries via BullMQ, falhas prolongadas no Elasticsearch ou perda de jobs na fila podem resultar em índice desatualizado. Uma estratégia de re-indexação periódica completa e monitoramento de divergência entre banco e índice precisa ser implementada.

- **Novo serviço no stack de desenvolvimento:** Elasticsearch tem footprint de memória significativo — recomenda-se mínimo de 1GB de heap em modo single-node. Em máquinas com recursos limitados, o stack completo (PostgreSQL + DragonflyDB + MinIO + Elasticsearch) pode impactar a experiência de desenvolvimento local.

- **Complexidade operacional em produção:** Em produção, o Elasticsearch requer monitoramento de índices, gestão de shards, alertas de saúde do cluster e estratégia de backup de índices — responsabilidades operacionais adicionais em relação ao stack atual.

- **Curva de aprendizado para mapeamentos e analyzers:** Configurar mapeamentos de índice, analyzers de idioma e estratégias de busca requer conhecimento específico do Elasticsearch. Erros de configuração no mapeamento inicial são difíceis de corrigir sem re-indexação completa.

## Referências

- [Documentação oficial do Elasticsearch](https://www.elastic.co/docs): referência principal do mecanismo de busca adotado
- [Elasticsearch — Language Analyzers (Portuguese)](https://www.elastic.co/guide/en/elasticsearch/reference/current/analysis-lang-analyzer.html#portuguese-analyzer): analyzer nativo para português, relevante para busca de conteúdo em pt-BR
- [Elasticsearch — Fuzzy Query (Levenshtein)](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-fuzzy-query.html): suporte a busca com tolerância a erros tipográficos
- [ADR-0006](./0006-adocao-do-postgresql-como-banco-de-dados.md): adoção do PostgreSQL, banco principal cujos dados serão indexados no Elasticsearch

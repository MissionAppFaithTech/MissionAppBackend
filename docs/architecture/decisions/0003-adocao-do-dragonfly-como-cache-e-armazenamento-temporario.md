# [ADR-0003]: Adoção do DragonflyDB como Cache, Armazenamento Temporário e Broker de Filas

## Dados

- **Status:** Proposto
- **Data:** 2026-05-30
- **Proponentes:** [Allber Ferreira](https://github.com/AFSFerreira)

---

## Contexto e Problema

O MissionApp Backend possui requisitos funcionais e não funcionais que impõem demandas que o PostgreSQL, usado isoladamente, não consegue atender de forma eficiente:

**Cache de dados lidos em alta frequência (NF.2.4):**
O documento de requisitos estabelece explicitamente que _"o sistema deve utilizar uma solução de caching em memória (como Redis)"_ para armazenar dados frequentemente lidos, citando três casos de uso específicos: listas de Agências Missionárias e Comunidades de Fé, contadores de Seguidores e Likes, e resultados da curadoria de projetos (Req. 5.4). Consultar o PostgreSQL a cada requisição para esses dados — que mudam raramente mas são lidos em altíssima frequência — geraria carga desnecessária e inviabilizaria o requisito de carregar os primeiros 10 itens do feed em menos de 2 segundos em conexão 4G (NF.2.2).

**Escalabilidade sob picos de uso (NF.2.5):**
O sistema deve suportar picos de 1.000 usuários simultâneos sem degradação superior a 20% no tempo de resposta. Domingos e cultos são janelas de alto tráfego previsíveis para uma plataforma missionária — feeds, contadores e projetos curados são acessados simultaneamente por um grande número de usuários. Sem cache, cada acesso representa uma query ao banco, criando gargalo de conexão e I/O.

**Rate limiting contra ataques de força bruta (NF.1.2):**
As rotas de login (Req. 1.1) e redefinição de senha (Req. 1.2) devem implementar rate limiting por IP e por janela de tempo. Rate limiting exige um contador por IP com TTL — padrão intrinsecamente inadequado para bancos relacionais, que não possuem estruturas atômicas com expiração automática.

**Processamento assíncrono e agendamento de tarefas:**
O sistema possui operações que não devem bloquear a resposta HTTP nem depender do ciclo de vida da requisição: envio de e-mail de verificação de cadastro (Req. 3.2), notificação de aprovação de missionário (Req. 5.3.2), compressão de imagens em upload (NF.2.1) e limpeza periódica de cadastros não verificados (Req. 3.2 — expiração em 7 dias). Essas operações precisam de uma fila de trabalhos (workers) e um mecanismo de cron jobs desacoplados do processo HTTP principal.

A pergunta central é: **qual solução de armazenamento em memória atende simultaneamente aos requisitos de cache de alta frequência, rate limiting e broker de filas do MissionApp, sem adicionar múltiplos serviços ao stack?**

## Decisão

Adotaremos o **DragonflyDB** como camada complementar ao PostgreSQL.

O DragonflyDB é um servidor de dados em memória de código aberto, projetado como substituto de alta performance para Redis e Memcached. Lançado em 2022, é construído sobre uma arquitetura multi-thread sem locks globais (_shared-nothing_), o que lhe permite explorar todos os núcleos disponíveis e atingir throughput significativamente superior ao Redis em hardware multi-core — mantendo compatibilidade integral com o protocolo Redis e funcionando como drop-in replacement sem alteração no código da aplicação.

Será utilizado nos seguintes casos de uso:

1. **Cache de dados quentes:** Listas de Agências Missionárias, Comunidades de Fé, resultados de curadoria de projetos (Req. 5.4) e resultados de busca frequentes — com TTL configurado por tipo de dado.

2. **Rate limiting:** Contadores de tentativas de login e redefinição de senha por IP, via padrão `INCR` + `EXPIRE`.

3. **Broker de filas e workers:** Backend para BullMQ, responsável por enfileirar e processar jobs assíncronos — envio de e-mails transacionais, compressão de imagens e outras operações fora do ciclo de requisição HTTP.

4. **Cron jobs:** Tarefas agendadas implementadas sobre BullMQ (`Queue.add` com `repeat`), como a limpeza periódica de cadastros de missionários não verificados dentro do prazo de 7 dias (Req. 3.2).

O DragonflyDB será provisionado via Docker Compose em desenvolvimento, na mesma rede do PostgreSQL. Por ser compatível com o protocolo Redis, a integração no AdonisJS utilizará `ioredis` como cliente e BullMQ para gerenciamento de filas — sem necessidade de adaptadores específicos para DragonflyDB.

## Justificativa

O DragonflyDB foi escolhido sobre o Redis canônico e demais alternativas pelos seguintes motivos:

- **Compatibilidade total com o protocolo Redis:** DragonflyDB implementa o mesmo wire protocol do Redis, o que significa que todos os clientes Redis existentes (`ioredis`, `@adonisjs/limiter`, BullMQ) funcionam sem modificação. A escolha do DragonflyDB não impõe nenhuma mudança na camada de código da aplicação em relação ao Redis.

- **Arquitetura multi-thread com melhor aproveitamento de CPU:** Redis opera em single-thread por design. O DragonflyDB utiliza múltiplas threads com modelo de execução sem locks globais (baseado em _shared-nothing_), o que resulta em throughput significativamente superior no mesmo hardware — crítico para o cenário de pico de 1.000 usuários simultâneos (NF.2.5) onde cache, rate limiting e filas de workers operam concorrentemente.

- **Eficiência de memória superior:** O DragonflyDB consome até 25x menos memória que o Redis para datasets equivalentes (conforme benchmarks oficiais), graças ao uso de estruturas de dados compactadas por padrão. Para um projeto open-source com infraestrutura de custo controlado, isso permite executar o serviço em instâncias menores sem comprometer a capacidade.

- **Estruturas de dados adequadas a cada caso de uso:** `STRING` com TTL para rate limiting; `HASH` para objetos cacheados; `LIST`/`SORTED SET` para filas BullMQ; `INCR`/`DECR` para contadores atômicos de likes e seguidores — tudo disponível nativamente e com a mesma API Redis.

- **Consolidação de responsabilidades em um único serviço:** Cache, rate limiting, armazenamento de tokens temporários e broker de filas (BullMQ) são todos atendidos pelo DragonflyDB. Sem ele, cada responsabilidade exigiria avaliação de uma solução separada, multiplicando a superfície de infraestrutura.

- **Menção explícita nos requisitos:** O NF.2.4 cita Redis nominalmente como solução esperada para caching em memória. O DragonflyDB é compatível com Redis e tecnicamente superior — atende ao espírito do requisito com vantagens adicionais.

## Alternativas Consideradas

- **Redis (canônico):** Solução de referência amplamente adotada, com ecossistema maduro, documentação extensa e suporte a todas as estruturas de dados necessárias. Descartado em favor do DragonflyDB porque: (1) opera em single-thread, o que cria gargalo de CPU quando cache, rate limiting e filas de workers processam cargas concorrentes — cenário comum em picos de tráfego; (2) consumo de memória mais elevado para o mesmo volume de dados, aumentando o custo de infraestrutura; (3) o DragonflyDB oferece as mesmas garantias com protocolo idêntico, sem nenhum custo de migração de código.

- **Cache em memória de processo (node-cache, Map nativo):** Armazenar dados cacheados diretamente na memória do processo Node.js. Descartado porque: (1) cada instância da aplicação teria seu próprio cache desincronizado — inviável para múltiplos workers ou instâncias horizontalmente escaladas; (2) o cache é perdido a cada reinicialização do processo; (3) não oferece TTL gerenciado, estruturas de fila ou rate limiting distribuído.

- **Memcached:** Solução de cache em memória simples e de alto desempenho. Descartado porque: (1) não possui estruturas de dados além de chave-valor simples — sem suporte a sorted sets, listas ou contadores atômicos necessários para BullMQ e rate limiting; (2) não suporta fila de workers; (3) o DragonflyDB e o Redis cobrem todos os casos do Memcached com estruturas adicionais.

- **PostgreSQL com extensões de fila e agendamento (pg-boss, pg_cron):** Usar o próprio banco relacional como broker de filas via extensão `pg-boss` (polling em tabela de jobs) ou `pg_cron` (scheduler interno ao PostgreSQL). Descartado porque: (1) **vendor lock-in ao banco de dados:** a lógica de agendamento passa a residir dentro do PostgreSQL, acoplando operacionalmente o scheduler ao banco — migrar ou substituir o BD implicaria reescrever toda a infraestrutura de jobs; (2) **sobrecarga do banco com tráfego não-negocial:** `pg-boss` opera por polling constante na tabela de jobs, gerando milhares de leituras e escritas por hora que competem por conexões e I/O com as queries de negócio — justamente o oposto do objetivo de desafogar o PostgreSQL; (3) **ausência de estruturas adequadas para filas:** tabelas relacionais não foram projetadas para padrões de fila de alta frequência — sem backpressure, sem prioridades eficientes, sem dead-letter queue nativo; (4) **`pg_cron` requer acesso administrativo ao banco:** a extensão é instalada como superusuário no PostgreSQL e acopla o ciclo de deploy do agendador ao ciclo de deploy do banco, dificultando ambientes de CI/CD e aumentando o risco de mudanças não rastreadas na lógica de negócio; (5) **escalabilidade independente impossível:** filas e banco de dados têm perfis de carga distintos — não é possível escalar horizontalmente apenas a camada de workers sem escalar o banco junto.

## Consequências (Trade-offs)

### Positivas / Benefícios

- **Atendimento direto ao NF.2.4:** Dados de alta leitura (agências, comunidades, contadores, curadoria) saem do PostgreSQL e entram no DragonflyDB, reduzindo diretamente a carga no banco e o tempo de resposta das rotas mais acessadas.

- **Proteção contra força bruta sem overhead de banco:** Rate limiting implementado em memória (NF.1.2), sem escrita no PostgreSQL por tentativa de login — escalável para picos de 1.000 usuários simultâneos (NF.2.5).

- **Operações assíncronas desacopladas do HTTP:** E-mails transacionais, compressão de imagens e limpeza de cadastros expirados são processados por workers BullMQ sem bloquear o ciclo de resposta da API — melhorando a percepção de responsividade (NF.3.1, feedback em menos de 100ms).

- **Cron jobs versionados no código:** O agendamento de tarefas periódicas (ex: limpeza de cadastros não verificados) vive no código da aplicação via BullMQ, não em extensões de banco — é versionado, revisado em PR e auditável como qualquer outra mudança.

- **Stack simplificada:** Um único serviço atende cache, rate limiting, tokens temporários e filas — sem necessidade de Memcached, Sidekiq, Celery ou serviço de cron separado.

### Negativas / Riscos

- **Ecossistema menor que o Redis:** DragonflyDB é mais recente que o Redis. A quantidade de artigos, tutoriais e perguntas resolvidas sobre problemas específicos é inferior. Contribuidores com experiência em Redis adaptam-se facilmente, mas documentação direta sobre DragonflyDB pode exigir leitura da documentação oficial.

- **Nova peça de infraestrutura:** DragonflyDB adiciona um serviço a operar e monitorar. Em produção, falha no DragonflyDB impacta rate limiting, cache e processamento assíncrono simultaneamente. Estratégia de fallback e healthcheck precisam ser definidos.

- **Volatilidade dos dados em memória:** Por padrão, DragonflyDB é in-memory. Sem configuração de persistência (`snapshot` ou `AOF`), dados podem ser perdidos em reinicialização inesperada — relevante especialmente para jobs enfileirados que ainda não foram processados.

- **Consistência eventual nos contadores:** Contadores de likes e seguidores mantidos no DragonflyDB e sincronizados periodicamente com o PostgreSQL podem divergir temporariamente em caso de falha na sincronização. A estratégia de reconciliação deve ser documentada na implementação.

## Referências

- [Documentação oficial do DragonflyDB](https://www.dragonflydb.io/docs)
- [Compatibilidade DragonflyDB com clientes Redis](https://www.dragonflydb.io/docs/getting-started/redis-compatibility)
- [BullMQ — filas e workers sobre Redis/DragonflyDB](https://docs.bullmq.io/)
- [NF.2.4 — Requisito explícito de caching em memória](../../../Lista%20de%20Requisitos%20Mission%20App.pdf)
- [ADR-0002 — Adoção do PostgreSQL como Banco de Dados Relacional](./0002-adocao-do-postgresql-como-banco-de-dados.md)

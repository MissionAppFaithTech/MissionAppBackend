# [ADR-0012]: Adoção de Arquitetura Orientada a Eventos com BullMQ para Operações Assíncronas

## Dados

- **Status:** 🔵 Em Uso
- **Data:** 2026-05-31
- **Proponentes:** [Allber Ferreira](https://github.com/AFSFerreira)

---

## Contexto e Problema

O MissionApp Backend executa operações que produzem efeitos colaterais além da transação relacional principal: indexação no Elasticsearch após criação ou atualização de missionários e projetos (Req. 11), envio de emails transacionais (confirmação de conta, notificações de doação), compressão de imagens enviadas por upload e limpeza periódica de contas não verificadas (Req. 3.2). Essas operações compartilham uma característica: não devem bloquear a resposta HTTP ao usuário e não devem acoplar a camada de negócio à infraestrutura que as executa.

Sem uma estratégia explícita para coordenar esses efeitos, o projeto converge naturalmente para soluções que introduzem problemas graves:

**Hooks do Lucid ORM como mecanismo de efeito colateral:**
AdonisJS e Lucid oferecem hooks de ciclo de vida (`@afterCreate`, `@afterSave`) diretamente nos Models. Usar esses hooks para disparar indexação no Elasticsearch ou envio de email acopla a camada de persistência a serviços de infraestrutura — o Model passa a ter dependências de serviços externos que não são responsabilidade dele. Hooks Lucid executam na mesma transação do banco de dados, o que significa que uma falha no Elasticsearch pode reverter uma transação de negócio que já era válida. Além disso, hooks são de difícil teste em isolamento e criam dependências implícitas invisíveis para quem lê o código do service.

**Chamadas assíncronas diretas no Service:**
Invocar o cliente do Elasticsearch, o provedor de email ou o compressor de imagens diretamente dentro do `CreateMissionaryService` (ou equivalente) acopla a lógica de negócio à infraestrutura. Se o Elasticsearch estiver fora do ar, a criação do missionário falha — mesmo que a operação relacional tenha sido concluída com sucesso. A latência de chamadas a serviços externos (HTTP para ES, SMTP) fica na thread principal do Node.js, aumentando o tempo de resposta da API. Não há mecanismo de retry automático sem implementação manual.

**Event Bus nativo do AdonisJS sem persistência:**
O AdonisJS oferece um sistema de eventos em memória (`emitter`) que permite desacoplar o disparo do efeito colateral. Contudo, eventos em memória são efêmeros: se o servidor Node.js reiniciar enquanto um evento está sendo processado — ou antes de ser processado — o evento é perdido permanentemente. Em um sistema com operações críticas como indexação de busca e notificações financeiras, perda silenciosa de eventos é inaceitável.

A questão central é: **como garantir que efeitos colaterais assíncronos (indexação, email, compressão, limpeza) sejam executados de forma desacoplada, resiliente a falhas de infraestrutura e sem impactar a latência da resposta HTTP, sem perda de eventos em caso de reinicialização do servidor?**

## Decisão

Adotaremos uma **Arquitetura Orientada a Eventos (EDA) em dois estágios** como padrão para todas as operações assíncronas do MissionApp Backend.

O **BullMQ** é uma biblioteca Node.js de código aberto para gerenciamento de filas de mensagens e processamento em background, construída sobre Redis (ou compatíveis, como DragonflyDB). Reescrita inteiramente em TypeScript a partir da popular biblioteca Bull, implementa o padrão produtor-consumidor com suporte a filas prioritárias, retries configuráveis com backoff exponencial, jobs agendados (_delayed jobs_), jobs recorrentes (cron), concorrência configurável por worker e tipagem de payloads — sendo a escolha padrão do ecossistema Node.js para processamento assíncrono robusto.

A arquitetura divide as operações assíncronas em dois estágios:

1. **Estágio 1 — Roteamento em memória (AdonisJS Emitter):** O Service emite um evento tipado imediatamente após concluir a transação relacional. O emitter nativo do AdonisJS funciona exclusivamente como roteador em processo — rápido, síncrono e com tipagem garantida via contrato de eventos.

2. **Estágio 2 — Persistência e execução em background (BullMQ + DragonflyDB):** Um Listener, ao receber o evento, enfileira imediatamente um Job no BullMQ. O BullMQ persiste o Job no DragonflyDB (adotado no [ADR-0007](./0007-adocao-do-dragonfly-como-cache-e-armazenamento-temporario.md)), garantindo durabilidade: o Job sobrevive a reinicializações do servidor. Um Worker isolado consome a fila e executa a operação pesada (indexação, email, compressão) no seu próprio ritmo, com retries automáticos configuráveis em caso de falha do serviço destino.

O fluxo completo para cada operação assíncrona segue esta sequência:

```
Service (transação relacional)
  → emitter.emit('evento:ocorreu', payload)
    → Listener (recebe evento, enfileira Job em < 1ms)
      → BullMQ Queue (persistido no DragonflyDB)
        → Worker (executa em background, com retries)
```

A estrutura de pastas do projeto refletirá essa separação de responsabilidades:

```
/app
  /services/        # Transação relacional + disparo do evento
  /listeners/       # Roteamento: evento → Job na fila (sem lógica de negócio)
  /jobs/            # Workers: executam a operação no serviço destino
/contracts
  events.ts         # Contrato de tipagem de todos os eventos de domínio
```

**Tipagem de eventos via contrato (`contracts/events.ts`):**
Todos os eventos emitidos no sistema serão tipados através de uma declaração de módulo que estende a interface `EventsList` do AdonisJS. Isso garante que `emitter.emit()` e os Listeners recebam e processem payloads com o formato exato esperado — detectando incompatibilidades em tempo de compilação, antes do deploy.

**Regras de operação dos Listeners:**
Listeners são roteadores, não executores. Um Listener não deve realizar chamadas HTTP, consultas ao banco de dados ou qualquer operação com latência variável. A única responsabilidade de um Listener é serializar o payload do evento em um Job e adicioná-lo à fila do BullMQ. O tempo de execução de um Listener deve ser da ordem de microssegundos a milissegundos.

**Configuração de retries nos Jobs:**
Jobs que dependem de serviços externos (Elasticsearch, SMTP, provedores de storage) serão configurados com retries automáticos e backoff exponencial. A configuração exata de tentativas e intervalos será definida por tipo de Job, considerando o SLA do serviço destino e a criticidade da operação.

**Workers como processos isolados:**
Workers do BullMQ rodam em processo separado da API HTTP. Isso garante que uma fila com alto volume de Jobs (ex: indexação em lote após re-indexação do Elasticsearch) não consuma CPU da thread principal da API, mantendo o SLA de latência das requisições HTTP independente do volume de trabalho em background.

## Justificativa

O padrão de dois estágios foi escolhido por resolver simultaneamente os problemas de durabilidade, desacoplamento e resiliência identificados no contexto:

- **Durabilidade garantida pelo DragonflyDB:** Jobs enfileirados no BullMQ são persistidos no DragonflyDB antes de a resposta HTTP ser enviada ao cliente. Uma reinicialização do servidor Node.js após o enfileiramento não perde o Job — o Worker o processará quando for reiniciado. Isso elimina a principal falha do modelo puramente em memória.

- **Resiliência a quedas de serviços downstream:** Se o Elasticsearch estiver fora do ar no momento em que um missionário é cadastrado, o Job de indexação permanece na fila do BullMQ. O Worker tentará novamente com backoff exponencial até o Elasticsearch se recuperar — sem intervenção manual e sem perda de dados. O mesmo vale para falhas temporárias do SMTP ou do provedor de storage.

- **Desacoplamento total entre negócio e infraestrutura:** O `CreateMissionaryService` emite `'missionary:created'` e retorna. Ele não sabe que existe Elasticsearch, não importa o cliente HTTP, não conhece o formato de índice. A regra de negócio permanece coesa e testável em isolamento — sem mocks de serviços externos na suite de testes unitários do service.

- **Latência da API protegida da carga assíncrona:** O Listener enfileira o Job em menos de 1ms. A operação de indexação no Elasticsearch (que pode levar dezenas a centenas de milissegundos) acontece em background, em processo separado. O usuário que cadastra um missionário recebe a resposta `201 Created` sem esperar a indexação — mesmo que o Elasticsearch esteja lento.

- **Separação de carga entre API e workers:** Em picos de tráfego, o pool de conexões HTTP, a CPU da API e o pool de conexões do PostgreSQL não competem com a CPU dos workers de indexação ou compressão de imagens. Cada camada opera no seu perfil de carga ideal e pode ser escalada independentemente.

- **Tipagem end-to-end via contrato de eventos:** O `contracts/events.ts` cria um único ponto de verdade para o formato de cada evento de domínio. O TypeScript garante que o Service que emite o evento e o Listener que o recebe concordam sobre o formato do payload em tempo de compilação — eliminando uma classe inteira de bugs de integração silenciosos entre camadas.

- **Observabilidade nativa do BullMQ:** O BullMQ expõe APIs para inspeção do estado das filas (Jobs pendentes, em execução, com falha, concluídos) que podem ser consumidas por dashboards de monitoramento. Jobs que falharam após todas as tentativas ficam na fila `failed` com o stack trace do erro — facilitando diagnóstico e reprocessamento manual quando necessário.

- **Reutilização da infraestrutura já adotada:** O DragonflyDB já está no stack ([ADR-0007](./0007-adocao-do-dragonfly-como-cache-e-armazenamento-temporario.md)) como broker de filas. O BullMQ já é adotado como client de filas. Esse padrão não introduz nenhum novo serviço de infraestrutura — apenas formaliza como os componentes existentes se integram.

## Alternativas Consideradas

- **Hooks do Lucid ORM (`@afterCreate`, `@afterSave`):** Executar efeitos colaterais diretamente nos hooks de ciclo de vida do Model. Descartado porque: (1) acopla a camada de persistência a serviços externos — o Model passa a depender do cliente Elasticsearch, do provedor de email, de configurações de fila; (2) hooks Lucid executam no contexto da transação do banco — uma falha no Elasticsearch pode reverter uma operação relacional válida; (3) hooks são executados em memória, sem persistência — mesma fragilidade a reinicializações do puramente in-memory; (4) torna os Models difíceis de testar em isolamento, pois cada operação de escrita dispara efeitos colaterais em serviços externos.

- **Chamadas diretas a serviços externos no Service (`await esClient.index(...)`):** Invocar o Elasticsearch, SMTP ou compressor de imagens diretamente dentro do método `execute()` do Service, após a transação relacional. Descartado porque: (1) acopla a lógica de negócio à infraestrutura de forma explícita — o Service precisa importar, configurar e conhecer o cliente de cada serviço externo; (2) uma falha ou lentidão no serviço externo impacta diretamente a latência da resposta HTTP ao usuário; (3) não há mecanismo de retry automático — uma falha pontual do Elasticsearch resulta em perda permanente de indexação sem implementação manual de lógica de retentativa; (4) o Service torna-se difícil de testar sem mocks extensivos de serviços externos.

- **Event Bus nativo do AdonisJS sem BullMQ (puramente em memória):** Usar `emitter.emit()` e Listeners que executam as operações diretamente, sem enfileiramento no BullMQ. Descartado porque: (1) eventos em memória são perdidos permanentemente em caso de reinicialização do servidor Node.js — não há persistência; (2) sem retry automático, falhas temporárias no Elasticsearch ou SMTP resultam em perda silenciosa de operações; (3) o processamento de operações lentas (indexação, compressão) bloqueia a thread de execução do Node.js se o Listener não retornar rapidamente — degradando a latência da API; (4) sem fila persistida, não há visibilidade sobre o estado das operações assíncronas (pendentes, em falha, aguardando retry).

- **Enfileiramento direto no BullMQ dentro do Service (sem emitter):** O Service chama diretamente `queue.add('index-missionary', payload)` após a transação, sem passar pelo emitter. Descartado porque: (1) embora mais simples, acopla o Service diretamente à infraestrutura de filas — o Service precisa importar e configurar instâncias do BullMQ; (2) perde a vantagem de tipagem centralizada via `contracts/events.ts`; (3) múltiplos consumidores do mesmo evento (ex: indexação ES + envio de email + auditoria) exigiriam múltiplas chamadas `queue.add()` no Service, espalhando lógica de roteamento pela camada de negócio; (4) a separação entre "o fato ocorreu" (evento de domínio) e "o que fazer com esse fato" (roteamento para filas) é uma distinção arquitetural importante que o emitter preserva e o enfileiramento direto elimina.

- **Processamento síncrono com transações distribuídas (Saga / Two-Phase Commit):** Garantir consistência entre PostgreSQL e Elasticsearch via protocolo de commit distribuído. Descartado porque: (1) o Elasticsearch não suporta participação em transações distribuídas — não implementa Two-Phase Commit; (2) o padrão Saga exigiria implementação de transações compensatórias (rollback do ES em caso de falha do PostgreSQL e vice-versa), adicionando complexidade desproporcional para o escopo atual; (3) a consistência eventual com retry automático via BullMQ é a solução padrão de mercado para esse perfil de integração assíncrona.

## Consequências (Trade-offs)

### Positivas / Benefícios

- **Durabilidade de eventos:** Jobs persistidos no DragonflyDB sobrevivem a reinicializações do servidor. Nenhuma operação assíncrona é perdida por falha de infraestrutura temporária.

- **Resiliência automática:** Retries com backoff exponencial garantem que falhas pontuais de serviços downstream (Elasticsearch offline, SMTP com timeout) sejam absorvidas sem intervenção manual e sem perda de dados.

- **Latência da API desacoplada do trabalho assíncrono:** Operações lentas (indexação, compressão, envio de email) não impactam o tempo de resposta HTTP. O usuário recebe a confirmação imediatamente.

- **Services testáveis em isolamento:** A camada de negócio pode ser testada sem mocks de Elasticsearch, SMTP ou storage — apenas verificando que o evento correto foi emitido com o payload correto.

- **Escalabilidade independente por tipo de trabalho:** Workers de indexação, Workers de email e Workers de compressão de imagem podem ser escalados horizontalmente de forma independente, conforme o volume de cada tipo de operação.

- **Observabilidade das filas:** O BullMQ expõe o estado de cada Job (ativo, aguardando, com falha, concluído) permitindo monitoramento, alertas e reprocessamento manual de Jobs que falharam definitivamente.

### Negativas / Riscos

- **Consistência eventual entre PostgreSQL e Elasticsearch:** O índice de busca é uma projeção assíncrona dos dados relacionais. Entre o momento em que o missionário é criado no PostgreSQL e o momento em que o Job de indexação é processado pelo Worker, existe uma janela (tipicamente de milissegundos a poucos segundos) em que o missionário não aparece nos resultados de busca. Para o caso de uso de busca do MissionApp (Req. 11), essa janela é aceitável — buscas não precisam de consistência de leitura pós-escrita imediata.

- **Complexidade de debugging em fluxos assíncronos:** Rastrear um bug que envolve Service → Listener → Job → Worker requer correlação de logs entre processos diferentes. Sem uma estratégia de tracing distribuído e IDs de correlação nos logs, diagnosticar falhas em produção pode ser mais difícil do que em fluxos síncronos.

- **Dependência do DragonflyDB para operações assíncronas:** Se o DragonflyDB estiver indisponível, os Listeners não conseguem enfileirar Jobs — as operações assíncronas ficam pendentes até o DragonflyDB se recuperar. Eventos emitidos durante a indisponibilidade do DragonflyDB são perdidos, pois o emitter nativo é in-memory. Esse cenário deve ser monitorado com alertas de saúde do DragonflyDB.

- **Curva de aprendizado para contribuidores novos:** O padrão de dois estágios (emitter → Listener → BullMQ → Worker) é menos intuitivo do que uma chamada direta. Contribuidores que não conhecem o padrão podem tentar implementar efeitos colaterais diretamente no service — a documentação deste ADR e os exemplos no código existente são a principal barreira contra regressões ao padrão acoplado.

- **Overhead operacional de Workers em produção:** Workers são processos separados que precisam ser iniciados, monitorados e reiniciados em caso de crash. Em produção, isso requer configuração de process manager (PM2, systemd ou orquestração via Docker Compose / Kubernetes) para garantir que Workers estejam sempre rodando.

## Referências

- [BullMQ — Introdução e arquitetura](https://docs.bullmq.io/guide/introduction): visão geral do sistema de filas adotado
- [BullMQ — Workers](https://docs.bullmq.io/guide/workers): documentação de workers, padrão usado para processar jobs assíncronos
- [BullMQ — Retries e backoff exponencial](https://docs.bullmq.io/guide/jobs/retrying-job): estratégia de retry adotada para resiliência de jobs
- [AdonisJS Emitter — eventos tipados com module augmentation](https://docs.adonisjs.com/guides/digging-deeper/emitter#string-based-events): documentação do emitter de eventos usado na camada de Listeners
- [AdonisJS Emitter — Listener classes](https://docs.adonisjs.com/guides/digging-deeper/emitter#listener-classes): padrão de Listener como classe, adotado neste projeto
- [ADR-0007](./0007-adocao-do-dragonfly-como-cache-e-armazenamento-temporario.md): DragonflyDB como broker de filas onde os jobs BullMQ são persistidos
- [ADR-0009](./0009-adocao-do-elasticsearch-como-mecanismo-de-busca.md): Elasticsearch como destino de jobs de indexação processados pelos workers

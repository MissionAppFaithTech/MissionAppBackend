# [ADR-0015]: Padrão de Imagem Única com Múltiplos Entrypoints para Workers BullMQ

## Dados

- **Status:** 🔵 Em Uso
- **Data:** 2026-06-04
- **Proponentes:** [Allber Ferreira](https://github.com/AFSFerreira)

---

## Contexto e Problema

A adoção da Arquitetura Orientada a Eventos com BullMQ ([ADR-0010](./0010-adocao-de-arquitetura-orientada-a-eventos-com-bullmq.md)) estabeleceu que Workers executam em processo separado da API HTTP. Isso significa que o MissionApp Backend deixou de ser um monólito de processo único: em produção, a aplicação é um sistema distribuído composto por ao menos dois processos distintos — o servidor HTTP (API) e os Workers de fila (BullMQ). Essa topologia cria três perguntas arquiteturais que precisam ser respondidas explicitamente antes da implementação:

**Como empacotar esses processos em containers Docker?**
A resposta ingênua é criar um `Dockerfile` separado para cada processo: um para a API e outro para cada tipo de Worker. Essa abordagem parece intuitiva — afinal, os processos têm responsabilidades diferentes — mas ignora como o Docker gerencia camadas de sistema de arquivos (UnionFS). Dois `Dockerfiles` independentes que compartilham as mesmas dependências geram duas imagens com IDs completamente distintos. O registry de containers (ECR, Docker Hub, GitHub Container Registry) armazena essas imagens como objetos separados: sem reutilização de cache, o dobro de banda consumida no pull durante o deploy, e o dobro de espaço em disco no servidor de produção.

**Como garantir que o Worker tenha acesso aos Models, ao ORM, às variáveis de ambiente e à injeção de dependências do AdonisJS?**
Um Worker do BullMQ precisa executar lógica de negócio: buscar um missionário no PostgreSQL via Lucid ORM, indexar no Elasticsearch, enviar email via `@adonisjs/mail`. Criar um Worker como um script Node.js solto (`worker.js`) significa reimplementar manualmente a inicialização do AdonisJS — conexão com banco, leitura do `.env`, registro de providers — duplicando lógica de bootstrap que o framework já fornece. Qualquer mudança no ciclo de vida da aplicação (novo provider, nova variável de ambiente obrigatória) precisaria ser replicada no script do Worker, criando uma segunda superfície de manutenção propensa a divergências.

**Como os desenvolvedores criam novos Workers de forma padronizada?**
Sem uma convenção explícita, cada contribuidor pode adotar uma abordagem diferente: scripts `.ts` na raiz, arquivos em `/workers`, comandos ad hoc. A falta de um padrão único fragmenta a estrutura do projeto e dificulta a descoberta de Workers existentes, a configuração de process managers e a geração de documentação.

A questão central é: **como estruturar o empacotamento e a escrita dos Workers de forma que reutilize o máximo da infraestrutura Docker existente, garanta acesso completo ao ciclo de vida do AdonisJS e imponha uma convenção única para todos os contribuidores?**

## Decisão

Adotaremos o **padrão de Imagem Única com Múltiplos Entrypoints** para todos os processos do MissionApp Backend. É expressamente proibido criar `Dockerfiles` separados para Workers.

**Imagem única, múltiplos processos:**
A mesma imagem Docker (construída a partir do único `Dockerfile` do repositório) é utilizada para subir tanto o servidor HTTP quanto todos os Workers. O Docker Compose ([ADR-0008](./0008-uso-do-docker-para-ambiente-de-desenvolvimento-e-deploy.md)) orquestra os processos como serviços distintos, cada um com seu próprio comando de entrypoint:

```yaml
services:
  api:
    build: .
    command: node build/bin/server.js
    ports:
      - '3333:3333'

  worker:
    build: .
    command: node build/ace.js queue:listen
    # Sem 'ports:' — Worker não expõe portas HTTP
```

Quando `build: .` aponta para a mesma imagem em ambos os serviços, o Docker reutiliza as camadas em cache do UnionFS. O servidor baixa os gigabytes da imagem uma única vez; a execução do segundo container consome praticamente zero bytes adicionais de armazenamento em disco.

**Workers implementados como Comandos do Ace CLI:**
Todos os Workers serão escritos como comandos personalizados do AdonisJS Ace CLI, criados via:

```bash
node ace make:command QueueListen
```

O arquivo gerado em `commands/queue_listen.ts` expõe a flag `loadApp: true` nas opções do comando:

```typescript
export default class QueueListen extends BaseCommand {
  static commandName = 'queue:listen'
  static description = 'Inicia o Worker do BullMQ para processar jobs em background'

  static options = {
    loadApp: true,
  }

  async run() {
    // Lucid ORM, Env, DI e todos os providers do AdonisJS
    // estão disponíveis aqui — sem nenhuma inicialização manual
  }
}
```

A flag `loadApp: true` instrui o AdonisJS a executar o ciclo de vida completo de inicialização antes de chamar `run()`: leitura do `.env`, conexão com o PostgreSQL via Lucid, registro de todos os providers — sem inicializar o servidor HTTP. O resultado é um processo isolado com acesso total à camada de dados e à injeção de dependências, sem a sobrecarga e a superfície de ataque de um servidor HTTP.

**Transporte de IDs, não de dados:**
Workers nunca recebem objetos completos pela fila. O payload de um Job transporta exclusivamente identificadores (IDs). O Worker busca os dados atuais diretamente no PostgreSQL no momento da execução — garantindo que o Worker opere sempre sobre o estado mais recente do dado, não sobre um snapshot potencialmente obsoleto serializado no momento do enfileiramento.

```
Job payload: { missionaryId: "uuid-xxx" }
Worker: const missionary = await Missionary.findOrFail(missionaryId)
```

**Comando de produção:**
Em produção, Workers são iniciados com:

```bash
node build/ace.js queue:listen
```

O `ace.js` na raiz da pasta `build/` é o roteador de comandos gerado pelo `node ace build`. Ele aceita qualquer comando registrado no AdonisJS sem recompilar TypeScript.

## Justificativa

O padrão foi escolhido por resolver os três problemas identificados no contexto com o menor custo operacional e de manutenção possível:

- **Reutilização de cache Docker (UnionFS):** A mesma imagem compartilha todas as camadas: a instalação do `pnpm`, os `node_modules`, o código compilado do TypeScript. O registry armazena um único objeto. O servidor de produção baixa a imagem uma única vez. Dois containers (`api` e `worker`) compartilham o mesmo "esqueleto" físico em disco — o overhead de memória do segundo container é apenas o delta de estado de runtime, não os gigabytes das dependências.

- **Ciclo de vida completo do AdonisJS via `loadApp: true`:** O Worker tem acesso a Lucid ORM, `Env`, injeção de dependências e todos os providers sem nenhum código de bootstrap manual. Qualquer mudança no ciclo de vida da aplicação (novo provider, nova variável obrigatória, novo migration) é automaticamente herdada por todos os Workers — a única fonte de verdade de inicialização é o próprio AdonisJS.

- **TypeScript e tipagem end-to-end:** Comandos Ace são TypeScript nativo. O Worker herda todos os contratos de tipo do domínio: os models do Lucid, os tipos dos payloads de Job definidos em `contracts/events.ts` ([ADR-0010](./0010-adocao-de-arquitetura-orientada-a-eventos-com-bullmq.md)), os tipos de retorno dos services. Incompatibilidades são detectadas em tempo de compilação — antes do deploy.

- **Isolamento de carga sem acoplamento de código:** Processos Node.js separados no sistema operacional garantem que uma fila com alto volume de Jobs (re-indexação em lote, envio de emails em massa) não consuma CPU da thread do servidor HTTP. A API mantém seu SLA de latência independentemente do volume de trabalho em background. Em produção, Workers podem ser escalados horizontalmente de forma independente sem escalar a API.

- **Superfície de ataque reduzida no Worker:** Workers não expõem portas (`ports:` ausente no serviço `worker` do Docker Compose). Não há servidor HTTP para receber requisições externas, eliminar headers HTTP mal formados ou sofrer ataques de requisição. O único canal de comunicação do Worker com o mundo externo é a fila do DragonflyDB ([ADR-0005](./0005-adocao-do-redis-como-cache-e-armazenamento-temporario.md)) — um canal interno, não exposto à internet.

- **Convenção única e descoberta de Workers:** Todos os Workers vivem em `commands/` e são registráveis via `node ace list`. Novos contribuidores podem descobrir todos os Workers existentes sem varrer o repositório em busca de scripts soltos. O processo de criação é padronizado (`node ace make:command`) e a estrutura gerada é sempre idêntica.

- **Pipeline de build único:** Um único `node ace build` transpila a API, os comandos Ace e todos os Workers para a pasta `build/`. Não há pipelines de compilação separados para manter sincronizados.

## Alternativas Consideradas

- **`Dockerfiles` separados por processo (`Dockerfile.api`, `Dockerfile.worker`):** Criar imagens distintas para a API e para cada Worker. Descartado porque: (1) ambos os `Dockerfiles` executariam `pnpm install` e copiariam o mesmo código-fonte — o registry armazenaria dois objetos com IDs diferentes, consumindo o dobro de banda no pull durante o deploy; (2) qualquer atualização de segurança em uma dependência (como apontado pelo Snyk, [ADR-0014](./0014-adocao-do-snyk-para-deteccao-de-vulnerabilidades.md)) precisa ser aplicada em todos os `Dockerfiles` — esquecer um deles resulta em Worker rodando com versão vulnerável em produção enquanto a API já está atualizada; (3) não há ganho real de tamanho de imagem para o perfil de trabalho do Worker (I/O-bound — email, indexação de texto) — a economia teórica de bytes por não incluir dependências HTTP é insignificante comparada ao custo de manutenção da duplicação.

- **Workers como scripts Node.js soltos (`workers/elasticsearch.js`):** Criar arquivos JavaScript ou TypeScript avulsos na pasta `workers/` que instanciam diretamente os clientes do BullMQ e do banco de dados. Descartado porque: (1) exige reimplementar manualmente a inicialização do AdonisJS — conexão com banco, leitura de variáveis de ambiente, setup de providers — duplicando lógica de bootstrap já gerenciada pelo framework; (2) a reimplementação cria uma segunda superfície de manutenção: mudanças no ciclo de vida da aplicação precisam ser propagadas manualmente para cada script de Worker; (3) sem o sistema de módulos do AdonisJS (`#models/*`, `#services/*`), os imports relativos nos scripts tornam-se frágeis e difíceis de resolver; (4) sem convenção de localização (`commands/`), Workers ficam dispersos no repositório; (5) scripts soltos executam como JavaScript puro em runtime — sem acesso aos contratos de tipo de `contracts/events.ts` nem às definições dos Models do Lucid, incompatibilidades entre o payload enfileirado pelo Listener e o payload consumido pelo Worker só são descobertas em produção, não em tempo de compilação.

- **Workers em linguagem poliglota (Go, Rust):** Implementar Workers em uma linguagem compilada de alta performance para maximizar throughput de processamento de filas. Descartado porque: (1) Workers que precisam acessar o PostgreSQL precisariam recriar toda a modelagem de tabelas e conexões na linguagem-alvo — uma mudança de schema no AdonisJS que não fosse replicada quebraria o Worker em produção silenciosamente; (2) as operações que os Workers executam (envio de email, indexação de texto no Elasticsearch) são I/O-bound, não CPU-bound — Node.js com sua event loop não bloqueante é a ferramenta ideal para esse perfil; linguagens compiladas oferecem vantagem mensurável apenas em tarefas CPU-bound (manipulação de vídeo, criptografia em massa, processamento numérico); (3) a rotatividade de membros em projetos open-source é alta — exigir domínio de uma segunda linguagem apenas para manutenção de Workers cria uma barreira de contribuição desproporcional ao benefício técnico no escopo atual.

- **Processos Workers gerenciados por PM2 ou systemd (sem Docker):** Iniciar os Workers diretamente no sistema operacional do servidor, fora de containers. Descartado porque: (1) quebra a paridade entre ambiente de desenvolvimento e produção — o `docker-compose.yaml` descreve o ambiente completo incluindo Workers, garantindo que qualquer desenvolvedor possa reproduzir a topologia de produção localmente com `docker compose up`; (2) dificulta o isolamento de falhas — um Worker que consuma memória excessiva pode afetar o sistema operacional inteiro, não apenas o container; (3) inconsistente com a decisão de usar Docker como padrão de ambiente ([ADR-0008](./0008-uso-do-docker-para-ambiente-de-desenvolvimento-e-deploy.md)).

## Consequências (Trade-offs)

### Positivas / Benefícios

- **Imagem Docker única:** Um único pipeline de build, um único objeto no registry, um único `Dockerfile` para manter. Toda atualização de dependência ou mudança de configuração Docker se propaga automaticamente para API e Workers.

- **Reutilização de cache máxima:** Workers e API compartilham todas as camadas Docker. O overhead de disco de subir um segundo container a partir da mesma imagem é próximo de zero bytes.

- **Acesso completo ao AdonisJS sem bootstrap manual:** `loadApp: true` entrega Lucid ORM, `Env`, injeção de dependências e providers ao Worker de forma automática e sempre sincronizada com a versão da API.

- **Isolamento de carga entre API e Workers:** Picos de volume nas filas não competem com a CPU ou o pool de conexões do servidor HTTP. Cada processo escala de forma independente conforme o perfil de carga.

- **Segurança por default no Worker:** Workers não têm portas abertas. Sem servidor HTTP, a superfície de ataque via rede é eliminada. O único vetor de entrada é a fila interna do DragonflyDB.

- **Convenção única e descoberta:** `node ace list` enumera todos os Workers. `node ace make:command` gera o esqueleto padronizado. Novos contribuidores encontram e criam Workers sem consultar documentação adicional.

### Negativas / Riscos

- **Imagem inclui dependências HTTP não utilizadas pelos Workers:** A imagem única contém o servidor HTTP (`@adonisjs/core` com servidor Hono/uWS) e seus middlewares — código que o Worker nunca executa. O tamanho da imagem é ligeiramente maior do que uma hipotética imagem mínima do Worker. Esse custo é aceito como desprezível dado o benefício de cache e manutenção.

- **Gerenciamento de processos em produção:** Workers são processos de longa duração que precisam ser iniciados, monitorados e reiniciados em caso de crash. Em produção, o Docker Compose com `restart: unless-stopped` ou um orquestrador (ECS, Kubernetes) é responsável por garantir que os Workers estejam sempre rodando — isso não é configurado automaticamente.

- **`node ace build` precisa incluir os comandos:** A compilação deve processar os arquivos em `commands/` além dos arquivos em `app/`, `bin/` e `start/`. Se um novo Worker for criado em um local fora do diretório convencional, o `tsconfig.json` precisa incluí-lo explicitamente para que o comando de produção `node build/ace.js` encontre o Worker compilado.

- **Curva de aprendizado do Ace CLI para contribuidores novos:** Desenvolvedores sem experiência em AdonisJS podem não conhecer o padrão de comandos Ace. A tendência natural é criar scripts Node.js avulsos — a documentação deste ADR e o `CONTRIBUTING.md` são a principal barreira contra essa regressão.

## Referências

- [AdonisJS — Ace CLI: criando comandos customizados](https://docs.adonisjs.com/guides/ace/creating-commands): base para implementação dos workers como comandos Ace
- [AdonisJS — Ace CLI: a flag `loadApp`](https://docs.adonisjs.com/guides/ace/creating-commands#loadapp): flag que permite ao worker acessar Lucid, Env e DI sem iniciar o servidor HTTP
- [Docker — Understanding image layers and the UnionFS](https://docs.docker.com/storage/storagedriver/): fundamenta o reuso de layers entre API e workers na imagem única
- [BullMQ — Workers](https://docs.bullmq.io/guide/workers): documentação dos workers BullMQ iniciados pelos comandos Ace
- [ADR-0008](./0008-uso-do-docker-para-ambiente-de-desenvolvimento-e-deploy.md): Docker como base do padrão de empacotamento de imagem única
- [ADR-0010](./0010-adocao-de-arquitetura-orientada-a-eventos-com-bullmq.md): arquitetura de eventos que define os workers como consumidores das filas BullMQ
- [ADR-0014](./0014-adocao-do-snyk-para-deteccao-de-vulnerabilidades.md): Snyk para scanning da imagem única, que inclui tanto API quanto workers

# [ADR-0006]: Uso do Docker para Padronização de Ambiente de Desenvolvimento e Deploy

## Dados

- **Status:** Proposto
- **Data:** 2026-05-31
- **Proponentes:** [Allber Ferreira](https://github.com/AFSFerreira)

---

## Contexto e Problema

O MissionApp Backend opera sobre um stack composto por cinco serviços com requisitos de versão específicos: PostgreSQL 18, DragonflyDB, MinIO, Elasticsearch e Node.js 24. A natureza open-source do projeto impõe que qualquer colaborador — em qualquer sistema operacional — consiga reproduzir esse ambiente com o mínimo de fricção.

Sem uma estratégia explícita de padronização de ambiente, o projeto enfrenta problemas recorrentes em ecossistemas open-source de stack múltiplo:

**Divergência de versões entre ambientes:**
Cada serviço tem um ciclo de release independente. Um colaborador que instala PostgreSQL via `apt` receberá uma versão diferente de outro que usa `brew` ou `winget`. O mesmo vale para Elasticsearch, DragonflyDB e Node.js. Comportamentos que existem em PostgreSQL 18 podem não existir em versões anteriores — e bugs que surgem em ambiente local de um contribuidor podem não ser reproduzíveis por outro com versão diferente.

**Custo de onboarding por sistema operacional:**
Instalar e configurar PostgreSQL, DragonflyDB, MinIO e Elasticsearch nativamente exige procedimentos distintos por sistema operacional. Cada serviço tem seu próprio processo de instalação, configuração de PATH, usuário de sistema, diretório de dados e porta padrão. Em um projeto open-source com contribuidores voluntários, cada passo extra de setup é uma barreira que reduz o número de colaboradores ativos.

**Ausência de isolamento entre projetos:**
Serviços instalados diretamente no sistema operacional compartilham recursos com outros projetos. Conflitos de porta, versões incompatíveis entre projetos e dados de banco misturados entre contextos são problemas comuns em ambientes sem isolamento.

**Paridade entre desenvolvimento e produção:**
Sem containerização, o ambiente de desenvolvimento diverge inevitavelmente do ambiente de produção em variáveis como versão de SO, versão de dependências do sistema, configuração de locale e comportamento de escrita em disco. Bugs que surgem exclusivamente em produção são difíceis de diagnosticar e reproduzir.

A pergunta central é: **como garantir que todos os contribuidores e ambientes de CI/CD partilhem exatamente o mesmo stack de serviços, versões e configurações, sem depender do sistema operacional do host?**

## Decisão

Adotaremos **Docker** e **Docker Compose** como estratégia de padronização de ambiente para desenvolvimento, CI/CD e produção.

O Docker é uma plataforma de containerização de código aberto que permite empacotar aplicações e suas dependências em unidades isoladas e portáveis chamadas containers. Resolve o problema clássico de "funciona na minha máquina" ao garantir que o ambiente de execução — sistema operacional base, bibliotecas e configurações — seja idêntico em desenvolvimento, CI/CD e produção. O Docker Compose complementa o Docker ao permitir definir e orquestrar múltiplos containers em conjunto em um único arquivo YAML versionado com o código.

O `docker-compose.yaml` na raiz do repositório definirá todos os serviços do stack de desenvolvimento (PostgreSQL, DragonflyDB, MinIO, Elasticsearch) com versões de imagem explicitamente fixadas via tag — nunca usando `latest`. A aplicação Node.js será executada diretamente no host em desenvolvimento (via `node ace serve --hmr`) e containerizada para produção via `Dockerfile`.

As seguintes premissas regerão o uso de Docker no projeto:

1. **Tags fixas:** Todas as imagens no `docker-compose.yaml` e no `Dockerfile` de produção referenciam tags de versão exatas (ex: `postgres:18.3-alpine`, não `postgres:latest`), garantindo reprodutibilidade entre atualizações.

2. **Volumes explícitos:** Dados persistentes (PostgreSQL, MinIO, Elasticsearch) são mantidos em volumes Docker nomeados, não em bind mounts — garantindo portabilidade entre sistemas operacionais e evitando problemas de permissão em Linux e macOS.

3. **Rede interna:** Todos os serviços compartilham uma rede Docker interna nomeada, acessíveis entre si pelo nome do serviço (ex: `postgres`, `dragonfly`, `minio`, `elasticsearch`) — sem exposição desnecessária de portas ao host.

4. **Variáveis de ambiente via `.env`:** Credenciais e configurações sensíveis são injetadas via arquivo `.env` (não hardcoded no `docker-compose.yaml`), com `.env.example` versionado no repositório como referência.

## Justificativa

Docker foi escolhido por ser a solução que resolve simultaneamente os problemas de reprodutibilidade, isolamento e paridade de ambiente com o menor overhead operacional:

- **Reprodutibilidade garantida por imagem:** Uma imagem Docker com tag fixa é um artefato imutável — `postgres:18.3-alpine` executará exatamente o mesmo binário em qualquer host que execute o `docker compose up`, independentemente do SO ou das bibliotecas instaladas no sistema. Isso elimina a classe inteira de bugs "funciona na minha máquina".

- **Onboarding em um único comando:** Um novo colaborador com Docker instalado executa `docker compose up -d` e obtém o stack completo funcional — PostgreSQL, DragonflyDB, MinIO e Elasticsearch — sem instalar, configurar ou versionar nenhum serviço diretamente. O guia de setup reduz-se a três passos: clonar, copiar `.env.example`, subir os containers.

- **Isolamento total entre projetos:** Cada instância do stack do MissionApp opera em sua própria rede Docker e volumes nomeados — sem conflito de porta, versão ou dados com outros projetos Node.js, PostgreSQL ou Elasticsearch que o desenvolvedor tenha instalado no host.

- **Paridade dev/produção via `Dockerfile`:** A imagem de produção da aplicação é construída a partir do mesmo `Dockerfile` versionado no repositório, garantindo que o ambiente de build em CI/CD e o ambiente de execução em produção utilizem exatamente o mesmo runtime Node.js, variáveis de sistema e dependências.

- **Adoção ubíqua no ecossistema open-source:** Docker é a ferramenta de containerização mais amplamente adotada em projetos Node.js e open-source. A probabilidade de que novos colaboradores já tenham Docker instalado e familiaridade básica com sua operação é alta — reduzindo a curva de aprendizado da infraestrutura local ao mínimo.

- **Integração nativa com pipelines de CI/CD:** GitHub Actions e demais plataformas de CI suportam Docker nativamente. Os mesmos serviços definidos no `docker-compose.yaml` podem ser levantados em pipelines de teste com mínima configuração adicional, garantindo que testes de integração executem contra versões idênticas às do ambiente de desenvolvimento.

## Alternativas Consideradas

- **Instalação nativa de cada serviço:** Instalar PostgreSQL, DragonflyDB, MinIO e Elasticsearch diretamente no sistema operacional do desenvolvedor. Descartado porque: (1) os procedimentos de instalação diferem por SO (Linux, macOS, Windows), tornando o guia de setup complexo e difícil de manter; (2) versões instaladas via gerenciadores de pacotes (`apt`, `brew`, `winget`) variam e podem divergir da versão de produção; (3) sem isolamento, conflitos de porta e versão com outros projetos são inevitáveis; (4) o custo de onboarding é proibitivo para um projeto open-source que precisa absorver contribuidores voluntários com agilidade.

- **Podman + Podman Compose:** Alternativa open-source ao Docker, sem daemon root e com melhor postura de segurança em alguns contextos. Descartado porque: (1) a adoção é significativamente menor que a do Docker — a maioria dos contribuidores open-source não tem Podman instalado por padrão; (2) a compatibilidade com `docker-compose.yaml` via `podman-compose` é parcial — alguns comportamentos de rede e volume diferem do Docker Compose, o que poderia introduzir inconsistências sutis; (3) o benefício de segurança do modo rootless não é relevante para o ambiente de desenvolvimento local do MissionApp.

- **Nix / Dev Containers (VS Code):** Ferramentas de ambiente reproduzível baseadas em declaração de dependências do sistema. Descartadas porque: (1) a curva de aprendizado do Nix é significativa — requer que contribuidores aprendam uma linguagem de configuração específica antes de contribuir com código; (2) Dev Containers acoplam o ambiente de desenvolvimento ao VS Code, excluindo contribuidores que usam outros editores; (3) ambas as soluções têm adoção menor que Docker em projetos Node.js open-source, reduzindo o pool de colaboradores capazes de contribuir com a infraestrutura de ambiente.

- **Máquinas Virtuais (Vagrant + VirtualBox):** Ambiente de desenvolvimento completamente isolado via VM. Descartado porque: (1) VMs consomem recursos de CPU e memória significativamente maiores que containers — um stack com quatro serviços em VM tornaria o ambiente de desenvolvimento pesado para máquinas com recursos limitados; (2) o ciclo de inicialização de uma VM é substancialmente mais lento que o de containers; (3) o overhead de manutenção da imagem base da VM (atualizações, snapshots) é desproporcional ao benefício para o escopo do projeto.

## Consequências (Trade-offs)

### Positivas / Benefícios

- **Onboarding reduzido a um comando:** `docker compose up -d` provisiona o stack completo. Novos colaboradores eliminam o tempo de setup de ambiente e iniciam contribuindo com código imediatamente.

- **Reprodutibilidade total:** Tags de imagem fixas garantem que dev, CI/CD e produção executem exatamente os mesmos binários — eliminando a categoria de bugs específicos de ambiente.

- **Isolamento sem conflitos:** Cada projeto tem seu próprio stack isolado. Múltiplos projetos com PostgreSQL em versões diferentes coexistem no mesmo host sem conflito.

- **CI/CD simplificado:** Pipelines de integração contínua levantam os mesmos containers do `docker-compose.yaml` para testes de integração — sem scripts de setup específicos por plataforma.

### Negativas / Riscos

- **Docker como pré-requisito obrigatório:** Colaboradores precisam ter Docker instalado e rodando. Em sistemas corporativos com restrições de instalação de software ou em ambientes Linux sem root, isso pode ser um obstáculo.

- **Consumo de recursos em máquinas limitadas:** O stack completo (PostgreSQL + DragonflyDB + MinIO + Elasticsearch) consome memória RAM considerável. Máquinas com menos de 8GB de RAM disponível podem ter dificuldades para rodar todos os serviços simultaneamente.

- **Latência de I/O em volumes Docker no macOS e Windows:** Volumes Docker com bind mounts têm latência de I/O significativamente maior em macOS e Windows comparado a Linux, devido à camada de virtualização. O uso de volumes nomeados (conforme definido neste ADR) mitiga grande parte desse impacto para os serviços de banco de dados.

- **Gestão de imagens desatualizadas:** Tags fixas garantem reprodutibilidade, mas exigem atualização manual deliberada quando uma versão mais recente de um serviço é adotada. Sem processo de revisão periódica das versões, o stack pode acumular imagens com vulnerabilidades conhecidas.

## Referências

- [Documentação oficial do Docker](https://docs.docker.com/)
- [Documentação do Docker Compose](https://docs.docker.com/compose/)
- [ADR-0003 — DragonflyDB como Cache e Broker de Filas](./0003-adocao-do-redis-como-cache-e-armazenamento-temporario.md)
- [ADR-0004 — MinIO como Emulador de Storage em Desenvolvimento](./0004-uso-do-minio-como-emulador-de-storage-em-desenvolvimento.md)
- [ADR-0005 — Elasticsearch como Mecanismo de Busca](./0005-adocao-do-elasticsearch-como-mecanismo-de-busca.md)

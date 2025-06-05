# [ADR-0014]: Adoção do GitHub Container Registry (GHCR) como Registry de Imagens Docker

## Dados

- **Status:** 🔵 Em Uso
- **Data:** 2026-06-04
- **Proponentes:** [Allber Ferreira](https://github.com/AFSFerreira)

---

## Contexto e Problema

A decisão de usar Docker como padrão de ambiente e deploy ([ADR-0006](./0006-uso-do-docker-para-ambiente-de-desenvolvimento-e-deploy.md)) e o padrão de Imagem Única com Múltiplos Entrypoints ([ADR-0013](./0013-padrao-imagem-unica-multiplos-entrypoints-para-workers.md)) definem que a aplicação é distribuída como uma imagem Docker que precisa ser construída, versionada e armazenada em algum registry. A escolha do registry impacta diretamente a complexidade da esteira de CI/CD, a gestão de credenciais e a rastreabilidade entre código-fonte e imagem publicada.

Todo fluxo de build e push de imagens em CI/CD enfrenta um problema de autenticação: o servidor de CI precisa de credenciais válidas para fazer login no registry e publicar a imagem. Para registries de terceiros, essas credenciais precisam ser criadas manualmente fora do repositório, injetadas como secrets no CI e rotacionadas periodicamente. Cada uma dessas etapas é um ponto de falha potencial:

- Credenciais expiradas ou revogadas interrompem o pipeline silenciosamente até que alguém investigue os logs.
- Secrets injetados no CI criam um acoplamento entre o repositório e uma conta externa — se a conta for deletada, o pipeline quebra.
- Em projetos open-source com múltiplos colaboradores, a gestão de quem tem acesso às credenciais do registry vira um problema de governança separado da gestão de acesso ao repositório.
- Registries como o Docker Hub introduzem rate limiting no plano gratuito — pipelines que fazem muitos pulls (builds paralelos, múltiplos PRs) atingem o limite e falham.

Além da autenticação, há o problema de rastreabilidade: em registries desacoplados do repositório, a conexão entre uma imagem publicada e o commit exato que a originou depende de convenções de tagging que precisam ser implementadas e mantidas manualmente pela equipe.

A questão central é: **qual registry de containers oferece autenticação sem gestão manual de credenciais, rastreabilidade nativa entre imagem e commit, e integração direta com o repositório GitHub onde o projeto já vive?**

## Decisão

Adotaremos o **GitHub Container Registry (GHCR)** como registry exclusivo para armazenamento e distribuição das imagens Docker do MissionApp Backend.

O GHCR é o serviço de armazenamento e distribuição de imagens de container do GitHub, integrado nativamente à plataforma. Lançado em 2020, suporta o formato OCI (Open Container Initiative) e hospeda imagens públicas e privadas compartilhando a mesma autenticação, permissões e visibilidade do repositório — eliminando a necessidade de gerenciar credenciais de registry externo em workflows de CI/CD que já usam GitHub Actions.

**Autenticação via `GITHUB_TOKEN`:**
O GHCR compartilha a mesma malha de segurança do repositório GitHub. Em workflows do GitHub Actions, o `GITHUB_TOKEN` — injetado automaticamente pelo runner sem configuração manual — é suficiente para autenticar no GHCR com permissão de push e pull. Nenhum secret externo precisa ser criado, rotacionado ou gerenciado:

```yaml
- name: Log in to GHCR
  uses: docker/login-action@v3
  with:
    registry: ghcr.io
    username: ${{ github.actor }}
    password: ${{ secrets.GITHUB_TOKEN }}
```

A permissão de escrita de pacotes é declarada no nível do workflow, sem dependência de conta externa:

```yaml
permissions:
  contents: read
  packages: write
```

**Estratégia de tagging:**
Cada imagem publicada receberá dois identificadores:

1. **Tag imutável por SHA do commit:** `ghcr.io/org/missionapp-backend:sha-<git-sha>` — identificador único e não reescritável que rastreia a imagem até o commit exato que a originou. Usado em deploys de produção para garantir que o servidor executa exatamente o código auditado.
2. **Tag de branch:** `ghcr.io/org/missionapp-backend:main` — tag flutuante que sempre aponta para a imagem mais recente da branch. Usado em ambientes de staging.

```yaml
- name: Extract metadata
  uses: docker/metadata-action@v5
  with:
    images: ghcr.io/${{ github.repository }}
    tags: |
      type=sha,prefix=sha-
      type=ref,event=branch
```

**Cache de camadas no GHCR:**
O GHCR suporta o protocolo OCI de cache de camadas (`cache-from` / `cache-to`). O workflow aproveitará o cache da última build da branch `main` para reduzir o tempo de compilação do TypeScript e reinstalação do `pnpm` em builds subsequentes:

```yaml
- name: Build and push
  uses: docker/build-push-action@v6
  with:
    push: true
    tags: ${{ steps.meta.outputs.tags }}
    cache-from: type=registry,ref=ghcr.io/${{ github.repository }}:cache
    cache-to: type=registry,ref=ghcr.io/${{ github.repository }}:cache,mode=max
```

**Visibilidade pública:**
Por ser um projeto open-source, as imagens serão publicadas como públicas no GHCR. Isso permite que qualquer colaborador faça pull da imagem sem autenticação — facilitando a reprodução do ambiente de produção localmente para depuração.

**Integração com o Renovate:**
O Renovate ([ADR-0011](./0011-adocao-do-renovate-para-atualizacao-automatica-de-dependencias.md)) gerencia atualizações de imagens Docker no `docker-compose.yaml`. A tag `sha-<git-sha>` no GHCR é imutável e rastreável — quando um deploy de produção referencia uma tag de SHA específica no Compose, o Renovate não tenta atualizá-la automaticamente (é um digest estável, não uma tag flutuante como `latest`).

## Justificativa

O GHCR foi escolhido por eliminar a principal classe de falhas de pipelines de build e push — credenciais externas — sem abrir mão de nenhum recurso necessário para o ciclo de deploy do projeto:

- **Zero secrets externos para gerenciar:** O `GITHUB_TOKEN` é emitido pelo próprio GitHub Actions para cada execução de workflow, com escopo restrito ao repositório e validade limitada à execução. Não existe credencial rotacionável, não existe conta de serviço para criar, não existe secret para armazenar. A eliminação desse overhead reduz a superfície de falha operacional da esteira a zero nesse ponto.

- **Gestão de acesso unificada com o repositório:** Quem tem acesso de escrita ao repositório pode publicar imagens; quem tem acesso de leitura pode fazer pull. A governança de acesso ao registry é exatamente a mesma do repositório — não há uma segunda camada de permissões para manter sincronizada. Para um projeto open-source com múltiplos colaboradores e rotatividade de membros, isso é especialmente relevante: revogar o acesso de um colaborador ao repositório revoga automaticamente o acesso ao registry.

- **Rastreabilidade nativa imagem ↔ commit:** O GHCR exibe, na interface do GitHub, o link direto entre cada pacote publicado e o workflow run que o originou. A tag `sha-<git-sha>` garante que qualquer imagem em produção pode ser rastreada até o diff exato que a compõe — sem depender de metadados externos ou convenções manuais de tagging.

- **Sem rate limiting para projetos open-source:** O Docker Hub impõe limite de 100 pulls por 6 horas para usuários anônimos. Pipelines com muitas builds paralelas (múltiplos PRs abertos, matrix builds) atingem esse limite e falham de forma intermitente. O GHCR não aplica rate limiting para imagens públicas — o pipeline nunca falha por quota de pulls esgotada.

- **Cache de camadas no próprio registry:** O cache OCI armazenado no GHCR reusa as camadas da última build bem-sucedida. Para a imagem do MissionApp Backend, as camadas mais pesadas (instalação do `pnpm`, `node_modules`) são reutilizadas entre builds que não alteraram `package.json` ou `pnpm-lock.yaml` — reduzindo o tempo de build de minutos para segundos na maior parte dos commits.

- **Colocação com o código-fonte:** O registry aparece diretamente na aba "Packages" do repositório GitHub. Colaboradores que chegam ao repositório encontram as imagens publicadas sem precisar navegar para um serviço externo. Issues, PRs, Actions e imagens Docker vivem no mesmo espaço de trabalho.

- **Alinhamento com a imagem única ([ADR-0013](./0013-padrao-imagem-unica-multiplos-entrypoints-para-workers.md)):** O padrão de imagem única significa que há um único caminho de registry para gerenciar (`ghcr.io/org/missionapp-backend`). A API e todos os Workers são iniciados a partir dessa mesma tag — um push atualiza todos os processos do sistema distribuído de forma atômica, sem descompasso de versão entre serviços.

## Alternativas Consideradas

- **Docker Hub:** Registry público mais utilizado, com ampla documentação e suporte nativo em ferramentas de CI. Descartado porque: (1) requer criação de conta de serviço separada e geração de Access Token para autenticação em CI — credencial externa que precisa ser rotacionada e gerenciada fora do repositório; (2) impõe rate limiting de 100 pulls por 6 horas para usuários anônimos, com risco de falhas intermitentes em pipelines com alto volume de builds; (3) a gestão de acesso ao namespace do Docker Hub é completamente desacoplada do repositório GitHub — revogar acesso de um colaborador ao repositório não revoga acesso ao registry.

- **Amazon Elastic Container Registry (ECR):** Registry gerenciado pela AWS, com alta disponibilidade e integração nativa com ECS e EKS. Descartado porque: (1) requer criação de IAM Role ou Access Keys da AWS para autenticação no GitHub Actions — introduz dependência de credenciais AWS no pipeline antes de qualquer decisão de cloud provider ter sido tomada; (2) cria acoplamento entre a esteira de CI/CD e uma conta AWS específica — migrar de provedor de nuvem ou trocar de conta AWS exige reconfiguração do pipeline; (3) adiciona custo por armazenamento e transferência de dados — o GHCR é gratuito para repositórios públicos; (4) a rastreabilidade imagem ↔ commit requer instrumentação manual (tags, labels) — não é nativa como no GHCR.

- **Google Artifact Registry / Container Registry:** Equivalente ao ECR no ecossistema GCP. Descartado pelos mesmos motivos do ECR: credenciais externas (Service Account Key ou Workload Identity Federation), acoplamento com conta GCP específica, custo variável por uso.

- **Registry auto-hospedado (Harbor, Zot):** Hospedar um registry privado na infraestrutura do projeto. Descartado porque: (1) exige infraestrutura adicional para operar (servidor, TLS, backups, monitoramento) — overhead operacional desproporcional para o escopo atual; (2) elimina a garantia de disponibilidade gerenciada que registries hospedados oferecem; (3) cria mais um serviço com credenciais para gerenciar.

## Consequências (Trade-offs)

### Positivas / Benefícios

- **Pipeline de build e push sem credenciais externas:** `GITHUB_TOKEN` é suficiente. Nenhum secret precisa ser criado, rotacionado ou auditado para a etapa de publicação de imagens.

- **Governança de acesso centralizada:** Acesso ao registry = acesso ao repositório. Uma única política de permissões cobre código-fonte e imagens Docker.

- **Rastreabilidade imagem ↔ commit por design:** Tags de SHA imutáveis e links nativos entre pacotes e workflow runs no GitHub eliminam a necessidade de instrumentação manual de rastreabilidade.

- **Builds mais rápidos via cache de camadas:** Camadas pesadas reutilizadas entre builds reduzem o tempo de compilação na maioria dos commits.

- **Sem custo e sem rate limiting para repositórios públicos:** Ilimitado para projetos open-source.

### Negativas / Riscos

- **Acoplamento ao ecossistema GitHub:** O GHCR é específico da plataforma GitHub. Se o repositório migrar para GitLab, Gitea ou Bitbucket, o registry precisará ser trocado e o pipeline reconfigurado. Para um projeto open-source já hospedado no GitHub, esse risco é baixo e aceito.

- **Disponibilidade dependente do GitHub:** Uma indisponibilidade do GitHub afeta simultaneamente o repositório, as GitHub Actions e o GHCR. Em caso de outage da plataforma, não é possível fazer pull de novas imagens nem publicar builds. O risco é mitigado pelo histórico de alta disponibilidade do GitHub e pela possibilidade de referenciar a última imagem estável em cache no servidor de produção durante incidentes pontuais.

- **Imagens públicas são acessíveis a qualquer pessoa:** Para um projeto open-source isso é intencional, mas exige atenção para que nenhum secret ou dado sensível seja incluído nas camadas da imagem durante o build. A validação de ausência de secrets nas imagens pode ser incorporada à esteira via ferramentas como o Snyk Container ([ADR-0012](./0012-adocao-do-snyk-para-deteccao-de-vulnerabilidades.md)).

## Referências

- [GitHub Docs — Working with the Container registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry): documentação oficial do GHCR, incluindo autenticação e uso de imagens privadas
- [GitHub Docs — Automatic token authentication](https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication): permite ao GitHub Actions autenticar no GHCR sem secrets adicionais via GITHUB_TOKEN
- [docker/login-action — GHCR authentication](https://github.com/docker/login-action#github-container-registry): action oficial para autenticação no GHCR nos workflows de CI/CD
- [docker/metadata-action — Image tagging strategies](https://github.com/docker/metadata-action): geração automática de tags de imagem baseada em branch, tag e SHA
- [docker/build-push-action — Registry cache](https://docs.docker.com/build/cache/backends/registry/): cache de build armazenado no próprio GHCR para acelerar builds subsequentes
- [ADR-0006](./0006-uso-do-docker-para-ambiente-de-desenvolvimento-e-deploy.md): Docker como base da estratégia de containerização publicada no GHCR
- [ADR-0011](./0011-adocao-do-renovate-para-atualizacao-automatica-de-dependencias.md): Renovate para atualização automática de imagens base publicadas no GHCR
- [ADR-0012](./0012-adocao-do-snyk-para-deteccao-de-vulnerabilidades.md): Snyk para scanning das imagens publicadas no GHCR
- [ADR-0013](./0013-padrao-imagem-unica-multiplos-entrypoints-para-workers.md): padrão de imagem única publicada no GHCR com múltiplos entrypoints

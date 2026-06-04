# [ADR-0011]: Adoção do Renovate para Atualização Automática de Dependências

## Dados
* **Status:** Proposto
* **Data:** 2026-05-31
* **Proponentes:** [Allber Ferreira](https://github.com/AFSFerreira)

---

## Contexto e Problema

O MissionApp Backend opera sobre um stack com múltiplas camadas de dependências versionadas: pacotes Node.js gerenciados pelo pnpm ([ADR-0007](./0007-adocao-do-pnpm-como-gerenciador-de-pacotes.md)), imagens Docker com tags fixas no `docker-compose.yaml` ([ADR-0006](./0006-uso-do-docker-para-ambiente-de-desenvolvimento-e-deploy.md)) e dependências de infraestrutura como Elasticsearch, DragonflyDB e MinIO. Cada uma dessas camadas tem um ciclo de release independente e acumula vulnerabilidades de segurança entre atualizações.

Dois problemas estruturais motivam a adoção de uma ferramenta de automação:

**Dependências desatualizadas como superfície de ataque silenciosa:**
O [ADR-0006](./0006-uso-do-docker-para-ambiente-de-desenvolvimento-e-deploy.md) explicitamente identificou como risco a acumulação de imagens Docker desatualizadas: *"Tags fixas garantem reprodutibilidade, mas exigem atualização manual deliberada quando uma versão mais recente de um serviço é adotada. Sem processo de revisão periódica das versões, o stack pode acumular imagens com vulnerabilidades conhecidas."* O mesmo vale para pacotes Node.js — vulnerabilidades em dependências transitivas são anunciadas continuamente e requerem atualização ativa do `pnpm-lock.yaml` para serem corrigidas.

**Processos manuais são incompatíveis com o modelo open-source:**
Em um projeto com contribuidores voluntários e rotatividade alta, um processo de atualização de dependências que depende de iniciativa humana periódica é, na prática, um processo que não acontece. Sem automação, o repositório acumula defasagem de versões silenciosamente — a equipe só percebe quando uma vulnerabilidade crítica é publicada e a atualização exige resolver conflitos acumulados de dezenas de versões em conjunto.

A pergunta central é: **como garantir que dependências Node.js, imagens Docker e lockfiles sejam mantidos atualizados de forma sistemática, com revisão humana antes do merge e sem depender da memória ou disponibilidade dos mantenedores?**

## Decisão

Adotaremos o **Renovate** (via GitHub App) como ferramenta de atualização automática de dependências do MissionApp Backend.

O Renovate será configurado através de um arquivo `renovate.json` na raiz do repositório, versionado junto ao código. A configuração definirá o comportamento de atualização para cada camada do stack:

**Escopo de atualizações gerenciadas:**
- Pacotes Node.js declarados em `package.json` — com regeneração automática do `pnpm-lock.yaml`
- Tags de imagens Docker em `docker-compose.yaml` (ex: `postgres:18.3-alpine` → `postgres:18.4-alpine`)
- Imagem base no `Dockerfile` de produção

**Estratégia de agrupamento de PRs:**
Para reduzir ruído de notificações, atualizações relacionadas serão agrupadas em um único PR por grupo:
- Pacotes do ecossistema AdonisJS (`@adonisjs/*`, `@vinejs/*`, `@edge-js/*`) em um único PR
- Dependências de desenvolvimento (ESLint, Prettier, TypeScript, tipagens `@types/*`) em um único PR
- Imagens Docker agrupadas por serviço

**Automerge seletivo:**
Atualizações de lockfile sem bump de versão de pacote (`lockFileMaintenance`) e atualizações de patch em dependências de desenvolvimento serão automergeadas se os testes de CI passarem — sem necessidade de revisão manual. Todas as demais atualizações (minor, major, dependências de produção) requerem revisão e aprovação explícita.

**Dependency Dashboard:**
O Renovate criará e manterá uma issue no repositório com o estado de todas as atualizações pendentes, ignoradas e programadas — servindo como painel centralizado para os mantenedores acompanharem o status de dependências sem precisar abrir cada PR individualmente.

**Schedule:**
Atualizações serão propostas apenas em dias úteis durante horário comercial (fuso UTC-3), reduzindo a probabilidade de PRs criados em períodos sem mantenedores disponíveis para revisão imediata.

**Mitigação de ataques de supply chain:**
O `renovate.json` configurará três mecanismos de defesa contra ataques de supply chain:

- **`pinDigests: true` para imagens Docker:** Em vez de referenciar apenas a tag (`postgres:18.3-alpine`), o Renovate converterá referências de imagem para o formato `postgres:18.3-alpine@sha256:<digest>`. Um digest SHA256 é um identificador imutável do conteúdo exato da imagem — independente do que o registry associe à tag. Se um registry for comprometido e a tag redirecionada para uma imagem maliciosa, o digest não corresponderá e o build falhará. O Renovate abrirá PRs para atualizar o digest quando a imagem for legitimamente atualizada.

- **`minimumReleaseAge`:** O Renovate aguardará um período mínimo (ex: 3 dias) antes de propor a atualização de um pacote npm recém-publicado. Ataques de supply chain via pacotes maliciosos exploram a janela imediata após a publicação — antes que scanners de segurança e a comunidade detectem o pacote comprometido. Aguardar 3 dias reduz significativamente a exposição a pacotes publicados e removidos rapidamente após o comprometimento.

- **Allowlist de registries:** A configuração restringirá atualizações a registries confiáveis (`registry.npmjs.org` para pacotes Node.js, imagens oficiais do Docker Hub), bloqueando a introdução silenciosa de dependências provenientes de registries não autorizados via updates automáticos.

## Justificativa

O Renovate foi escolhido por cobrir todas as camadas de dependências versionadas do stack do MissionApp com a maior flexibilidade de configuração disponível no mercado:

- **Suporte nativo ao pnpm e ao `pnpm-lock.yaml`:** O Renovate suporta o pnpm como gerenciador de pacotes de forma nativa, incluindo regeneração correta do `pnpm-lock.yaml` após atualizações de `package.json`. Isso é crítico para o projeto: a atualização de uma dependência sem atualização correspondente do lockfile violaria a garantia de reprodutibilidade estabelecida no [ADR-0007](./0007-adocao-do-pnpm-como-gerenciador-de-pacotes.md).

- **Manager nativo para Docker Compose:** O Renovate possui um manager dedicado ao `docker-compose.yaml` que detecta e atualiza tags de imagens automaticamente. Isso resolve diretamente o risco de acumulação de imagens com vulnerabilidades identificado no [ADR-0006](./0006-uso-do-docker-para-ambiente-de-desenvolvimento-e-deploy.md) — sem nenhum script customizado ou processo manual periódico.

- **Agrupamento de PRs para reduzir ruído:** O Renovate permite agrupar atualizações relacionadas em um único PR — todas as dependências do AdonisJS em um PR, todas as tipagens TypeScript em outro. Sem agrupamento, um repositório com dezenas de dependências pode gerar 5 a 10 PRs por dia durante períodos de atualização intensiva, sobrecarregando os mantenedores e levando ao fenômeno de "PR fatigue" — onde PRs são ignorados por volume.

- **Configuração como código auditável:** O `renovate.json` versionado no repositório permite que qualquer contribuidor entenda as regras de atualização, proponha mudanças via PR e revise o histórico de configuração. A política de dependências do projeto não fica presa no painel de configuração de uma ferramenta externa.

- **Dependency Dashboard como visibilidade centralizada:** A issue de painel criada pelo Renovate agrega o estado de todas as atualizações pendentes em um único lugar — sem necessidade de verificar cada branch ou PR individualmente. Mantenedores podem solicitar atualizações on-demand diretamente pela issue.

- **Automerge seguro para atualizações de baixo risco:** Atualizações de lockfile e patches de dev dependencies têm probabilidade muito baixa de introduzir regressões. Configurar automerge para essas categorias — condicional à passagem dos testes de CI — elimina o overhead de revisão humana para a maioria das atualizações rotineiras, reservando atenção dos mantenedores para minor e major bumps que podem conter breaking changes.

- **Mecanismos de defesa contra ataques de supply chain:** O Renovate oferece três camadas de proteção configuráveis via `renovate.json` que reduzem a superfície de ataque de supply chain — uma categoria de ataque que afeta diretamente ferramentas de atualização automática de dependências: (1) digest pinning de imagens Docker transforma referências de tag mutáveis em referências imutáveis por SHA256, bloqueando substituição silenciosa de imagens no registry; (2) `minimumReleaseAge` impõe uma quarentena configurável para novos releases de pacotes npm, reduzindo a janela de exposição ao padrão de ataque de publicar-comprometer-remover; (3) allowlist de registries bloqueia a introdução de dependências vindas de fontes não autorizadas via updates automáticos. Essas proteções são configuradas no mesmo `renovate.json` versionado no repositório — auditável por qualquer contribuidor.

- **Gratuito para repositórios open-source:** O Renovate GitHub App é gratuito para repositórios públicos. Não há custo adicional para o projeto.

## Alternativas Consideradas

* **Dependabot (GitHub nativo):** Ferramenta de atualização de dependências integrada ao GitHub, com configuração zero para repositórios públicos. Considerado como alternativa principal por não exigir instalação de app externo. Descartado porque: (1) o suporte ao pnpm é limitado em relação ao Renovate — especificamente para dependências transitivas e regeneração do `pnpm-lock.yaml`, o Dependabot tem limitações documentadas que podem gerar lockfiles inconsistentes; (2) não possui manager nativo para Docker Compose com update de image tags — atualizar `postgres:18.3-alpine` para `postgres:18.4-alpine` no `docker-compose.yaml` não é coberto nativamente; (3) agrupamento de PRs no Dependabot é limitado — não permite a granularidade de configuração do Renovate para definir grupos arbitrários por ecossistema ou padrão de nome de pacote; (4) automerge requer uma GitHub Actions workflow adicional (`dependabot/fetch-metadata`), enquanto o Renovate gerencia isso nativamente via configuração no `renovate.json`.

* **Atualizações manuais periódicas pelos mantenedores:** Executar `pnpm update` e atualizar tags Docker manualmente em sprints de manutenção programados. Descartado porque: (1) em um projeto open-source com contribuidores voluntários, "processos que dependem de memória humana" equivalem a "processos que não acontecem" — a evidência de projetos similares é que atualizações manuais são postergadas indefinidamente até que uma vulnerabilidade crítica force uma atualização emergencial; (2) atualizações acumuladas são mais difíceis de revisar — um PR que atualiza 15 pacotes simultaneamente torna impossível isolar qual mudança introduziu uma regressão; (3) a janela de exposição a vulnerabilidades de segurança é proporcional ao intervalo entre as rodadas manuais — sem automação, essa janela é indefinida.

* **`pnpm outdated` + script de CI para alertas:** Configurar uma GitHub Action que executa `pnpm outdated` periodicamente e cria issues quando dependências desatualizadas são detectadas. Descartado porque: (1) alertas sem ação automatizada transferem o trabalho de atualização para os mantenedores — reduz a janela de descoberta mas não resolve o problema de execução; (2) não cobre imagens Docker; (3) não gera PRs com changelogs integrados, tornando a avaliação de impacto de cada atualização mais trabalhosa; (4) scripts de CI customizados para esse fim são código de manutenção que o Renovate substitui completamente.

* **Snyk:** Plataforma de segurança para dependências com detecção de CVEs, patches automáticos e monitoramento de vulnerabilidades. Descartado para esse caso de uso específico porque: (1) o Snyk é primariamente uma ferramenta de segurança — seu foco é em vulnerabilidades conhecidas (CVEs), não em manter dependências na versão mais recente por razões de DX ou performance; (2) para o escopo de atualização de imagens Docker e lockfile maintenance, o Snyk não substitui o Renovate; (3) o plano gratuito do Snyk tem limitações de projetos e testes privados. O Snyk pode coexistir com o Renovate como camada complementar de scanning de vulnerabilidades, mas não é uma alternativa direta para automação de atualizações.

## Consequências (Trade-offs)

### Positivas / Benefícios

* **Eliminação do risco de imagens Docker desatualizadas:** O manager do Renovate para Docker Compose cobre diretamente o risco identificado no [ADR-0006](./0006-uso-do-docker-para-ambiente-de-desenvolvimento-e-deploy.md) — tags de imagem são atualizadas via PR antes de acumularem vulnerabilidades, com changelog do release incluído na descrição do PR.

* **`pnpm-lock.yaml` sempre consistente com `package.json`:** Atualizações de pacotes regeneram o lockfile corretamente, mantendo a garantia de reprodutibilidade do [ADR-0007](./0007-adocao-do-pnpm-como-gerenciador-de-pacotes.md) sem intervenção manual.

* **Janela de exposição a vulnerabilidades minimizada:** Com atualizações propostas automaticamente em dias úteis, o tempo entre a publicação de um patch de segurança e a disponibilidade de um PR para merge é reduzido de semanas/meses para horas/dias.

* **Revisão focada em mudanças de alto impacto:** Automerge para patches de dev dependencies e lockfile maintenance libera o tempo dos mantenedores para revisar apenas atualizações minor e major — que podem conter breaking changes relevantes.

* **Changelogs integrados nos PRs:** Cada PR do Renovate inclui o link para o changelog da versão atualizada, reduzindo o esforço de avaliação de impacto de cada atualização.

### Negativas / Riscos

* **Volume de PRs sem configuração adequada:** Sem agrupamento configurado, o Renovate pode gerar dezenas de PRs simultâneos em repositórios com muitas dependências — especialmente após um período inativo. A configuração de grupos no `renovate.json` é obrigatória para manter o volume gerenciável.

* **Automerge pode introduzir regressões em CI com cobertura incompleta:** A segurança do automerge é proporcional à cobertura dos testes automatizados. Se a suite de testes não cobrir um comportamento que foi alterado por um patch, o automerge pode introduzir uma regressão não detectada. A expansão da cobertura de testes é pré-requisito para ampliar o escopo do automerge além de dev dependencies.

* **Major bumps requerem avaliação manual cuidadosa:** Atualizações de versões major (ex: AdonisJS v7 → v8, Node.js 22 → 24) frequentemente incluem breaking changes que exigem migração de código. O Renovate abrirá o PR, mas a revisão e o trabalho de migração são responsabilidade dos mantenedores. PRs de major updates não devem ser mergeados sem leitura do guia de migração da biblioteca.

* **Dependência do GitHub App externo:** O Renovate é um serviço de terceiro (Mend). Indisponibilidade do serviço resulta em ausência de PRs de atualização durante o período de queda — sem impacto na aplicação em produção, mas com potencial aumento temporário da janela de exposição a vulnerabilidades.

## Referências

* [Renovate — Documentação oficial](https://docs.renovatebot.com/)
* [Renovate — Manager Docker Compose](https://docs.renovatebot.com/modules/manager/docker-compose/)
* [Renovate — Opções de configuração](https://docs.renovatebot.com/configuration-options/)
* [Renovate — Casos de uso](https://docs.renovatebot.com/getting-started/use-cases/)
* [ADR-0006 — Docker para Padronização de Ambiente](./0006-uso-do-docker-para-ambiente-de-desenvolvimento-e-deploy.md)
* [ADR-0007 — pnpm como Gerenciador de Pacotes](./0007-adocao-do-pnpm-como-gerenciador-de-pacotes.md)

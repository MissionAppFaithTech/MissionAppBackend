# [ADR-0012]: Adoção do Snyk para Detecção e Correção de Vulnerabilidades

## Dados

- **Status:** 🔵 Em Uso
- **Data:** 2026-05-31
- **Proponentes:** [Allber Ferreira](https://github.com/AFSFerreira)

---

## Contexto e Problema

O MissionApp processa dados sensíveis sob a LGPD: afiliação religiosa de missionários (dado sensível por definição — Art. 5º, II da LGPD), dados bancários de apoiadores, tokens de autenticação e informações de doações. O Art. 46 da LGPD impõe que os agentes de tratamento adotem _"medidas de segurança, técnicas e administrativas aptas a proteger os dados pessoais de acessos não autorizados e de situações acidentais ou ilícitas"_. Vulnerabilidades não corrigidas em dependências ou imagens de container são vetores diretos de violação desse requisito legal.

O stack do MissionApp expõe quatro superfícies de ataque distintas que requerem cobertura de segurança ativa:

**Dependências Node.js com CVEs conhecidos:**
O ecossistema npm publica centenas de vulnerabilidades por mês via CVEs (Common Vulnerabilities and Exposures). Uma dependência transitiva com CVE crítico pode existir no `pnpm-lock.yaml` por semanas sem que nenhum desenvolvedor perceba — especialmente em um projeto com contribuidores voluntários que não monitoram ativamente os feeds de segurança. O Renovate ([ADR-0011](./0011-adocao-do-renovate-para-atualizacao-automatica-de-dependencias.md)) atualiza versões por critério de freshness, mas não prioriza atualizações por severidade de CVE nem bloqueia PRs que introduzam novas vulnerabilidades.

**Imagens Docker com vulnerabilidades em pacotes do OS:**
Imagens Docker contêm pacotes do sistema operacional (Alpine, Debian) que acumulam vulnerabilidades independentemente do ciclo de atualização dos pacotes Node.js. Uma imagem `postgres:18.3-alpine` com uma vulnerabilidade crítica no `openssl` ou `glibc` não seria detectada por ferramentas focadas exclusivamente em dependências npm — requer scanning específico de camadas de container.

**Código-fonte com falhas de segurança introduzidas por contribuidores:**
Em um projeto open-source com rotatividade de colaboradores, a probabilidade de introdução acidental de falhas de segurança no código TypeScript — injeção, validação inadequada de entrada, exposição de segredos, gerenciamento incorreto de tokens — é proporcional ao número de contribuidores. Code review manual não substitui análise estática automatizada (SAST) integrada ao fluxo de PR.

**Ausência de evidência de conformidade para auditorias LGPD:**
A LGPD exige não apenas que medidas de segurança sejam adotadas, mas que possam ser demonstradas em caso de auditoria ou incidente. Um histórico de scans de segurança automatizados — com resultados documentados no GitHub Security tab — constitui evidência auditável de diligência técnica.

A questão central é: **como cobrir proativamente as quatro superfícies de ataque do stack do MissionApp ao longo de todo o ciclo de vida do desenvolvimento — do commit local ao container em produção — de forma integrada ao fluxo de PR e sem custo para um projeto open-source?**

## Decisão

Adotaremos o **Snyk** como plataforma de detecção e correção de vulnerabilidades do MissionApp Backend.

O Snyk é uma plataforma de segurança para desenvolvedores que combina análise de composição de software (SCA), análise estática de código-fonte (SAST), scanning de imagens de container e análise de configuração de infraestrutura como código em uma única ferramenta integrada. Fundado em 2015 e com integração nativa ao GitHub, é amplamente adotado em projetos open-source e corporativos por detectar vulnerabilidades no fluxo de Pull Request — antes que código inseguro chegue ao branch principal.

A cobertura abrange quatro camadas integradas ao fluxo de desenvolvimento:

**1. Snyk Open Source (SCA — Software Composition Analysis):**
Scanning de dependências Node.js declaradas em `package.json` e `pnpm-lock.yaml`. O Snyk analisará o grafo completo de dependências — diretas e transitivas — contra sua base de dados de CVEs. Vulnerabilidades encontradas em dependências transitivas (que o `pnpm-lock.yaml` torna rastreáveis) serão sinalizadas com severidade (Critical, High, Medium, Low) e com o caminho de dependência que introduz o risco.

**2. Snyk Container:**
Scanning das imagens Docker referenciadas no `Dockerfile` de produção e no `docker-compose.yaml`. O Snyk inspecionará pacotes do sistema operacional nas camadas da imagem, identificando CVEs em bibliotecas do OS além dos pacotes da aplicação.

**3. Snyk Code (SAST — Static Application Security Testing):**
Análise estática do código TypeScript em `app/` para identificação de padrões de vulnerabilidade no código-fonte: SQL injection, path traversal, exposição de variáveis de ambiente sensíveis em logs, validação inadequada de entrada e outras categorias do OWASP Top 10.

**4. Snyk Infrastructure as Code:**
Scanning do `docker-compose.yaml` e arquivos de configuração de infraestrutura para detecção de misconfigurations — serviços expostos sem autenticação, ausência de limites de recursos, volumes com permissões excessivas.

**Integração com o ciclo de desenvolvimento:**

Em cada Pull Request, uma GitHub Action executará `snyk test` (Open Source) e `snyk code test` (SAST). O resultado será publicado no GitHub Security tab via SARIF — expondo vulnerabilidades diretamente na interface de PR, inline com as linhas de código afetadas. PRs que introduzirem vulnerabilidades de severidade High ou Critical bloquearão o merge até que sejam corrigidas ou explicitamente aceitas como risco documentado.

Em pushes para `main`, o scan de container (`snyk container test`) será executado adicionalmente, garantindo que a imagem de produção seja verificada em cada build de release.

**Complementaridade com o Renovate ([ADR-0011](./0011-adocao-do-renovate-para-atualizacao-automatica-de-dependencias.md)):**
O Renovate e o Snyk têm responsabilidades distintas e complementares. O Renovate mantém dependências atualizadas por critério de versão e schedule configurado. O Snyk responde a CVEs com urgência proporcional à severidade — independente do schedule do Renovate. Uma vulnerabilidade crítica publicada hoje pode exigir um PR de correção antes da próxima janela de atualização do Renovate; o Snyk detecta isso imediatamente e pode abrir um PR de fix automaticamente.

## Justificativa

O Snyk foi escolhido por cobrir as quatro superfícies de ataque identificadas com integração nativa ao GitHub e custo zero para repositórios públicos:

- **Cobertura de dependências transitivas com rastreabilidade pelo `pnpm-lock.yaml`:** O Snyk constrói o grafo completo de dependências a partir do lockfile — incluindo dependências de segundo e terceiro nível — e identifica o caminho exato que introduz cada CVE. Isso é crítico para projetos que usam pnpm com isolamento estrito ([ADR-0007](./0007-adocao-do-pnpm-como-gerenciador-de-pacotes.md)): o lockfile é o grafo autoritativo de dependências e o Snyk o utiliza como fonte de verdade.

- **Scanning de container como proteção além do npm:** Vulnerabilidades em pacotes do OS das imagens Docker não são detectadas por ferramentas focadas em npm. O Snyk Container inspeciona as camadas da imagem e mapeia CVEs em bibliotecas do sistema, cobrindo a superfície de ataque que o Renovate e o `pnpm audit` não alcançam.

- **SAST integrado ao fluxo de PR com feedback inline:** O Snyk Code publica resultados de análise estática diretamente na interface de PR do GitHub — inline com as linhas de código afetadas — via SARIF e GitHub Code Scanning. Contribuidores recebem feedback de segurança no mesmo contexto em que revisam código, sem precisar consultar um painel externo separado.

- **Bloqueio de PRs que introduzem novas vulnerabilidades:** A integração com GitHub permite configurar status checks obrigatórios baseados nos resultados do Snyk. Um PR que introduz uma dependência com CVE High não pode ser mergeado sem revisão explícita — prevenindo a introdução acidental de vulnerabilidades por contribuidores que não monitoram feeds de segurança.

- **Fix PRs automáticos para CVEs conhecidos:** Quando o Snyk identifica uma vulnerabilidade em uma dependência com versão corrigida disponível, pode abrir um PR automaticamente com a atualização — com o changelog da versão e a descrição do CVE corrigido. Para CVEs críticos, isso elimina a dependência do schedule do Renovate e reduz a janela de exposição.

- **Análise de alcançabilidade (reachability analysis):** O Snyk analisa o grafo de chamadas da aplicação para determinar se o código vulnerável de uma dependência é efetivamente chamado pelo código do MissionApp. Uma vulnerabilidade em uma função que nunca é invocada tem prioridade menor do que uma que está no caminho crítico de autenticação. Isso reduz o ruído de alertas e direciona atenção para os riscos reais.

- **Evidência auditável de conformidade LGPD:** O histórico de scans publicado no GitHub Security tab — com timestamps, severidades, status de resolução e decisões de aceite de risco documentadas — constitui evidência técnica auditável de que o projeto adota medidas proativas de segurança para proteger os dados pessoais processados. Isso é diretamente relevante para demonstrar conformidade com o Art. 46 da LGPD em caso de incidente ou auditoria.

- **Gratuito para repositórios públicos open-source:** O Snyk oferece testes ilimitados para repositórios públicos — sem limite de testes, sem restrição de funcionalidades e sem custo. O MissionApp Backend, sendo open-source, se enquadra nessa categoria.

## Alternativas Consideradas

- **GitHub Dependabot Security Alerts:** Alertas de segurança nativos do GitHub para dependências com CVEs conhecidos, sem custo e sem configuração adicional. Descartado como solução exclusiva porque: (1) cobre apenas dependências npm — não faz scanning de imagens Docker nem análise estática de código (SAST); (2) não possui análise de alcançabilidade — todos os CVEs em dependências são reportados com a mesma prioridade, independentemente de o código vulnerável ser chamado; (3) não bloqueia PRs que introduzem novas vulnerabilidades via status check configurável; (4) não gera fix PRs com contexto do CVE e changelog. O Dependabot Security Alerts pode coexistir com o Snyk como camada adicional de alertas no GitHub, mas não é substituto para a cobertura completa do Snyk.

- **OWASP Dependency-Check:** Ferramenta open-source de SCA que verifica dependências contra o NVD (National Vulnerability Database) da NIST. Descartada porque: (1) é uma ferramenta CLI sem integração nativa com fluxo de PR do GitHub — gera relatórios HTML/XML que precisam ser consumidos manualmente ou via scripts customizados; (2) não cobre imagens Docker nem SAST; (3) a base de dados do NVD tem latência de publicação maior do que a do Snyk, que combina múltiplas fontes (NVD, GitHub Security Advisories, banco próprio) para detecção mais rápida; (4) não possui mecanismo de fix PRs automáticos.

- **Trivy (Aqua Security):** Scanner de vulnerabilidades open-source, gratuito e sem limites, com excelente suporte a containers e IaC. Considerado como alternativa séria. Descartado porque: (1) a integração com IDE para feedback em tempo real de escrita de código é mais limitada que a do Snyk — o Trivy é primariamente uma ferramenta CLI e CI/CD; (2) não possui análise de alcançabilidade para priorização de CVEs; (3) o fix PR automático não é uma funcionalidade nativa do Trivy — requer integração adicional com Renovate ou scripts customizados para propor correções; (4) a DX de interpretação dos resultados no contexto de PR é inferior à do Snyk com GitHub Code Scanning. O Trivy pode ser adotado como complemento específico para scanning de containers em estágios futuros, dado seu modelo completamente open-source e sem limites.

- **`pnpm audit` em CI/CD:** Executar `pnpm audit` como step no pipeline para detectar vulnerabilidades em dependências npm. Descartado como solução exclusiva porque: (1) cobre apenas dependências npm — não cobre imagens Docker, SAST nem IaC; (2) não tem análise de alcançabilidade; (3) não possui integração com GitHub Security tab via SARIF; (4) não abre fix PRs automaticamente; (5) os resultados são exibidos apenas nos logs de CI, sem visibilidade inline no contexto de PR. O `pnpm audit` pode ser mantido como verificação adicional rápida no pipeline, mas não substitui a cobertura completa do Snyk.

- **SonarQube / SonarCloud:** Plataforma de qualidade de código com capacidades SAST. Descartada porque: (1) o foco principal é qualidade de código (code smells, cobertura, duplicação) — as capacidades de detecção de vulnerabilidades de segurança são menos maduras que as do Snyk Code para o perfil de ameaças de uma API Node.js; (2) não cobre SCA (dependências com CVE) nem scanning de containers — seria necessário combinar com outra ferramenta para atingir a mesma cobertura do Snyk; (3) o plano gratuito do SonarCloud tem limitações para projetos com muitas linhas de código. O SonarCloud pode ser adotado no futuro como ferramenta complementar de qualidade de código, não de segurança.

## Consequências (Trade-offs)

### Positivas / Benefícios

- **Cobertura de segurança em todo o ciclo de vida:** Do commit local (IDE plugin) ao merge (PR check) ao deploy (container scan em CI/CD) — cada etapa do desenvolvimento tem cobertura ativa de vulnerabilidades, sem dependência de revisão manual.

- **Bloqueio proativo de regressões de segurança:** PRs que introduzem CVEs High/Critical não chegam a `main` sem revisão explícita — a vulnerabilidade é interceptada antes de entrar na base de código de produção.

- **Priorização inteligente via reachability analysis:** A análise de alcançabilidade reduz o ruído de alertas ao distinguir vulnerabilidades em código que é efetivamente chamado daquelas em código morto ou nunca invocado — permitindo que os mantenedores foquem nos riscos reais.

- **Evidência de conformidade LGPD documentada:** O histórico de scans no GitHub Security tab fornece rastreabilidade das medidas de segurança adotadas — relevante para demonstrar diligência técnica em caso de incidente ou auditoria regulatória.

- **Fix PRs com contexto completo:** PRs de correção gerados pelo Snyk incluem a descrição do CVE, a versão vulnerável, a versão corrigida, o changelog e o caminho de dependência — reduzindo o esforço de avaliação de impacto pelos mantenedores.

### Negativas / Riscos

- **Ruído de falsos positivos em análise estática (SAST):** O Snyk Code pode sinalizar padrões de código como potencialmente vulneráveis em contextos onde o risco é mitigado por validação em outra camada (ex: VineJS antes do controller). A equipe precisará definir uma política de triagem de alertas para distinguir falsos positivos de vulnerabilidades reais — e documentar aceites de risco para que não sejam re-reportados indefinidamente.

- **Limite de testes em repositórios privados:** O plano gratuito do Snyk é ilimitado para repositórios públicos, mas impõe limites por período de cobrança para repositórios privados (400 testes para Open Source, 100 para Code, 300 para IaC, 100 para Container). O MissionApp Backend é open-source e público, portanto não enfrenta esses limites atualmente. Se o repositório se tornar privado em algum momento, a estratégia de plano precisará ser reavaliada.

- **Latência adicional no pipeline de CI/CD:** Os steps de `snyk test` e `snyk code test` adicionam tempo ao pipeline de PR. O impacto deve ser monitorado e os scans de menor urgência (IaC, container) devem ser configurados para rodar apenas em pushes para `main`, não em todos os PRs — balanceando cobertura e velocidade de feedback.

- **Dependência de serviço de terceiro para postura de segurança:** O Snyk é um serviço externo (SaaS). Indisponibilidade do Snyk durante o pipeline de CI/CD pode bloquear merges se o status check for obrigatório. A configuração dos status checks deve diferenciar entre falha do scan (vulnerabilidade encontrada) e falha do serviço (Snyk indisponível) — apenas o primeiro deve bloquear o merge.

## Referências

- [Snyk Open Source — Scanning de dependências](https://docs.snyk.io/scan-with-snyk/snyk-open-source): documentação do scanning de vulnerabilidades em dependências npm/pnpm
- [Snyk — Reachability analysis](https://docs.snyk.io/manage-risk/prioritize-issues-for-fixing/reachability-analysis): análise de alcançabilidade para priorizar vulnerabilidades realmente exploráveis
- [Snyk — GitHub Actions](https://docs.snyk.io/developer-tools/snyk-ci-cd-integrations/github-actions-for-snyk-setup-and-checking-for-vulnerabilities): integração do Snyk no pipeline de CI via GitHub Actions
- [Snyk — Container test](https://docs.snyk.io/snyk-cli/commands/container-test): scanning de vulnerabilidades em imagens Docker
- [ADR-0011](./0011-adocao-do-renovate-para-atualizacao-automatica-de-dependencias.md): Renovate para atualização de dependências, complementar ao Snyk na gestão de segurança
- [ADR-0007](./0007-adocao-do-pnpm-como-gerenciador-de-pacotes.md): pnpm como gerenciador cujo lockfile é base do scanning do Snyk

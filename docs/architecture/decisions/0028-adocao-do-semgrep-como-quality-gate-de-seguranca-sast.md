# [ADR-0028]: Adoção do Semgrep CE como Quality Gate de Segurança (SAST)

## Dados

- **Status:** 🔵 Em Uso
- **Data:** 2026-07-01
- **Proponentes:** [Allber Ferreira](https://github.com/AFSFerreira)

---

## Contexto e Problema

O MissionApp processa dados sensíveis sob a LGPD — afiliação religiosa, dados bancários de apoiadores e tokens de autenticação — e implementa autenticação JWT personalizada (`app/auth/guards/jwt.ts`) sem usar um pacote de auth de prateleira. Esse contexto impõe dois riscos distintos que o [ADR-0012](./0012-adocao-do-snyk-para-deteccao-de-vulnerabilidades.md) (Snyk) não cobre por completo:

**Vulnerabilidades introduzidas no código-fonte por contribuidores:**
O Snyk Open Source e o Snyk Container varrem dependências e imagens Docker, mas não analisam o código TypeScript escrito pelo projeto. Padrões inseguros introduzidos por contribuidores — injeção de SQL via query raw, exposição de secrets em logs, headers de segurança ausentes, validação de entrada inadequada, uso incorreto de algoritmos criptográficos — passam invisíveis pelo Snyk e pelo `tsc`. O Snyk Code (SAST) existe, mas opera exclusivamente como serviço SaaS: o código-fonte é enviado para os servidores da Snyk para análise, o que conflita com o princípio de minimizar exposição de código a plataformas de terceiros adotado no projeto.

**Ausência de gate automatizado para código-fonte no PR:**
Revisão de código detecta problemas estruturais de design, mas revisores humanos não escaneiam sistematicamente cada PR contra bases de regras de segurança com centenas de padrões conhecidos (OWASP Top 10, CWEs, padrões Node.js inseguros). Sem gate automatizado, a probabilidade de um padrão inseguro chegar a `main` em um projeto open-source com rotatividade de contribuidores é não-trivial.

A questão central é: **como detectar automaticamente padrões inseguros no código TypeScript do MissionApp em cada Pull Request, sem enviar o código-fonte para serviços externos, sem limites de uso e sem vendor lock-in?**

## Decisão

Adotaremos o **Semgrep Community Edition (CE)** como ferramenta de análise estática de segurança (SAST) e quality gate de código-fonte do MissionApp Backend.

O Semgrep é uma ferramenta de análise estática open-source (LGPL-2.1) mantida pela Semgrep Inc., que escaneia código-fonte contra bases de regras usando correspondência de padrões sintáticos em AST (_Abstract Syntax Tree_). Suporta 30+ linguagens com mais de 3.000 regras mantidas pela comunidade. A edição Community Edition roda **completamente offline como binário** — nenhum código-fonte é enviado para servidores externos durante o scan, o que é determinante dado o perfil de dados do MissionApp sob LGPD.

### Posição no ecossistema de segurança do projeto

O Semgrep CE é **complementar**, não substituto, ao Snyk ([ADR-0012](./0012-adocao-do-snyk-para-deteccao-de-vulnerabilidades.md)). As duas ferramentas cobrem superfícies de ataque distintas:

| Ferramenta | O que analisa |
|---|---|
| Snyk Open Source | Vulnerabilidades (CVEs) em dependências `package.json` |
| Snyk Container | Pacotes do OS em imagens Docker |
| Snyk IaC | Misconfigurations em `docker-compose.yaml` |
| **Semgrep CE** | **Padrões inseguros no código-fonte TypeScript do projeto** |

O Snyk Code (SAST do Snyk) foi desconsiderado em favor do Semgrep CE por razões documentadas na seção de Alternativas.

### Rule packs adotados

O Semgrep organiza regras em _packs_ temáticos publicados no Semgrep Registry. Os packs selecionados para o MissionApp:

| Pack | Justificativa |
|---|---|
| `p/typescript` | Regras específicas para padrões TypeScript inseguros |
| `p/nodejs` | Padrões inseguros do ecossistema Node.js (path traversal, prototype pollution, eval inseguro) |
| `p/secrets` | Detecção de secrets hardcoded — crítico para projeto open-source onde o repositório é público |
| `p/owasp-top-ten` | Cobertura das 10 categorias de vulnerabilidade mais comuns em aplicações web (injeção, exposição de dados, autenticação quebrada, etc.) |
| `p/sql-injection` | Detecção de SQL injection em queries raw — relevante dado que as migrations do Lucid usam DDL direto |

**Por que não usar `--config=auto` junto com packs explícitos:** O flag `--config=auto` detecta as linguagens do projeto e seleciona packs automaticamente — mas sobrepõe com os packs explícitos declarados, gerando achados duplicados no SARIF e aumentando o tempo de scan sem adicionar cobertura nova. A configuração adotada usa apenas packs explícitos, com escolha deliberada de cada um.

### Configuração do workflow

```yaml
# .github/workflows/sast.yml
name: SAST

on:
  pull_request:
  push:
    branches: [main]

permissions:
  security-events: write # necessário para upload do SARIF ao GitHub Security tab

jobs:
  semgrep:
    name: Semgrep SAST
    runs-on: ubuntu-latest
    container:
      image: semgrep/semgrep
    if: |
      github.actor != 'dependabot[bot]' &&
      github.actor != 'renovate[bot]'
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4

      - name: Semgrep scan
        env:
          SEMGREP_SEND_METRICS: 'off' # desativa telemetria — projeto processa dados sensíveis sob LGPD
        run: |
          semgrep scan \
            --config=p/typescript \
            --config=p/nodejs \
            --config=p/secrets \
            --config=p/owasp-top-ten \
            --config=p/sql-injection \
            --error \
            --exclude='.adonisjs' \
            --exclude='client' \
            --exclude='server' \
            --exclude='stubs' \
            --sarif \
            --output=semgrep.sarif

      - name: Upload SARIF ao GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: semgrep.sarif
        if: always() # envia mesmo quando --error falha o step anterior
```

### Decisões de configuração

**`--error`:** Falha o CI automaticamente se qualquer achado de severidade `ERROR` for encontrado. Achados de severidade `WARNING` e `INFO` aparecem no SARIF e na aba Security do GitHub mas não bloqueiam o merge. Isso permite visibilidade progressiva sem travar o pipeline desde o início em projetos novos — o threshold pode ser apertado via `--severity` conforme os findings são triados.

**`SEMGREP_SEND_METRICS: 'off'`:** O Semgrep CE envia métricas de uso (linguagens detectadas, packs usados, tempo de execução) para os servidores da Semgrep Inc. por padrão. Para um projeto que processa dados pessoais sensíveis sob LGPD, qualquer transmissão de metadados de análise de código para terceiros — mesmo que anonimizada — deve ser controlada explicitamente. A variável de ambiente desativa esse comportamento completamente.

**`--exclude` para diretórios gerados:** `.adonisjs/`, `client/` e `server/` são gerados pelos hooks `indexEntities` e `generateRegistry` do AdonisJS e do Tuyau em build-time. Escanear esses diretórios produz falsos positivos em código que o projeto não escreveu e não pode corrigir. `stubs/` contém templates de geração de código do Ace — não são código TypeScript executável.

**`permissions: security-events: write`:** Permissão explícita necessária para a action `github/codeql-action/upload-sarif` publicar no GitHub Security tab. Sem ela, o upload falha silenciosamente com erro 403 em repositórios com permissões restritas pelo `GITHUB_TOKEN` padrão.

**`if: always()` no upload do SARIF:** O step de upload roda mesmo quando o scan falha (exit code 1 por achados). Isso garante que os findings apareçam na aba Security do GitHub para triagem, mesmo quando o CI está bloqueando o merge — sem isso, um PR bloqueado por finding de segurança não teria visibilidade dos findings na interface.

**Exclusão de `renovate[bot]` e `dependabot[bot]`:** PRs abertos por bots de atualização de dependências são compostos exclusivamente de alterações em `package.json` e lockfile — nunca em código TypeScript da aplicação. Rodar SAST nesses PRs seria análise em código não modificado, consumindo runner time sem valor.

### Diff-aware scanning

O Semgrep CE usa _diff-aware scanning_ em Pull Requests: analisa apenas os arquivos modificados no diff em vez de toda a codebase. O tempo mediano de scan em PRs é de aproximadamente 10 segundos — compatível com o pipeline de CI sem introduzir latência perceptível. Em pushes para `main` (sem diff de PR), o scan é full-codebase, mas ocorre uma única vez por merge.

### O que fazer quando o gate falha

Nem todo finding do Semgrep representa uma vulnerabilidade real no contexto do MissionApp. Antes de suprimir um achado, avaliar:

1. **Verificar o contexto do finding:** O Semgrep faz análise _single-file_ (intra-procedural) — não rastreia fluxo de dados entre arquivos. Um finding de "input não sanitizado" pode estar incorreto se a sanitização ocorre no validator VineJS ([ADR-0025](./0025-arquitetura-de-validators-reutilizaveis-com-vinejs.md)) antes de chegar ao código flagado.

2. **Se for falso positivo:** Suprimir inline com comentário obrigatório explicando o motivo:
   ```typescript
   // nosemgrep: typescript.lang.security.audit.something -- validado pelo VineJS no validator antes de chegar aqui
   const query = rawParam
   ```

3. **Se for vulnerabilidade real:** Corrigir antes do merge. Não suprimir vulnerabilidades reais.

4. **Nunca suprimir `p/secrets`:** Findings de secrets hardcoded em repositório público são sempre críticos — não há contexto que justifique manter um secret no código-fonte.

## Justificativa

- **Análise offline sem envio de código-fonte:** O binário do Semgrep CE roda completamente local. Nenhum fragmento de código-fonte, AST ou metadado de análise é enviado para servidores externos durante o scan (com `SEMGREP_SEND_METRICS: 'off'`). Isso é determinante para um projeto que processa dados pessoais sensíveis sob LGPD e que adota como princípio minimizar exposição a plataformas de terceiros.

- **Sem limites de uso:** O Semgrep CE é gratuito sem restrição de testes, PRs, linhas de código ou usuários. Ferramentas SAST SaaS impõem limites no plano gratuito que tornam o gate impraticável em projetos open-source ativos com múltiplos PRs por semana.

- **3.000+ regras da comunidade sem custo:** O Semgrep Registry publica regras mantidas pela comunidade e pela Semgrep Inc. cobrindo OWASP Top 10, CWEs, padrões de framework e detecção de secrets — sem necessidade de subscrição para acesso às regras básicas.

- **Diff-aware scanning para PRs rápidos:** A análise incremental em PRs (~10s mediano) não introduz latência perceptível no pipeline de revisão, ao contrário de ferramentas que reescaneiam a codebase completa em cada PR.

- **Integração nativa com GitHub Security via SARIF:** O formato SARIF permite que findings apareçam diretamente na interface de revisão do PR — inline com as linhas de código afetadas — sem redirecionamento para painel externo. Contribuidores veem o feedback de segurança no mesmo contexto em que revisam código.

- **Complementaridade com Snyk sem sobreposição:** O Semgrep CE cobre a superfície que o Snyk não cobre — o código-fonte TypeScript escrito pelo projeto. As duas ferramentas operam em camadas distintas da stack de segurança sem duplicação de esforço.

## Alternativas Consideradas

**1. Snyk Code (SAST)**

O Snyk Code é o módulo de análise estática de código do Snyk, já adotado para SCA, container e IaC ([ADR-0012](./0012-adocao-do-snyk-para-deteccao-de-vulnerabilidades.md)). Descartado como SAST primário por dois motivos: (1) **o código-fonte é enviado para os servidores da Snyk** para análise — o Snyk Code opera como SaaS, não como binário local; para um projeto que processa dados LGPD, enviar o código para análise remota é uma decisão que requer avaliação de impacto de privacidade que vai além do escopo atual; (2) o plano gratuito do Snyk Code impõe limite de 100 testes por mês para repositórios privados — embora o MissionApp seja público hoje, essa limitação cria fragilidade arquitetural caso o repositório mude de visibilidade. O Snyk Code pode ser adotado no futuro de forma complementar ao Semgrep para cobertura de análise inter-procedural (taint tracking entre arquivos), que o Semgrep CE não oferece.

**2. CodeQL (GitHub)**

Ferramenta de análise semântica de código mantida pelo GitHub, integrada nativamente ao GitHub Actions via `github/codeql-action`. Suporta análise de fluxo de dados inter-procedural (taint tracking) — mais profunda que o Semgrep CE. Descartada porque: (1) o tempo de análise é significativamente maior — CodeQL constrói um banco de dados do código antes de analisar, o que pode levar vários minutos para projetos TypeScript de tamanho médio, contra os ~10s do Semgrep com diff-aware scanning; (2) a escrita de queries customizadas usa QL, uma linguagem de consulta proprietária com curva de aprendizado alta — contribuidores não conseguem escrever ou revisar regras customizadas facilmente; (3) o CodeQL é mantido pelo GitHub/Microsoft, introduzindo dependência de plataforma. O CodeQL pode ser adotado no futuro para análise profunda de fluxo de dados em features de alto risco (autenticação, pagamentos), complementar ao Semgrep.

**3. SonarQube / SonarCloud**

Plataforma de qualidade e segurança de código com SAST integrado. Descartada pelas mesmas razões documentadas no [ADR-0026](./0026-adocao-do-fallow-para-analise-estatica-de-codigo-morto.md): (1) **vendor lock-in** — configuração, histórico de findings e baselines ficam na plataforma; (2) o SonarCloud envia código para servidores externos; (3) o plano gratuito tem limitações para repositórios privados que criam fragilidade futura.

**4. Semgrep AppSec Platform (Semgrep Pro)**

A versão paga do Semgrep, que adiciona análise inter-procedural (taint tracking entre arquivos), regras Pro exclusivas e dashboard gerenciado. Descartada porque: (1) exige conta na Semgrep AppSec Platform — o código é enviado para análise nos servidores da Semgrep Inc., eliminando a vantagem de execução offline; (2) tem custo — incompatível com o modelo open-source sem patrocínio do MissionApp no estágio atual. A migração para Semgrep Pro é possível no futuro sem mudança de ferramenta — o mesmo arquivo de workflow é reaproveitado com adição do `SEMGREP_APP_TOKEN`.

## Consequências (Trade-offs)

### Positivas / Benefícios

- **Gate de segurança de código em todo PR:** Padrões inseguros introduzidos por qualquer contribuidor são detectados automaticamente antes do merge — sem dependência de revisão humana para cobrir centenas de padrões conhecidos.

- **Cobertura de secrets hardcoded em repositório público:** O `p/secrets` detecta tokens, chaves de API e senhas no código-fonte antes que cheguem a `main` — risco particularmente alto em projetos open-source onde o histórico de commits é público.

- **Feedback inline no PR:** Findings aparecem diretamente na interface de revisão do GitHub, inline com as linhas afetadas, sem redirecionamento para painel externo.

- **Sem custo e sem servidor:** O Semgrep CE não requer infraestrutura adicional além do runner do GitHub Actions e não tem limite de uso.

### Negativas / Riscos

- **Análise single-file — sem taint tracking inter-procedural:** O Semgrep CE não rastreia fluxo de dados entre arquivos. Uma vulnerabilidade onde dados não sanitizados entram em `controller A`, passam por `service B` e chegam inseguros em `repository C` não é detectada — o Semgrep veria cada arquivo isoladamente. Esse limite é estrutural da edição CE e requer Semgrep Pro ou CodeQL para cobertura completa.

- **Falsos positivos exigem triagem ativa:** Regras de comunidade não são perfeitas para todos os contextos. O `p/owasp-top-ten` pode sinalizar padrões que são seguros dado o contexto do MissionApp (ex.: input flagado como não sanitizado quando já foi validado pelo VineJS). Suppressions inline precisam ser documentadas — suppressions sem justificativa degradam o sinal da ferramenta.

- **Cobertura dependente dos packs disponíveis:** O Semgrep CE depende de regras da comunidade para o Semgrep Registry. Vulnerabilidades zero-day ou padrões específicos do AdonisJS sem regra publicada não são detectados — o gate não substitui revisão de segurança manual para mudanças arquiteturais críticas.

## Referências

- [Semgrep CE — Documentação oficial](https://semgrep.dev/docs): referência da ferramenta, flags e configuração
- [Semgrep Registry](https://semgrep.dev/r): catálogo de regras e packs disponíveis
- [Semgrep — Diff-aware scanning](https://semgrep.dev/docs/semgrep-ci/running-semgrep-ci-with-a-third-party-ci-provider): comportamento de scan incremental em PRs
- [SARIF — GitHub Code Scanning](https://docs.github.com/en/code-security/code-scanning/integrating-with-code-scanning/sarif-support-for-code-scanning): integração do formato SARIF com o GitHub Security tab
- [ADR-0012](./0012-adocao-do-snyk-para-deteccao-de-vulnerabilidades.md): Snyk para SCA, container e IaC — camada complementar ao Semgrep
- [ADR-0025](./0025-arquitetura-de-validators-reutilizaveis-com-vinejs.md): VineJS como camada de validação de entrada — contexto para avaliação de falsos positivos do Semgrep
- [ADR-0026](./0026-adocao-do-fallow-para-analise-estatica-de-codigo-morto.md): fallow para análise estática de qualidade — contexto do princípio de evitar vendor lock-in aplicado também aqui

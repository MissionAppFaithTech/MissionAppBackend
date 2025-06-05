# [ADR-0030]: Adoção do OWASP ZAP como Quality Gate de Segurança DAST

## Dados

- **Status:** 🟢 Aceito
- **Data:** 2026-07-01
- **Proponentes:** [Allber Ferreira](https://github.com/AFSFerreira)

---

## Contexto e Problema

O Snyk ([ADR-0016](./0016-adocao-do-snyk-para-deteccao-de-vulnerabilidades.md)) cobre dois vetores de segurança via suas duas modalidades: SCA (Snyk Open Source — vulnerabilidades em dependências) e SAST (Snyk Code — vulnerabilidades no código-fonte em repouso). Ambos analisam artefatos estáticos — código e manifests — sem executar a aplicação.

Existe uma terceira categoria de vulnerabilidades que só se manifesta em um sistema em execução: falhas no comportamento HTTP da aplicação. Injeção de cabeçalhos, CORS misconfigured, cookies sem flags `HttpOnly`/`Secure`, endpoints que respondem de forma diferente a payloads malformados, exposição de informações em respostas de erro, clickjacking via ausência de `X-Frame-Options` — essas classes de vulnerabilidade não são detectáveis por análise estática porque dependem de como o servidor interpreta e responde a requisições reais.

O MissionApp processa dados sensíveis sob a LGPD (afiliação religiosa, dados bancários, tokens de autenticação). O Art. 46 da LGPD exige medidas de segurança técnicas aptas a proteger esses dados. A cobertura de segurança até agora — SCA + SAST — é necessária mas não suficiente para demonstrar diligência técnica completa em um processo de auditoria: a superfície HTTP permanece sem verificação automatizada.

A questão central é: **como verificar o comportamento de segurança em runtime da API do MissionApp de forma automatizada, reproduzível e integrada ao pipeline de CI/CD?**

## Decisão

Adotaremos o **OWASP ZAP** (_Zed Attack Proxy_) como ferramenta de DAST (_Dynamic Application Security Testing_) do MissionApp Backend, executado via `zaproxy/action-api-scan` contra o ambiente de staging.

O OWASP ZAP é um proxy de interceptação open-source mantido pela OWASP Foundation, amplamente adotado como padrão de mercado para DAST em pipelines de CI/CD. Diferentemente de ferramentas de análise estática, o ZAP faz requisições HTTP reais contra um endpoint e analisa as respostas — expondo vulnerabilidades que só existem em comportamento de runtime.

A cobertura abrange as principais categorias do OWASP Top 10 detectáveis dinamicamente:

- **A01 — Broken Access Control:** endpoints acessíveis sem autenticação, IDOR via parâmetros de rota
- **A03 — Injection:** SQL injection, command injection em parâmetros de rota e body
- **A05 — Security Misconfiguration:** CORS permissivo, headers de segurança ausentes (`X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`), cookies sem `HttpOnly`/`Secure`
- **A06 — Vulnerable and Outdated Components:** versões de servidor expostas em headers de resposta
- **A07 — Identification and Authentication Failures:** tokens expostos em responses, sessões persistentes além do TTL declarado

### Configuração adotada

```yaml
name: DAST
on:
  workflow_dispatch: # manual — requer staging funcional com openapi.yaml gerado
  # schedule:
  #   - cron: '0 2 * * 1' # toda segunda às 2h contra staging, quando houver staging do projeto disponível

permissions:
  issues: write # necessário para o ZAP criar issues com findings no repositório

jobs:
  zap:
    name: ZAP API Scan
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4

      - name: Autenticar no staging e obter token JWT
        id: auth
        run: |
          TOKEN=$(curl -sf -X POST https://staging.missionapp.com/api/v1/auth/login \
            -H "Content-Type: application/json" \
            -d "{\"email\":\"${{ secrets.STAGING_TEST_EMAIL }}\",\"password\":\"${{ secrets.STAGING_TEST_PASSWORD }}\"}" \
            | jq -r '.token')
          echo "::add-mask::$TOKEN"
          echo "token=$TOKEN" >> $GITHUB_OUTPUT

      - name: ZAP Scan
        uses: zaproxy/action-api-scan@v0.7.0
        with:
          target: 'https://staging.missionapp.com/api/v1'
          format: openapi
          api_spec: 'docs/api/v1/openapi.yaml'
          fail_action: true
          artifact_name: 'zap-dast-report-${{ github.run_id }}'
          # Injeta o token JWT obtido dinamicamente via ZAP Replacer.
          # Token estático seria inviável — TTL de 15 min expiraria durante o scan.
          cmd_options: >-
            -z "
            -config replacer.full_list(0).description=Authorization
            -config replacer.full_list(0).enabled=true
            -config replacer.full_list(0).matchtype=REQ_HEADER
            -config replacer.full_list(0).matchstr=Authorization
            -config replacer.full_list(0).replacement=Bearer ${{ steps.auth.outputs.token }}
            "
```

**Decisões de configuração:**

**`format: openapi` + `api_spec: 'docs/api/v1/openapi.yaml'`:** O ZAP usa o spec OpenAPI estático commitado em `docs/api/v1/openapi.yaml` ([ADR-0027](./0027-documentacao-de-endpoints-com-openapi-estatico-e-scalar.md)) para descobrir todos os endpoints da API automaticamente — rotas, parâmetros, schemas de request e response. Isso elimina a necessidade de crawler ou configuração manual de endpoints e garante cobertura completa do contrato da API sem geração adicional.

**Autenticação dinâmica + ZAP Replacer:** O MissionApp requer autenticação JWT na maioria dos endpoints ([ADR-0023](./0023-estrategia-de-autenticacao-jwt-hibrido-com-revogacao-via-dragonflydb.md)). Sem injetar o header `Authorization`, o scan cobriria apenas as rotas públicas, deixando a superfície de ataque principal — endpoints autenticados — fora do escopo.

Um token estático como GitHub Secret seria inviável: o TTL de acesso JWT é de 15 minutos ([ADR-0023](./0023-estrategia-de-autenticacao-jwt-hibrido-com-revogacao-via-dragonflydb.md)), e um scan ZAP contra uma API com muitos endpoints pode levar até 30 minutos. O token expiraria no meio do scan, tornando inválidas todas as requisições subsequentes.

A solução é autenticação dinâmica: um step anterior ao ZAP chama `POST /api/v1/auth/login` com credenciais de um usuário de teste dedicado ao staging (armazenadas como `STAGING_TEST_EMAIL` e `STAGING_TEST_PASSWORD` em GitHub Secrets), extrai o token JWT da resposta via `jq`, e passa-o para o ZAP via `${{ steps.auth.outputs.token }}`. O ZAP Replacer injeta esse token fresco como `Bearer` em todas as requisições do scan.

**`fail_action: true`:** Findings de severidade High ou Critical encerram o workflow com exit code não-zero, bloqueando o pipeline. O DAST opera como _security quality gate_: o ambiente de staging só avança para aprovação de deploy se a superfície HTTP passar pela verificação.

**`workflow_dispatch` + schedule comentado:** O DAST requer um ambiente de staging funcional e populado para gerar resultados válidos. Enquanto o staging não estiver disponível, o workflow só roda via disparo manual. O schedule semanal (`cron: '0 2 * * 1'`) está configurado para executar toda semana às 14:00.

**`permissions: issues: write`:** A action `zaproxy/action-api-scan` cria GitHub Issues com os findings do scan quando há vulnerabilidades, além de publicar o relatório como artefato de workflow. Isso garante rastreabilidade dos findings fora do contexto de execução do workflow.

**`timeout-minutes: 30`:** O scan ativo do ZAP faz centenas de requisições por endpoint e pode ser lento para APIs com muitos recursos. O limite de 30 minutos evita que o job fique pendurado indefinidamente em caso de problemas de conectividade com o staging.

### Posicionamento na camada de segurança

O DAST complementa — não substitui — as ferramentas de análise estática já adotadas:

| Camada | Ferramenta       | O que detecta                    | Quando roda                |
| ------ | ---------------- | -------------------------------- | -------------------------- |
| SCA    | Snyk Open Source | CVEs em dependências npm         | PR + push main + semanal   |
| SAST   | Snyk Code        | Vulnerabilidades no código-fonte | PR + push main + semanal   |
| DAST   | OWASP ZAP        | Comportamento HTTP em runtime    | Manual + semanal (staging) |

As três camadas são necessárias porque cada uma detecta um conjunto distinto de vulnerabilidades — há pouca sobreposição entre elas. Uma API com dependências seguras (SCA ✓), código sem padrões vulneráveis (SAST ✓) pode ainda ter CORS misconfigured ou cookies sem flags de segurança (DAST detecta, as outras não).

## Justificativa

- **Padrão de mercado para DAST open-source:** O OWASP ZAP é mantido pela OWASP Foundation — a organização que define o Top 10 de vulnerabilidades web — e é referência global para DAST em pipelines de CI/CD. Projetos open-source sem orçamento para ferramentas comerciais (Burp Suite Enterprise, StackHawk, Invicti) usam o ZAP como alternativa direta de qualidade equivalente.

- **Integração direta com o spec OpenAPI já existente:** A action `zaproxy/action-api-scan` aceita o arquivo `openapi.yaml` diretamente para descoberta automática de endpoints. Como o MissionApp já mantém `docs/api/v1/openapi.yaml` estático e commitado ([ADR-0027](./0027-documentacao-de-endpoints-com-openapi-estatico-e-scalar.md)), não há configuração adicional nem geração de spec em runtime — o mesmo arquivo que documenta a API para consumidores é o que o ZAP usa para cobrir todos os endpoints do scan.

- **Análise dinâmica cobre a lacuna das ferramentas estáticas:** SAST analisa o que o código _diz_ que faz. DAST verifica o que o servidor _realmente_ faz. Misconfigurações de CORS, ausência de security headers, comportamento de sessão e exposição de informações em erros são invisíveis para análise estática porque dependem de como o framework, o middleware e o ambiente compõem a resposta HTTP real.

- **Cobertura autenticada via login dinâmico + ZAP Replacer:** O step de autenticação obtém um token JWT fresco a cada execução do workflow, eliminando o problema de expiração (TTL de 15 min do access token é menor que a duração do scan). O token é injetado via ZAP Replacer em todas as requisições, garantindo que o scan atinja os endpoints protegidos por `middleware.auth()` — a maioria da superfície de ataque do MissionApp. Um DAST sem autenticação cobre apenas endpoints públicos e tem valor limitado para uma API predominantemente autenticada.

- **Alinhamento com o princípio de evitar vendor lock-in:** O OWASP ZAP é open-source (Apache 2.0), autocontido, sem conta obrigatória, sem transmissão de código para terceiros, sem limites de uso. Alternativas comerciais como StackHawk e Invicti exigem conta SaaS e têm custos recorrentes — incompatíveis com o modelo open-source do MissionApp e com o princípio de evitar dependências de plataforma estabelecido em outras decisões de infraestrutura do projeto.

- **Evidência de conformidade LGPD:** O histórico de scans DAST — com relatórios de findings, timestamps e status de resolução arquivados como GitHub Issues e artefatos de workflow — complementa o histórico de scans SCA/SAST do Snyk como evidência auditável de diligência técnica sob o Art. 46 da LGPD.

## Alternativas Consideradas

**1. StackHawk**

Plataforma de DAST baseada no OWASP ZAP com interface SaaS e integração nativa ao GitHub Actions. Descartada porque: (1) requer conta na plataforma StackHawk — vendor lock-in de plataforma SaaS, incompatível com o princípio adotado em outras decisões do projeto; (2) custo recorrente para projetos além do tier gratuito limitado; (3) o engine subjacente é o próprio OWASP ZAP — usar a action oficial `zaproxy/action-api-scan` diretamente elimina o intermediário sem perda de capacidade técnica; (4) diferente do Snyk (mantido no pipeline), cujo tier gratuito atende confortavelmente um projeto open-source pequeno, o StackHawk carece de um tier de entrada equivalente, e sua estrutura de pricing se mostrou instável entre fontes e ao longo do tempo — risco adicional como dependência externa.

**2. Nuclei (ProjectDiscovery)**

Scanner de vulnerabilidades baseado em templates YAML, extremamente rápido e com biblioteca de templates comunitária extensa. Descartado porque: (1) é primariamente um scanner de CVEs e misconfigurações conhecidas — não faz scan ativo estilo fuzzer como o ZAP, com menor cobertura de vulnerabilidades de lógica de aplicação; (2) não tem integração nativa com specs OpenAPI para descoberta automática de endpoints — requer configuração manual ou scripts adicionais; (3) a integração com GitHub Actions é mais manual que a action oficial do ZAP. Nuclei pode complementar o ZAP em estágios futuros para detecção de CVEs em componentes de infraestrutura.

**3. Burp Suite Enterprise**

Padrão da indústria para pentest manual e DAST automatizado, com capacidades superiores ao ZAP para análise avançada. Descartado porque: (1) é uma plataforma comercial com licença anual de custo elevado — inviável para um projeto open-source sem orçamento; (2) vendor lock-in severo de configurações e findings; (3) o OWASP ZAP cobre as categorias do OWASP Top 10 suficientemente para o perfil de risco do MissionApp — Burp Enterprise não agrega valor proporcional ao custo para este contexto.

**4. `pnpm audit` + headers manuais em code review**

Alternativa sem custo de ferramental: checar dependências via `pnpm audit` (já coberto pelo Snyk) e validar security headers manualmente em code review. Descartada porque: (1) code review manual de comportamento HTTP não é reproduzível nem sistemático — depende de quem revisa e de quando; (2) não detecta comportamento dinâmico como respostas de erro que expõem stack traces, CORS que varia por origin, ou cookies inconsistentes com a configuração declarada; (3) não gera evidência auditável de verificação periódica — necessária para conformidade LGPD.

## Consequências (Trade-offs)

### Positivas / Benefícios

- **Cobertura da superfície HTTP em runtime:** Vulnerabilidades que só existem em comportamento de servidor — misconfigurações de CORS, security headers ausentes, cookies sem flags de segurança, exposição de informações em respostas de erro — passam a ter verificação automatizada periódica.

- **Scan autenticado cobre a superfície real da API:** Com o token injetado via ZAP Replacer, o scan atinge os endpoints protegidos por `middleware.auth()` — onde está a maior parte da lógica de negócio sensível do MissionApp.

- **Integração zero-config com o spec OpenAPI existente:** Nenhuma configuração adicional de endpoints é necessária — o `openapi.yaml` já commitado é a fonte de descoberta. Novos endpoints adicionados ao spec são automaticamente incluídos no próximo scan.

- **Evidência auditável de verificação periódica:** GitHub Issues geradas pelo scan e artefatos de relatório constituem histórico rastreável de que a superfície HTTP é verificada regularmente — relevante para demonstrar conformidade com o Art. 46 da LGPD.

### Negativas / Riscos

- **Dependência de ambiente de staging funcional:** O DAST é inútil sem um ambiente em execução. Enquanto o staging não estiver disponível, o workflow só pode ser executado manualmente em ambientes locais ou temporários — limitando o valor de quality gate contínuo.

- **Usuário de teste dedicado no staging:** As credenciais `STAGING_TEST_EMAIL` e `STAGING_TEST_PASSWORD` precisam corresponder a um usuário criado especificamente para o scan DAST — com permissões suficientes para exercitar os endpoints relevantes, mas sem dados reais. Esse usuário deve existir apenas no staging e as credenciais nunca devem ser reutilizadas em produção. A criação e manutenção desse usuário adiciona overhead operacional ao provisionamento do ambiente de staging.

- **Falsos positivos que exigem triagem:** O ZAP pode reportar findings que não são exploráveis no contexto do MissionApp (ex: ausência de headers relevantes apenas para aplicações com renderização de HTML, não para APIs JSON). A equipe precisará definir uma política de triagem e aceite de risco para findings recorrentes.

- **Scan ativo pode gerar dados espúrios no staging:** O ZAP faz requisições de fuzzing que podem criar registros no banco de dados do staging (posts, campanhas, usuários falsos gerados pelo scan). O ambiente de staging deve ter um processo de limpeza periódica ou o scan deve ser executado contra um estado de banco reinicializado.

- **Latência do scan:** Scans ZAP contra APIs com muitos endpoints podem levar de 10 a 30 minutos. O timeout configurado em 30 minutos é adequado para o tamanho atual da API, mas deve ser reavaliado conforme a API cresce.

## Referências

- [OWASP ZAP — documentação oficial](https://www.zaproxy.org/docs/): referência completa da ferramenta
- [zaproxy/action-api-scan](https://github.com/zaproxy/action-api-scan): GitHub Action oficial para scan de APIs com OpenAPI
- [ZAP Replacer](https://www.zaproxy.org/docs/desktop/addons/replacer/): mecanismo de injeção de headers usado para autenticação no scan
- [OWASP Top 10](https://owasp.org/www-project-top-ten/): referência das categorias de vulnerabilidades cobertas pelo scan
- [ADR-0016](./0016-adocao-do-snyk-para-deteccao-de-vulnerabilidades.md): Snyk para SCA e SAST — camadas complementares ao DAST
- [ADR-0023](./0023-estrategia-de-autenticacao-jwt-hibrido-com-revogacao-via-dragonflydb.md): estratégia de autenticação JWT — contexto para a configuração do token no scan
- [ADR-0027](./0027-documentacao-de-endpoints-com-openapi-estatico-e-scalar.md): spec OpenAPI estático — fonte de descoberta de endpoints para o ZAP

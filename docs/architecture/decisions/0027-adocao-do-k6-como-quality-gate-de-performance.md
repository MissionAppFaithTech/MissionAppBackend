# [ADR-0027]: Adoção do k6 como Ferramenta de Load Testing e Quality Gate de Performance

## Dados

- **Status:** 🔵 Em Uso
- **Data:** 2026-07-01
- **Proponentes:** [Allber Ferreira](https://github.com/AFSFerreira)

---

## Contexto e Problema

O MissionApp é uma plataforma de conexão entre missionários e apoiadores que, por natureza, terá picos de acesso concentrados: campanhas de arrecadação, lançamentos de projetos, notificações em massa. O sistema precisa sustentar **1.000 usuários simultâneos** como baseline de capacidade — não como pico extremo, mas como carga normal de operação esperada.

À medida que o projeto cresce com contribuidores voluntários, cada feature adicionada pode introduzir regressões de performance silenciosas: uma query N+1 em um novo relacionamento Lucid, um middleware que bloqueia a event loop, uma serialização ineficiente no transformer. Revisão de código detecta problemas estruturais, mas não detecta degradação de latência que só se manifesta sob carga.

Sem um gate automatizado de performance, duas situações se repetem em projetos open-source:

**Regressões invisíveis até a produção:** Uma feature que degrada p95 de 120ms para 800ms passa por todos os testes unitários e funcionais sem nenhum diagnóstico. O problema só aparece quando usuários reais relatam lentidão em produção — quando o custo de reverter é alto.

**Ausência de linha de base documentada:** Sem medições formais de throughput e latência, decisões arquiteturais futuras (trocar ORM, adicionar cache, mudar estratégia de serialização) não têm referência para avaliar impacto. "Ficou mais rápido" não é mensurável sem baseline.

A questão central é: **como detectar regressões de performance automaticamente e garantir que o MissionApp sustente 1.000 usuários simultâneos com latência e taxa de erro dentro de limites definidos, sem depender de teste manual após cada mudança?**

## Decisão

Adotaremos o **k6** como ferramenta de load testing e quality gate de performance do MissionApp Backend.

O k6 é uma ferramenta de código aberto para load testing, desenvolvida em Go e mantida pela Grafana Labs. Scripts de teste são escritos em JavaScript (com suporte a TypeScript via bundler), o que elimina a curva de aprendizado de DSLs proprietárias. O k6 executa como binário local ou em CI/CD sem dependência de servidor central, expõe métricas via saída padrão e integra com Prometheus, Grafana e InfluxDB para observabilidade avançada — sem exigir conta em plataforma externa para o fluxo básico de CI.

### Tipos de teste e quando executar cada um

O k6 suporta múltiplos perfis de carga com propósitos distintos. O MissionApp adotará três:

| Tipo | Objetivo | VUs | Duração | Quando rodar |
|---|---|---|---|---|
| **Smoke** | Verificar que o endpoint responde corretamente com carga mínima | 1–5 | 1–2 min | Pode rodar em PR para sanidade básica |
| **Load** | Validar comportamento sob carga normal esperada (1.000 VUs) | 0 → 1.000 → 0 | 5–10 min | Merge para `main` ou manual |
| **Stress** | Descobrir o ponto de ruptura além da carga esperada | 0 → 2.000+ → 0 | 10–15 min | Manual, antes de releases maiores |

Stress tests não são quality gates de CI — seu objetivo é mapear o limite do sistema, não bloquear deploy. Load tests são os gates relevantes para o pipeline.

### Thresholds como quality gates

Thresholds no k6 são critérios de passa/falha que encerram o processo com exit code 1 quando violados — o que faz o CI falhar automaticamente sem nenhuma configuração adicional.

Os thresholds adotados para o MissionApp:

| Métrica | Threshold | Justificativa |
|---|---|---|
| `http_req_duration` p(95) | `< 500ms` | 95% das requisições devem responder em menos de 500ms — limiar de experiência aceitável para aplicações web |
| `http_req_duration` p(99) | `< 1500ms` | 1% dos usuários pode ter latência maior, mas não deve ultrapassar 1.5s — acima disso a experiência é considerada ruim |
| `http_req_failed` | `< 1%` | Taxa de erro (HTTP 4xx/5xx ou timeout) abaixo de 1% da carga total |

**Por que p(95) e não média?** A média esconde cauda de latência. Se 950 requisições respondem em 100ms e 50 respondem em 5.000ms, a média fica em ~344ms — aparentemente aceitável — mas 5% dos usuários vivem uma experiência inaceitável. O p(95) garante que a maioria dos usuários tenha uma experiência dentro do threshold definido. O p(99) protege a cauda extrema.

### Exemplo de teste de load

```javascript
// tests/performance/load/feed.js
import http from 'k6/http'
import { check, group, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

const errorRate = new Rate('custom_errors')
const feedLatency = new Trend('feed_latency', true)

const BASE_URL = __ENV.BASE_URL ?? 'https://staging.missionapp.com'
const TOKEN = __ENV.TEST_TOKEN

export const options = {
  stages: [
    { duration: '1m', target: 100 },   // aquecimento gradual
    { duration: '2m', target: 500 },   // carga intermediária
    { duration: '3m', target: 1000 },  // carga sustentada (target do MissionApp)
    { duration: '1m', target: 0 },     // descida controlada
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1500'],
    http_req_failed: ['rate<0.01'],
    custom_errors: ['rate<0.01'],
    feed_latency: ['p(95)<500'],
  },
}

export default function () {
  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    Accept: 'application/json',
  }

  group('feed público', () => {
    const res = http.get(`${BASE_URL}/api/v1/feed`, { headers, tags: { name: 'feed' } })

    const ok = check(res, {
      'status 200': (r) => r.status === 200,
      'content-type json': (r) => r.headers['Content-Type']?.includes('application/json'),
      'body não vazio': (r) => (r.json('data')?.length ?? 0) > 0,
    })

    errorRate.add(!ok)
    feedLatency.add(res.timings.duration)
  })

  sleep(1)
}
```

O `sleep(1)` simula o tempo que um usuário real leva entre requisições (think time) — sem ele, cada VU dispara requisições em loop apertado, simulando um cenário de stress irreal para um quality gate de load.

### Organização dos testes de performance

```
tests/performance/
├── load/
│   ├── feed.js          # endpoint principal do feed
│   └── auth.js          # fluxo de autenticação sob carga
└── smoke/
    └── healthcheck.js   # sanidade mínima — pode rodar em PR
```

Cada endpoint crítico terá seu próprio arquivo de teste. Endpoints não críticos (admin, backoffice) não são cobertos pelo gate de load — o foco é no caminho que usuários finais percorrem.

### Integração com CI/CD

O gate de performance não deve rodar em todo Pull Request. O motivo é estrutural: testes de load precisam de um ambiente com infraestrutura real e isolada (staging com banco de dados populado, Redis ativo, rede similar à produção). Rodar contra `localhost` ou ambientes efêmeros de PR produziria métricas sem significado — e adicionaria 7–10 minutos a cada pipeline de PR.

O gate de performance roda em dois contextos:

1. **Merge para `main`** — automaticamente, garantindo que nada que entra na branch principal viola os thresholds.
2. **Execução manual** — via `workflow_dispatch`, para testar branches específicas antes de merge quando há suspeita de regressão ou quando uma mudança arquitetural relevante precisa ser validada.

```yaml
# .github/workflows/performance.yml
name: Performance Gate

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      base_url:
        description: 'URL base do ambiente alvo'
        required: false
        default: 'https://staging.missionapp.com'

jobs:
  load-test:
    name: Load Test — 1.000 VUs
    runs-on: ubuntu-latest
    timeout-minutes: 20

    steps:
      - uses: actions/checkout@v4

      - name: Instalar k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring \
            --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
            --keyserver hkp://keyserver.ubuntu.com:80 \
            --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] \
            https://dl.k6.io/deb stable main" \
            | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update && sudo apt-get install k6

      - name: Executar gate de performance — feed
        run: k6 run tests/performance/load/feed.js --out json=results/feed.json
        env:
          BASE_URL: ${{ inputs.base_url || 'https://staging.missionapp.com' }}
          TEST_TOKEN: ${{ secrets.STAGING_TEST_TOKEN }}

      - name: Publicar resultados como artefato
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: k6-results-${{ github.run_id }}
          path: results/
          retention-days: 30
```

O `if: always()` no upload de artefato garante que os resultados sejam preservados mesmo quando o gate falha — o que é essencial para diagnóstico de regressão.

### O que fazer quando o gate falha

Falha no threshold não necessariamente significa que a feature introduziu a regressão. Antes de reverter:

1. **Verificar se o ambiente de staging estava saudável** no momento do teste (Redis saturado, banco lento por migration recente, etc.).
2. **Comparar com a última execução bem-sucedida** — os artefatos ficam preservados por 30 dias.
3. **Rodar o smoke test localmente** contra staging para isolar se o problema é no endpoint ou na infraestrutura.
4. **Identificar a query ou middleware** responsável com `fallow health` para complexidade e o profiler do Node.js para I/O.

## Justificativa

- **Scripts em JavaScript sem DSL proprietária:** Desenvolvedores familiarizados com o stack do projeto já sabem escrever testes k6. Não há Scala (Gatling), XML (JMeter) ou Python (Locust) — o contexto de aprendizado é mínimo.

- **Binário standalone sem servidor central:** O k6 roda como binário único — sem master node, sem cluster de workers, sem banco de dados de histórico obrigatório. Isso elimina infraestrutura adicional para o pipeline de CI e mantém o gate funcionando mesmo em projetos open-source sem orçamento para serviços gerenciados.

- **Thresholds como exit code:** O k6 falha o processo automaticamente quando um threshold é violado, sem necessidade de scripts de parsing de output. `k6 run` retorna exit code 0 (sucesso) ou 1 (threshold violado) — o CI interpreta diretamente.

- **Sem vendor lock-in:** O k6 é open-source (licença AGPL-3.0) e executa completamente offline. A plataforma k6 Cloud (SaaS da Grafana Labs) existe como opção de distribuição de carga em múltiplas regiões geográficas, mas não é necessária para o gate de CI do MissionApp. Dados de performance e histórico de execuções ficam nos artefatos do GitHub Actions — não em plataforma de terceiro. Isso está alinhado ao princípio de minimizar vendor lock-in adotado em outras decisões do projeto ([ADR-0015](./0015-adocao-do-bruno-como-cliente-http-oficial.md), [ADR-0026](./0026-adocao-do-fallow-para-analise-estatica-de-codigo-morto.md)).

- **Métricas customizadas e extensibilidade:** O k6 expõe `Rate`, `Trend`, `Counter` e `Gauge` como métricas customizadas exportáveis. Quando o MissionApp adotar Grafana para observabilidade, os resultados de load test podem ser enviados diretamente para o mesmo dashboard de métricas de produção via `--out influxdb` ou `--out prometheus`, sem adaptadores adicionais.

## Alternativas Consideradas

**1. Apache JMeter**

Ferramenta de load testing com histórico extenso e suporte a múltiplos protocolos. Descartada porque: (1) scripts são definidos em XML via interface gráfica — versionamento em Git é difícil de ler e revisar; (2) o modo de execução distribuída requer configuração de master/slave nodes, inviável sem infraestrutura dedicada; (3) a curva de aprendizado para contribuidores novos é significativamente maior que scripts JavaScript.

**2. Locust**

Ferramenta open-source de load testing com scripts em Python. Descartada porque: (1) introduz dependência de runtime Python num projeto 100% Node.js/TypeScript; (2) o modelo de coroutines do Locust (`gevent`) tem overhead de configuração maior do que o modelo de VUs do k6 para o perfil de testes do MissionApp; (3) a integração com CI/CD para fail automático por threshold requer parsing de output, não é nativa.

**3. Gatling**

Ferramenta de load testing com DSL em Scala e suporte oficial a JavaScript via Gatling JS (beta). Descartada porque: (1) a DSL em Scala é opaca para desenvolvedores JavaScript — barreira de contribuição alta; (2) Gatling JS ainda é beta sem garantia de estabilidade; (3) a JVM como dependência adiciona peso ao ambiente de CI.

**4. Artillery**

Ferramenta de load testing com scripts em YAML/JavaScript, focada em Node.js. Considerada como alternativa séria dado o stack do projeto. Descartada porque: (1) o modo de carga distribuída requer Artillery Pro (pago) para cenários acima de alguns centenas de VUs num único worker — o MissionApp precisa de 1.000 VUs de forma confiável; (2) o ecossistema de integrações e plugins é menor que o do k6; (3) a documentação e exemplos para cenários avançados de threshold são mais limitados.

**5. k6 Cloud (Grafana Cloud k6)**

Plataforma SaaS da Grafana Labs que orquestra execuções distribuídas de k6 em múltiplas regiões geográficas. Descartada como solução primária pelo mesmo motivo que o Code Climate foi descartado para análise de qualidade ([ADR-0026](./0026-adocao-do-fallow-para-analise-estatica-de-codigo-morto.md)): **vendor lock-in**. Histórico de execuções, configuração de thresholds e resultados ficam na plataforma, não no repositório. O plano gratuito tem limite de 50 VUs — insuficiente para o target de 1.000 VUs do MissionApp. O k6 Cloud pode ser adotado no futuro para testes de carga geográfica distribuída em releases maiores, mas não como gate padrão de CI.

## Consequências (Trade-offs)

### Positivas / Benefícios

- **Regressões de performance detectadas antes de chegar a `main`:** Qualquer mudança que degrada p95 além de 500ms ou eleva a taxa de erro acima de 1% é bloqueada automaticamente no pipeline de merge.

- **Baseline documentada e versionada:** Scripts de teste de performance vivem no repositório junto ao código — o histórico de como os thresholds evoluíram é rastreável via `git log`, assim como a configuração dos cenários.

- **Sem infraestrutura adicional para o fluxo de CI:** O k6 roda como binário no runner do GitHub Actions. Não requer Redis, banco de dados de métricas ou orquestrador dedicado para o gate básico.

- **Extensível para observabilidade avançada:** Quando o MissionApp adotar Prometheus e Grafana, os resultados de load test podem ser integrados ao stack de observabilidade existente sem mudança de ferramenta.

### Negativas / Riscos

- **Dependência de staging funcional:** O gate de performance é inútil sem um ambiente de staging com dados representativos e infraestrutura similar à produção. Se staging estiver degradado, o gate falha por razões alheias ao código — exigindo investigação adicional antes de concluir que há regressão.

- **Não cobre performance de frontend:** O k6 testa endpoints HTTP. Métricas de Core Web Vitals (LCP, CLS, INP), tempo de renderização e performance percebida pelo usuário são fora do escopo desta ferramenta.

- **1.000 VUs de um único runner podem ser insuficientes para simular carga geográfica real:** Tráfego real vem de múltiplas regiões com latências distintas. Um único runner do GitHub Actions simula carga concentrada geograficamente, o que pode não reproduzir fielmente o comportamento sob tráfego mundial. Para o estágio atual do projeto, essa limitação é aceitável.

- **Manutenção dos scripts junto com a API:** Mudanças na API (renomear endpoints, adicionar autenticação obrigatória, alterar formato de resposta) exigem atualização correspondente nos scripts de performance. Scripts desatualizados falham por razões erradas (endpoint não encontrado) e perdem o valor de gate.

## Referências

- [Documentação oficial do k6](https://k6.io/docs): referência completa da API, executores e métricas
- [k6 — Thresholds](https://k6.io/docs/using-k6/thresholds): configuração de quality gates e exit codes
- [k6 — Tipos de teste](https://k6.io/docs/test-types): smoke, load, stress e soak — quando usar cada um
- [k6 — Métricas customizadas](https://k6.io/docs/using-k6/metrics/create-custom-metrics): `Rate`, `Trend`, `Counter`, `Gauge`
- [ADR-0026](./0026-adocao-do-fallow-para-analise-estatica-de-codigo-morto.md): fallow para análise estática — contexto do princípio de evitar vendor lock-in aplicado também aqui

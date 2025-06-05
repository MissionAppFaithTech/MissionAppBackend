# [ADR-0027]: Adoção do Fallow para Análise Estática de Código Morto

## Dados

- **Status:** 🔵 Em Uso
- **Data:** 2026-06-30
- **Proponentes:** [Allber Ferreira](https://github.com/AFSFerreira)

---

## Contexto e Problema

Em projetos open-source com múltiplos contribuidores, código morto acumula silenciosamente: arquivos criados para features que foram reescritas, exports definidos mas nunca consumidos, dependências adicionadas e esquecidas. O TypeScript verifica tipos mas não detecta código estruturalmente inatingível — um arquivo que existe mas nunca é importado por nenhum entry point é transpilado normalmente pelo `tsc` sem qualquer diagnóstico. Tree shaking resolve esse problema em projetos com bundler (Webpack, esbuild, Rollup), mas opera silenciosamente: remove o arquivo do bundle de saída sem reportar o que foi descartado, e o MissionApp Backend não possui bundler — o AdonisJS executa os arquivos TypeScript compilados diretamente no Node.js via `tsc`.

O MissionApp Backend agrava esse risco pela característica do AdonisJS: boa parte dos arquivos de aplicação — controllers, middlewares, validators, listeners — não são importados diretamente pelo código do projeto. São descobertos e carregados pelo framework em runtime via IoC container, decorators ou convenções de diretório. Isso significa que o simples fato de um arquivo não ter importadores estáticos não é evidência de que ele está morto — e, ao mesmo tempo, é exatamente o padrão que um arquivo genuinamente morto exibiria.

A questão central é: **como detectar código morto em `app/` de forma confiável, sem falsos positivos gerados pela arquitetura IoC do AdonisJS?**

## Decisão

Adotaremos o **fallow** como ferramenta de análise estática de código morto do MissionApp Backend.

O fallow é um analisador de codebase TypeScript/JavaScript desenvolvido em Rust que detecta código morto, dependências não utilizadas, duplicação de código e hotspots de complexidade via análise do grafo de imports. Diferentemente de linters de qualidade de código genéricos, o fallow constrói um grafo de dependências a partir de entry points configuráveis e identifica o que é — e o que não é — alcançável a partir desses pontos. A configuração via `.fallowrc.json` permite ajustar entry points, ignorar padrões de arquivo e definir regras por glob, o que é essencial para coexistir com a arquitetura IoC do AdonisJS sem gerar ruído.

### Configuração adotada

A configuração em `.fallowrc.json` é dividida em três camadas:

**1. Entry points (`entry`)**

Arquivos que o AdonisJS carrega via IoC, preloads ou CLI — e que, portanto, nunca são importados por outros arquivos no grafo estático — são declarados como entry points explícitos. Sem isso, fallow não teria como alcançar controllers, middlewares e validators a partir de `bin/server.ts`, e toda a codebase apareceria como morta.

```json
"entry": [
  "bin/*.ts",
  "adonisrc.ts",
  "ace.js",
  "start/**/*.ts",
  "config/**/*.ts",
  "providers/**/*.ts",
  "commands/**/*.ts",
  "database/migrations/**/*.ts",
  "tests/**/*.spec.ts",
  "tests/bootstrap.ts"
]
```

- `start/**/*.ts` — preloads do AdonisJS (`routes.ts`, `kernel.ts`, `validator.ts`) nunca são importados: o framework os carrega via `preloads` em `adonisrc.ts` em runtime.
- `config/**/*.ts` — carregados pelo framework via injeção de configuração, não por import direto.
- `providers/**/*.ts` — registrados em `adonisrc.ts` e instanciados pelo IoC container.
- `commands/**/*.ts` — descobertos pelo Ace CLI via diretório, não via import.
- `database/migrations/**/*.ts` — executados individualmente pelo Lucid CLI, cada um como entry point independente.
- `tests/bootstrap.ts` — carregado pelo Japa via configuração em `bin/test.ts`, não via import.

**2. Padrões ignorados (`ignorePatterns`)**

Diretórios gerados em build-time são excluídos completamente da análise. Analisá-los produziria falsos positivos de exports nunca importados no código-fonte.

```json
"ignorePatterns": [
  ".adonisjs/**",
  "client/**",
  "server/**",
  "stubs/**",
  "tmp/**",
  "bruno/**"
]
```

- `.adonisjs/**`, `client/**`, `server/**` — gerados pelos hooks `indexEntities` e `generateRegistry` do AdonisJS e do Tuyau em tempo de build.
- `stubs/**` — templates de geração de código do Ace; não são código TypeScript da aplicação.
- `tmp/**` — diretório de arquivos temporários em runtime; não contém código da aplicação.
- `bruno/**` — coleções de requisições HTTP para uso em desenvolvimento; não pertencem ao grafo de dependências.

**3. Membros de classe sempre usados (`usedClassMembers`)**

Métodos chamados via padrão interno do projeto — sem referência estática rastreável pelo analisador — são declarados como sempre usados para suprimir falsos positivos de `unused-class-members` na extensão VS Code do fallow.

```json
"usedClassMembers": ["toObject"]
```

`toObject` é o método do padrão de transformers do projeto (`app/transformers/**`), invocado pela camada de apresentação sem chamada estática direta. O supressor via `overrides` (que desativa `unused-class-members` em `app/transformers/**`) funciona corretamente no CLI, mas a extensão VS Code do fallow lê apenas a configuração de nível raiz e ignora `overrides` — por isso `toObject` também precisa constar em `usedClassMembers`. Métodos de guards e outros contratos do AdonisJS são tratados via `// fallow-ignore-next-line unused-class-member` inline no arquivo, que é respeitado tanto pelo CLI quanto pela extensão.

### Escopo das regras

**`unused-files`** é a regra de maior valor para o projeto no estado atual. É desativada globalmente e reativada via `overrides` apenas em `app/` — o único diretório onde um arquivo não importado é evidência de código morto genuíno. Fora de `app/`, a ausência de importadores é comportamento esperado do framework.

**`circular-dependency` em `app/models/**`** é suprimida via `// fallow-ignore-file circular-dependency` nos models afetados. O padrão de relationships do Lucid ORM usa callbacks lazy (`@hasMany(() => Post)`) justamente para quebrar ciclos em runtime — o ciclo detectado no grafo estático não existe em execução. Dependências circulares em outros diretórios continuam sendo reportadas.

**`unused-class-members` em `app/auth/**`e`app/transformers/**`** é desativada via `overrides` para o CLI (onde a supressão por override funciona).

**`code-duplication` intencional** é suprimida via comentário inline `// fallow-ignore-file code-duplication`. Um exemplo prático é o bloco `createdAt` duplicado entre `with_created_at.ts` e `with_timestamps.ts`: compor `WithTimestamps` via `WithCreatedAt` introduziria complexidade de tipagem com `NormalizeConstructor` e acoplaria a evolução dos dois mixins. Ambos encapsulam a mesma regra de negócio (normalização UTC para PostgreSQL `TIMESTAMP WITHOUT TIME ZONE`) de forma independente.

**`duplicates` e `health` em `bin/**`e`database/migrations/**`** são ignorados via configuração de nível raiz. Os arquivos `bin/` são boilerplate do AdonisJS com estrutura intencional (três entry points distintos). Migrations são intencionalmente verbosas por natureza (DDL completo de tabela numa função).

### Política de supressões

O fallow oferece três mecanismos de supressão com escopos distintos. A escolha do mecanismo correto é tão importante quanto a decisão de suprimir — supressão com escopo excessivo silencia achados futuros legítimos sem deixar rastro de intenção.

**Mecanismos disponíveis:**

```typescript
// fallow-ignore-next-line <rule-id> -- motivo obrigatório
código que seria sinalizado

// fallow-ignore-file <rule-id> -- motivo obrigatório
// (no topo do arquivo, suprime a regra em todo o arquivo)
```

```typescript
// .fallowrc.json — supressão por glob (escopo mais amplo)
"overrides": [{ "files": ["app/auth/**"], "rules": { "unused-class-members": "off" } }]
"usedClassMembers": ["toObject"]
```

**Quando suprimir é legítimo:**

| Situação                                                                   | Mecanismo recomendado                                |
| -------------------------------------------------------------------------- | ---------------------------------------------------- |
| Método chamado pelo framework via IoC/duck typing, sem referência estática | `// fallow-ignore-next-line` no método               |
| Dependência circular estrutural do ORM, inexistente em runtime             | `// fallow-ignore-file circular-dependency` no model |
| Duplicação intencional e documentadamente justificada                      | `// fallow-ignore-file code-duplication`             |
| Diretório inteiro com comportamento estruturalmente diferente              | `overrides` em `.fallowrc.json`                      |
| Método de padrão interno sem chamada estática, afetando extensão VS Code   | `usedClassMembers` em `.fallowrc.json`               |

**Quando NÃO suprimir:**

- Achado real que exige refatoração ou cobertura de testes — suprimir adia o problema, não o resolve.
- Achado não entendido — se o motivo não é claro o suficiente para escrever em uma linha, a supressão não está justificada.
- Conveniência — suprimir para fazer o CI passar sem investigar o achado derrota o propósito da ferramenta.

**Regra de ouro para o comentário de justificativa:**

O motivo deve responder: _"por que este achado específico não é um problema real aqui?"_ — não _"o fallow está reclamando deste código"_.

```typescript
// ❌ motivo insuficiente
// fallow-ignore-next-line unused-class-member

// ❌ motivo que não explica o "por quê"
// fallow-ignore-next-line unused-class-member -- método não usado

// ✅ motivo que explica a invariante estrutural
// fallow-ignore-next-line unused-class-member -- contrato GuardContract; chamado pelo auth do AdonisJS via IoC, não por import direto
```

Suppressions sem justificativa devem ser tratadas como bug nas contributing guidelines — equivalem a `// eslint-disable` sem motivo.

### O que é monitorado de fato

Com a configuração acima, o output do `pnpm fallow` reflete achados reais, sem falsos positivos de framework:

| Regra                                  | Escopo ativo                                                 | Sinal esperado                                |
| -------------------------------------- | ------------------------------------------------------------ | --------------------------------------------- |
| `unused-files`                         | `app/**`                                                     | Arquivos criados e nunca importados/usados    |
| `unused-exports`                       | Todo o projeto                                               | Exports definidos mas sem consumidores        |
| `unused-class-members`                 | Todo o projeto (exceto `app/auth/**`, `app/transformers/**`) | Métodos/propriedades sem referências externas |
| `unused-dependencies`                  | `package.json` (exceto lista ignorada)                       | Dependências sem uso estático                 |
| `circular-dependency`                  | Todo o projeto (exceto `app/models/**`)                      | Ciclos de import fora do padrão Lucid         |
| `code-duplication`                     | Todo o projeto (exceto `bin/**`, `database/migrations/**`)   | Blocos idênticos que devem ser extraídos      |
| `health` (cyclomatic, cognitive, CRAP) | Todo o projeto (exceto `bin/**`, `database/migrations/**`)   | Funções com complexidade acima dos thresholds |

### Métricas de saúde e CRAP score

O fallow calcula três métricas de complexidade por função:

- **Cyclomatic complexity** — número de caminhos de execução independentes (`if`, `else`, `for`, `while`, `catch`, operadores ternários, `&&`, `||`). Threshold: 20.
- **Cognitive complexity** — quanto esforço mental é necessário para entender o fluxo, penalizando aninhamento mais fortemente que ramificações sequenciais. Threshold: 15.
- **CRAP score** (_Change Risk Anti-Patterns_) — combina complexidade ciclomática com cobertura de testes. A fórmula:

$$\text{CRAP}(m) = \text{comp}(m)^2 \times \left(1 - \frac{\text{cov}(m)}{100}\right)^2 + \text{comp}(m)$$

onde $\text{comp}(m)$ é a complexidade ciclomática da função e $\text{cov}(m)$ é a porcentagem de cobertura de testes (0–100). Threshold: 30.

A fórmula revela a relação entre complexidade e cobertura: uma função com cyclomatic 6 e 0% de cobertura tem CRAP de 42; a mesma função com 100% de cobertura tem CRAP de 6. O CRAP score penaliza desproporcionalmente código complexo sem testes — que é exatamente o código mais arriscado de modificar.

Por padrão, o fallow estima cobertura por referências no grafo de exports (85% para referências diretas, 40% para indiretas, 0% para sem referências), o que subestima a cobertura real. O MissionApp possui testes instrumentados com cobertura via Japa/V8, permitindo que o relatório real seja integrado via:

```bash
node ace test --coverage
fallow health --coverage coverage/coverage-final.json
```

**Estratégias para reduzir CRAP scores altos:**

1. **Aumentar cobertura de testes** — o caminho de menor resistência. Uma função com CRAP 42 e cyclomatic 6 cai para CRAP 6 com 100% de cobertura, saindo do threshold.
2. **Reduzir complexidade ciclomática** — extrair blocos de `if`/`catch` em funções auxiliares com nome descritivo. Cyclomatic mais baixo reduz o CRAP mesmo sem cobertura.
3. **Ambos combinados** — o ideal. Cobertura sem refatoração mantém o risco de modificação latente; refatoração sem cobertura não é verificável.

Funções com CRAP acima de 30 devem ser priorizadas como candidatos a refatoração ou cobertura de testes antes de qualquer modificação.

**Tabela de referência de pontuação CRAP:**

| Pontuação | Avaliação  | Ação recomendada                                                                                                     |
| --------- | ---------- | -------------------------------------------------------------------------------------------------------------------- |
| 0 – 5     | Excelente  | Código simples e/ou bem testado. Nenhuma ação necessária.                                                            |
| 6 – 15    | Aceitável  | Limite de alerta. Acompanhar se a complexidade aumentar.                                                             |
| 16 – 30   | Alto Risco | Refatoração recomendada. Adicionar testes urgentemente.                                                              |
| > 30      | Crítico    | Inaceitável. Código perigoso de manter — refatorar ou cobrir com testes é obrigatório antes de qualquer modificação. |

## Justificativa

- **Grafo de dependências com entry points configuráveis:** A maioria das ferramentas de dead code detection parte do pressuposto de que todo arquivo deve ser alcançável via imports. O fallow permite declarar entry points explicitamente — o que é essencial para coexistir com o IoC do AdonisJS sem tratar toda a codebase como morta.

- **Configuração granular por glob:** `overrides` por padrão de arquivo permitem ativar e desativar regras por diretório, possibilitando que `unused-files` seja uma regra de erro em `app/` mas silenciosa em `config/` e `providers/`, onde a ausência de importadores é estrutural.

- **Suppression inline documentada:** O mecanismo `// fallow-ignore-file <rule>` permite suprimir achados individuais com justificativa no próprio arquivo — ao contrário de suppression por fingerprint ou exclusão global de pasta, que silencia o diretório inteiro sem rastro de intenção.

- **Análise local, sem SaaS:** O fallow roda completamente offline. Nenhum código-fonte é enviado para serviços externos, o que é relevante para um projeto que futuramente processará dados sensíveis sob LGPD.

- **CRAP scores com cobertura real:** O fallow aceita `coverage-final.json` gerado por Istanbul/V8 (`fallow health --coverage coverage/coverage-final.json`) para calcular scores de complexidade com base em linhas efetivamente cobertas por testes — em vez da estimativa por grafo de referências. O MissionApp já possui testes instrumentados com cobertura via Japa/V8, e a integração com o relatório de cobertura real está disponível via `node ace test --coverage && fallow health --coverage coverage/coverage-final.json`.

## Alternativas Consideradas

**1. Knip**

Ferramenta de dead code detection popular no ecossistema TypeScript, com suporte explícito a múltiplos frameworks incluindo AdonisJS. O fallow foi preferido por oferecer análise de duplicação e complexidade integrada na mesma ferramenta, e por ter o mecanismo de `overrides` por glob mais expressivo. O fallow possui comando `fallow migrate` que converte configurações do knip — indicando compatibilidade conceitual suficiente para migração futura se necessário.

**2. ESLint com `eslint-plugin-unused-imports`**

O ESLint já está configurado no projeto ([`eslint.config.js`](../../eslint.config.js)) e detecta imports não utilizados em nível de arquivo individual. Não detecta arquivos inteiros sem importadores, não constrói grafo de dependências e não distingue entre exports públicos consumidos por outros arquivos e exports genuinamente mortos. Permanece ativo como ferramenta complementar de qualidade de código — não é substituto para análise de grafo.

**3. `tsc --noUnusedLocals --noUnusedParameters`**

Flags do TypeScript que detectam variáveis e parâmetros locais não usados. Operam em nível de símbolo local, não de arquivo ou export. Não detectam arquivos sem importadores, exports sem consumidores ou dependências não usadas. Permanecem como verificação de compilação — escopo diferente do fallow.

**4. Code Climate Quality**

Plataforma SaaS de análise de qualidade de código com métricas de complexidade, duplicação e cobertura integradas ao GitHub. Descartada por dois motivos centrais: (1) **vendor lock-in** — toda a análise ocorre em servidores da Code Climate; configurações, histórico de métricas e baselines ficam presos na plataforma, tornando a migração custosa. O MissionApp adota como princípio evitar dependências de plataformas SaaS quando existe alternativa equivalente executável localmente — conforme aplicado em outras decisões de infraestrutura do projeto. O fallow roda completamente offline, sem transmitir código-fonte para terceiros, o que é igualmente relevante sob a perspectiva LGPD. (2) **custo para repositórios privados** — o plano gratuito do Code Climate é limitado a projetos open-source públicos; qualquer movimento para repositório privado exigiria contrato pago, enquanto o fallow não tem restrições de visibilidade de repositório.

**5. SonarQube Community Edition**

Plataforma de análise de qualidade de código com métricas de complexidade, duplicação, cobertura e capacidades SAST. Possui quality gates configuráveis, rastreamento histórico de métricas e integração com GitHub para bloqueio de PRs. É a referência do mercado para análise de qualidade de código, com adoção ampla em projetos corporativos e open-source.

Descartado pelos seguintes motivos:

**Overhead de infraestrutura incompatível com o modelo do projeto.** O SonarQube é uma aplicação Java com requisito mínimo de 2 GB de RAM e banco de dados persistente (H2 embutido para CE ou PostgreSQL externo). Para um projeto open-source sem orçamento de infraestrutura dedicado, manter um servidor SonarQube ativo representa custo operacional real — que o fallow elimina por ser um binário Rust sem servidor, sem runtime e sem estado persistente.

**Inviável para pre-push hook.** Uma análise SonarQube completa leva minutos — incompatível com o modelo de verificação local adotado no projeto. A decisão de antecipar verificações de qualidade para o pre-push (execução sub-segundo, feedback imediato antes do push) já está tomada; o SonarQube é estruturalmente incompatível com esse modelo. O fallow roda a análise de diff em frações de segundo, viabilizando o gate local sem bloquear o fluxo de trabalho.

**TypeScript como cidadão secundário.** O SonarQube foi construído primariamente para Java e adicionou suporte a TypeScript retroativamente. O fallow foi desenvolvido especificamente para o ecossistema JS/TS — entende o grafo de módulos do Node.js, os aliases de path do `package.json`, e padrões de carregamento dinâmico comuns em frameworks como o AdonisJS. A distinção se torna relevante na análise de dead code: o SonarQube detecta código não utilizado no nível de símbolo local, mas não constrói o grafo de alcançabilidade módulo a módulo que o fallow usa para identificar arquivos e exports genuinamente mortos no contexto de um IoC container.

**Capacidades de segurança da Community Edition são limitadas.** O principal argumento para o SonarQube — análise de segurança mais madura, com taint analysis, detecção de injection e relatórios OWASP/CWE — está disponível nas edições Developer e Enterprise. A Community Edition, que é a versão gratuita, tem capacidades SAST significativamente reduzidas. No MissionApp, a análise de segurança é responsabilidade do Snyk Code ([ADR-0014](./0014-adocao-do-snyk-para-deteccao-de-vulnerabilidades.md)) — ferramenta dedicada a esse domínio, com reachability analysis e cobertura de OWASP Top 10 na versão gratuita para repositórios públicos. A divisão de responsabilidades entre fallow (qualidade estrutural: código morto, complexidade, duplicação) e Snyk (segurança: CVEs, SAST) é mais precisa do que concentrar ambas em uma única plataforma com suporte desigual a cada domínio.

O SonarQube tem vantagens reais que o fallow não oferece: rastreamento histórico de métricas ao longo do tempo (tendências de cobertura entre releases, evolução da dívida técnica) e quality gates com thresholds configuráveis por métrica. Essas capacidades não têm equivalente direto no fallow, e podem justificar uma revisão dessa decisão em estágios futuros — especialmente se o projeto crescer para múltiplas equipes e a governança de qualidade por métricas históricas se tornar prioridade.

## Consequências (Trade-offs)

### Positivas / Benefícios

- **Prevenção de acúmulo de código morto em `app/`:** Qualquer arquivo adicionado em `app/` sem ser importado por nenhum entry point é reportado como `unused-file` — prevenindo que features descartadas deixem arquivos órfãos na codebase.

- **Dependências declaradas vs usadas:** `unused-dependencies` detecta pacotes adicionados ao `package.json` e esquecidos — comuns em projetos open-source onde contribuidores adicionam dependências para experimentar e não as removem ao reverter.

- **Análise de complexidade com cobertura real:** A integração com `coverage-final.json` via Japa/V8 já está disponível — os CRAP scores refletem linhas efetivamente cobertas pelos testes em vez de estimativa por grafo de referências.

### Negativas / Riscos

- **`usedClassMembers` é lista global sem escopo por classe:** `"toObject"` na lista suprime o diagnóstico para qualquer método com esse nome em qualquer classe do projeto. Se um método `toObject()` genuinamente morto for adicionado em outra classe fora de `app/transformers/**`, o fallow não o reportará via extensão VS Code. O risco é baixo no estado atual da codebase, mas cresce com o número de contribuidores. Métodos de guards e contratos do AdonisJS são suprimidos via `// fallow-ignore-next-line unused-class-member` inline — abordagem com escopo preciso que não tem esse efeito colateral.

- **Manutenção da configuração junto com o framework:** Novos arquivos que o AdonisJS carregue via IoC em versões futuras precisam ser declarados em `entry` para não gerar falsos positivos. Upgrades de major do AdonisJS devem incluir revisão de `.fallowrc.json`.

- **Suppressions inline exigem disciplina dos contribuidores:** O mecanismo `// fallow-ignore-file` requer que quem suprime um achado entenda o motivo. Suppressions sem justificativa — ou usadas para silenciar achados reais — degradam o sinal da ferramenta.

## Referências

- [Documentação do fallow](https://docs.fallow.tools): referência da ferramenta adotada
- [fallow — dead-code](https://docs.fallow.tools/explanations/dead-code): explicação das regras de código morto, incluindo `unused-files`, `unused-exports` e `unused-class-members`
- [fallow — duplication](https://docs.fallow.tools/explanations/duplication#clone-groups): explicação da detecção de duplicação por análise de suffix-array
- [ADR-0020](./0020-padrao-de-composicao-de-mixins-para-comportamentos-compartilhados-em-models.md): padrão de mixins no Lucid — contexto para a supressão de `circular-dependencies` em `app/models/**`
- [ADR-0021](./0021-estrategia-de-autenticacao-jwt-hibrido-com-revogacao-via-dragonflydb.md): guard JWT implementado em `app/auth/guards/jwt.ts` — contexto para a supressão de `unused-class-members` em `app/auth/**`

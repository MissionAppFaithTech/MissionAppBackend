# [ADR-0026]: Adoção do Fallow para Análise Estática de Código Morto

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

A configuração em `.fallowrc.json` é dividida em quatro camadas:

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
- `bruno/**` — coleções de requisições HTTP para uso em desenvolvimento; não pertencem ao grafo de dependências.

**3. Dependências ignoradas (`ignoreDependencies`)**

Dependências carregadas em runtime pelo framework via configuração — sem nenhum import estático no código-fonte — são declaradas explicitamente para suprimir falsos positivos de `unused-dependencies`.

```json
"ignoreDependencies": ["better-sqlite3", "pg", "hot-hook"]
```

- `better-sqlite3` e `pg` — drivers de banco de dados selecionados pelo Lucid em runtime com base em `config/database.ts`; nenhum arquivo do projeto os importa diretamente.
- `hot-hook` — utilizado pelo `bin/server.ts` durante HMR em desenvolvimento, resolvido pelo bundler, não por import estático.

**4. Membros de classe sempre usados (`usedClassMembers`)**

Métodos de contrato do AdonisJS — chamados pelo framework via duck typing, não por referência estática — são declarados como sempre usados para evitar falsos positivos de `unused-class-members`.

```json
"usedClassMembers": ["toObject", "check", "authenticateAsClient", "createUserForGuard", "findById"]
```

Esses métodos implementam interfaces do framework (`GuardContract`, `BaseTransformer`) e são chamados via dispatch em runtime. Nenhum arquivo do projeto os chama diretamente — o que é exatamente o padrão de um método morto, mas que aqui é estrutural. Confirmar via referência estática não é possível: nem `JwtGuard.prototype.check` nem `(instance as JwtGuard<any>).check` registrados no grafo de imports alteram o diagnóstico do fallow, porque o analisador rastreia chamadas tipadas, não acessos de propriedade.

### Escopo das regras

**`unused-files`** é a regra de maior valor para o projeto no estado atual. É desativada globalmente e reativada via `overrides` apenas em `app/` — o único diretório onde um arquivo não importado é evidência de código morto genuíno. Fora de `app/`, a ausência de importadores é comportamento esperado do framework.

**`circular-dependencies` em `app/models/**`** é suprimida via `// fallow-ignore-file circular-dependencies` nos models afetados. O padrão de relationships do Lucid ORM usa callbacks lazy (`@hasMany(() => Post)`) justamente para quebrar ciclos em runtime — o ciclo detectado no grafo estático não existe em execução. Dependências circulares em outros diretórios continuam sendo reportadas.

**`unused-class-members` em `app/auth/**`e`app/transformers/**`** é desativada via `overrides` para o CLI (onde a supressão por override funciona). Para a extensão de editor — que não processa `overrides` — a supressão é feita via `usedClassMembers` no top-level, conforme descrito acima.

**`code-duplication` em `app/models/mixins/with_timestamps.ts`** é suprimida via comentário inline `// fallow-ignore-file code-duplication`. O bloco `createdAt` duplicado entre `with_created_at.ts` e `with_timestamps.ts` é intencional: compor `WithTimestamps` via `WithCreatedAt` introduziria complexidade de tipagem com `NormalizeConstructor` e acoplaria a evolução dos dois mixins. Ambos encapsulam a mesma regra de negócio (normalização UTC para PostgreSQL `TIMESTAMP WITHOUT TIME ZONE`) de forma independente.

**`duplicates` e `health` em `bin/**`e`database/migrations/**`** são ignorados via configuração. Os arquivos `bin/` são boilerplate do AdonisJS com estrutura intencional (três entry points distintos). Migrations são intencionalmente verbosas por natureza (DDL completo de tabela numa função).

### O que é monitorado de fato

Com a configuração acima, o output do `pnpm fallow` reflete achados reais, sem falsos positivos de framework:

| Regra                                  | Escopo ativo                                                 | Sinal esperado                                |
| -------------------------------------- | ------------------------------------------------------------ | --------------------------------------------- |
| `unused-files`                         | `app/**`                                                     | Arquivos criados e nunca importados/usados    |
| `unused-exports`                       | Todo o projeto                                               | Exports definidos mas sem consumidores        |
| `unused-class-members`                 | Todo o projeto (exceto `app/auth/**`, `app/transformers/**`) | Métodos/propriedades sem referências externas |
| `unused-dependencies`                  | `package.json` (exceto lista ignorada)                       | Dependências sem uso estático                 |
| `circular-dependencies`                | Todo o projeto (exceto `app/models/**`)                      | Ciclos de import fora do padrão Lucid         |
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

**Atualmente**, o fallow estima cobertura por referências no grafo de exports (85% para referências diretas, 40% para indiretas, 0% para sem referências), o que subestima a cobertura real. Quando os testes do MissionApp forem instrumentados com cobertura via Japa/V8, o relatório será integrado via:

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

- **Futuro: CRAP scores com cobertura real:** O fallow aceita `coverage-final.json` gerado por Istanbul/V8 (`fallow health --coverage coverage/coverage-final.json`) para calcular scores de complexidade com base em linhas efetivamente cobertas por testes — em vez da estimativa por grafo de referências que usa hoje. Quando os testes do MissionApp forem instrumentados com cobertura via Japa/V8, esse relatório será integrado.

## Alternativas Consideradas

**1. Knip**

Ferramenta de dead code detection popular no ecossistema TypeScript, com suporte explícito a múltiplos frameworks incluindo AdonisJS. O fallow foi preferido por oferecer análise de duplicação e complexidade integrada na mesma ferramenta, e por ter o mecanismo de `overrides` por glob mais expressivo. O fallow possui comando `fallow migrate` que converte configurações do knip — indicando compatibilidade conceitual suficiente para migração futura se necessário.

**2. ESLint com `eslint-plugin-unused-imports`**

O ESLint já está configurado no projeto ([`eslint.config.js`](../../eslint.config.js)) e detecta imports não utilizados em nível de arquivo individual. Não detecta arquivos inteiros sem importadores, não constrói grafo de dependências e não distingue entre exports públicos consumidos por outros arquivos e exports genuinamente mortos. Permanece ativo como ferramenta complementar de qualidade de código — não é substituto para análise de grafo.

**3. `tsc --noUnusedLocals --noUnusedParameters`**

Flags do TypeScript que detectam variáveis e parâmetros locais não usados. Operam em nível de símbolo local, não de arquivo ou export. Não detectam arquivos sem importadores, exports sem consumidores ou dependências não usadas. Permanecem como verificação de compilação — escopo diferente do fallow.

**4. Code Climate Quality**

Plataforma SaaS de análise de qualidade de código com métricas de complexidade, duplicação e cobertura integradas ao GitHub. Descartada por dois motivos centrais: (1) **vendor lock-in** — toda a análise ocorre em servidores da Code Climate; configurações, histórico de métricas e baselines ficam presos na plataforma, tornando a migração custosa. O MissionApp adota como princípio evitar dependências de plataformas SaaS quando existe alternativa equivalente executável localmente — conforme aplicado em outras decisões de infraestrutura do projeto. O fallow roda completamente offline, sem transmitir código-fonte para terceiros, o que é igualmente relevante sob a perspectiva LGPD. (2) **custo para repositórios privados** — o plano gratuito do Code Climate é limitado a projetos open-source públicos; qualquer movimento para repositório privado exigiria contrato pago, enquanto o fallow não tem restrições de visibilidade de repositório.

## Consequências (Trade-offs)

### Positivas / Benefícios

- **Prevenção de acúmulo de código morto em `app/`:** Qualquer arquivo adicionado em `app/` sem ser importado por nenhum entry point é reportado como `unused-file` — prevenindo que features descartadas deixem arquivos órfãos na codebase.

- **Dependências declaradas vs usadas:** `unused-dependencies` detecta pacotes adicionados ao `package.json` e esquecidos — comuns em projetos open-source onde contribuidores adicionam dependências para experimentar e não as removem ao reverter.

- **Base para análise de complexidade com cobertura real:** A configuração atual já suporta a integração com `coverage-final.json` — quando os testes forem instrumentados, os CRAP scores passarão de estimativa por grafo para medição real de linhas cobertas.

### Negativas / Riscos

- **`usedClassMembers` é lista global sem escopo por classe:** `"check"` na lista de membros sempre usados suprime o diagnóstico para qualquer método chamado `check` em qualquer classe do projeto — não apenas em `JwtGuard`. Se um método `check()` genuinamente morto for adicionado em outra classe, o fallow não o reportará. O risco é baixo no estado atual da codebase mas cresce com o número de contribuidores.

- **Manutenção da configuração junto com o framework:** Novos arquivos que o AdonisJS carregue via IoC em versões futuras precisam ser declarados em `entry` para não gerar falsos positivos. Upgrades de major do AdonisJS devem incluir revisão de `.fallowrc.json`.

- **Suppressions inline exigem disciplina dos contribuidores:** O mecanismo `// fallow-ignore-file` requer que quem suprime um achado entenda o motivo. Suppressions sem justificativa — ou usadas para silenciar achados reais — degradam o sinal da ferramenta. As contributing guidelines devem incluir orientação sobre quando e como suprimir.

## Referências

- [Documentação do fallow](https://docs.fallow.tools): referência da ferramenta adotada
- [fallow — dead-code](https://docs.fallow.tools/explanations/dead-code): explicação das regras de código morto, incluindo `unused-files`, `unused-exports` e `unused-class-members`
- [fallow — duplication](https://docs.fallow.tools/explanations/duplication#clone-groups): explicação da detecção de duplicação por análise de suffix-array
- [ADR-0018](./0018-padrao-de-composicao-de-mixins-para-comportamentos-compartilhados-em-models.md): padrão de mixins no Lucid — contexto para a supressão de `circular-dependencies` em `app/models/**`
- [ADR-0020](./0020-estrategia-de-autenticacao-jwt-hibrido-com-revogacao-via-dragonflydb.md): guard JWT implementado em `app/auth/guards/jwt.ts` — contexto para a supressão de `unused-class-members` em `app/auth/**`

# [ADR-0003]: Adoção do ESLint e Prettier para Qualidade Estática e Formatação de Código

## Dados

- **Status:** 🔵 Em Uso
- **Data:** 2026-07-01
- **Proponentes:** [Allber Ferreira](https://github.com/AFSFerreira)

---

## Contexto e Problema

Em um projeto TypeScript com múltiplos contribuidores voluntários — com diferentes IDEs, configurações de editor e graus de familiaridade com o ecossistema Node.js — dois problemas surgem inevitavelmente sem enforcement automatizado:

**Inconsistência de formatação:** Cada desenvolvedor formata código segundo seus padrões locais — indentação com 2 ou 4 espaços, aspas simples ou duplas, ponto-e-vírgula ou não, largura de linha variável. Em projetos com PR review assíncrono e contributores distribuídos, diffs poluídos com mudanças de formatação tornam a revisão de lógica mais difícil e aumentam o ruído no histórico de commits.

**Código TypeScript tecnicamente válido mas estruturalmente problemático:** O compilador TypeScript (`tsc`) verifica tipos mas não detecta padrões de código que produzem bugs silenciosos ou violam convenções do ecossistema — variáveis declaradas e não usadas, imports desnecessários, uso de `any` implícito, padrões async sem `await`, comparações sem tipo (`==` em vez de `===`). Esses problemas passam pelo `tsc` sem diagnóstico.

A questão central é: **como garantir, de forma automatizada e integrada ao fluxo de PR, que todo código submetido ao repositório segue o mesmo padrão de formatação e não contém categorias conhecidas de erros estáticos?**

## Decisão

Adotaremos **ESLint** (via `@adonisjs/eslint-config`) para análise estática de qualidade de código e **Prettier** (via `@adonisjs/prettier-config`) para formatação determinística, como camadas complementares de enforcement de código.

**ESLint** é o linter padrão do ecossistema JavaScript/TypeScript. Analisa a AST (Abstract Syntax Tree) do código para detectar padrões problemáticos: imports não utilizados, uso incorreto de `await`, `any` implícito, violações de convenções TypeScript. Opera com plugins modulares — `typescript-eslint` para regras TypeScript-específicas, `eslint-config-prettier` para desativar regras que conflitam com o Prettier.

**Prettier** é um formatador de código opinado. Recebe código TypeScript e o reescreve em um formato canônico determinístico — sem configuração por regra, sem debates de estilo: uma largura de linha, uma convenção de aspas, um padrão de indentação. A decisão de estilo é delegada ao Prettier; os desenvolvedores não debatem formatação.

As duas ferramentas têm responsabilidades não sobrepostas: ESLint detecta o que está errado; Prettier decide como deve ser formatado. `@adonisjs/eslint-config` já inclui `eslint-config-prettier` internamente, desativando qualquer regra ESLint que interferiria com a formatação do Prettier — eliminando a fonte mais comum de conflitos entre as duas ferramentas.

**Configuração adotada:**

O ESLint é configurado via `eslint.config.js` na raiz do projeto — formato flat config (padrão desde ESLint 9):

```js
import { configApp } from '@adonisjs/eslint-config'
export default configApp()
```

O Prettier é configurado via campo `"prettier"` no `package.json`:

```json
"prettier": "@adonisjs/prettier-config"
```

Não há arquivo `.prettierrc` separado. O preset `@adonisjs/prettier-config` define todas as opções — a configuração local é intencionalmente mínima para permanecer sincronizada com a evolução do preset oficial do AdonisJS.

**Integração com o ciclo de desenvolvimento:**

```json
"lint":       "eslint .",
"format":     "prettier --check .",
"lint:fix":   "eslint --fix .",
"format:fix": "prettier --write ."
```

O pre-push hook executa `pnpm lint` e `pnpm format` antes de cada push — bloqueando código com erros ESLint ou formatação divergente antes que chegue ao repositório remoto. O mesmo par de comandos é executado no pipeline de CI como verificação independente.

**Por que `@adonisjs/eslint-config` e `@adonisjs/prettier-config`:**

O AdonisJS mantém presets oficiais para ESLint e Prettier que são usados no próprio framework e em todos os pacotes do ecossistema. Adotar esses presets significa: (1) o projeto usa exatamente as mesmas regras que o time do AdonisJS considera corretas para o ecossistema; (2) upgrades do AdonisJS raramente produzem conflitos de linting — o preset é atualizado junto com as mudanças de estilo do framework; (3) a configuração local é mínima — uma linha de `eslint.config.js` e um campo no `package.json` — sem regras customizadas que precisem ser mantidas.

## Justificativa

- **Presets oficiais do AdonisJS eliminam decisões de configuração:** Definir um ruleset ESLint para TypeScript a partir do zero — escolher entre centenas de regras do `typescript-eslint`, decidir severidades, resolver conflitos com o Prettier — é uma decisão com custo de manutenção real e risco de configuração incorreta. `@adonisjs/eslint-config` encapsula essas decisões no preset do framework. O projeto herda as escolhas do ecossistema sem precisar justificá-las individualmente.

- **Responsabilidades separadas e não conflitantes:** ESLint detecta problemas estruturais e de semântica (unused vars, any implícito, async incorreto); Prettier decide formatação (indentação, aspas, ponto-e-vírgula). Ferramentas com escopo único e bem definido são substituíveis independentemente — trocar Prettier por outro formatador não afeta as regras ESLint e vice-versa.

- **Formatação determinística reduz ruído em diffs e code review:** Com Prettier, o formato de qualquer trecho de código é único e não depende do editor ou configuração local do desenvolvedor. Diffs de PR refletem mudanças de lógica, não de estilo — o que é especialmente relevante em um projeto open-source onde o revisor e o autor raramente usam o mesmo editor.

- **Enforcement no pre-push e CI elimina escape de código não conforme:** Verificação apenas por convenção ("por favor, rode o lint antes de submeter") não funciona com múltiplos contributores. O pre-push hook garante que nenhum push chegue ao repositório com código não conforme; o CI garante que nenhum PR seja mergeado sem a verificação independente ter passado.

- **Maturidade e ecossistema:** ESLint e Prettier são as ferramentas mais adotadas no ecossistema JavaScript/TypeScript, com plugins para todos os editores relevantes (VS Code, JetBrains, Neovim), integração com GitHub CI e documentação extensiva. O custo de adoção por novos contribuidores é praticamente zero.

## Alternativas Consideradas

**1. Biome**

Toolchain Rust para lint e formatação em uma única ferramenta. Alternativa mais séria considerada: sub-segundo em projetos grandes, zero dependências de runtime JavaScript, compatibilidade de import com ESLint em expansão ativa, e um único arquivo de configuração para linting e formatação.

Descartado por um motivo central: **o AdonisJS não publica preset oficial para Biome**. `@adonisjs/eslint-config` encapsula um conjunto de regras `typescript-eslint` calibradas para o padrão de código do AdonisJS — replicar esse ruleset em Biome exigiria mapear cada regra para o equivalente Biome (quando existe) e decidir sobre as regras sem equivalente. O custo de manutenção dessa configuração customizada é contínuo e o risco de lacunas de cobertura é real.

O Biome permanece como alternativa de migração futura se o time do AdonisJS publicar um preset oficial — o que, dada a trajetória da ferramenta, é uma possibilidade concreta a médio prazo.

**2. oxlint**

Linter Rust (da Oxc project), 50-100× mais rápido que ESLint em benchmarks. Focado exclusivamente em linting — não formata código. Ainda não cobre 100% das regras do `typescript-eslint` que o `@adonisjs/eslint-config` utiliza. Requer um formatador separado de qualquer forma. A proposta de valor (velocidade) é pouco relevante para um projeto que roda lint no pre-push hook — a diferença entre 200ms e 1s não afeta a experiência prática.

**3. ESLint sem Prettier**

Enforcar formatação exclusivamente via regras ESLint (`@stylistic/eslint-plugin` ou `eslint-plugin-prettier`). Tecnicamente possível, mas: (1) regras de formatação ESLint são mais lentas do que o Prettier por operar em AST em vez de texto; (2) a cobertura de formatação por regras individuais é incompleta — Prettier toma decisões de layout que não são modeláveis como regras discretas; (3) `@adonisjs/eslint-config` não inclui regras de formatação por design — assume o uso de Prettier.

**4. Prettier sem ESLint**

Formatação sem análise estática. Manteria diffs limpos mas permitiria que padrões problemáticos (`any` implícito, imports não usados, comparações sem tipo) chegassem ao `main` sem diagnóstico. O `tsc --noEmit` ([`typecheck`](../../package.json)) captura erros de tipo mas não substitui as regras de qualidade que o ESLint detecta além dos tipos.

**5. StandardJS**

Zero-config opinionado que combina lint e formatação em uma ferramenta. Descartado porque não tem suporte oficial a TypeScript — funciona com `@typescript-eslint` via workaround mas perde as regras TypeScript-específicas que são centrais para o `@adonisjs/eslint-config`. Não tem integração com o ecossistema AdonisJS.

## Consequências (Trade-offs)

### Positivas / Benefícios

- **Configuração mínima e zero manutenção de ruleset:** Uma linha de `eslint.config.js` e um campo no `package.json`. Upgrades de `@adonisjs/eslint-config` e `@adonisjs/prettier-config` atualizam automaticamente as regras — sem decisões locais para manter.

- **Diffs de PR exclusivamente sobre lógica:** Prettier elimina ruído de formatação dos diffs. Code review foca em design, comportamento e corretude — não em preferências de estilo de cada contribuidor.

- **Detecção precoce de padrões problemáticos:** O pre-push hook bloqueia código com imports não usados, `any` implícito, e outros padrões detectados pelo ESLint antes de chegarem ao repositório — reduzindo o volume de achados no code review.

- **Feedback imediato no editor:** Ambas as ferramentas têm plugins maduros para todos os editores relevantes. Contribuidores veem diagnostics ESLint e preview de formatação Prettier enquanto escrevem código — sem esperar pelo pre-push hook ou CI.

### Negativas / Riscos

- **Duas ferramentas em vez de uma:** O Biome oferece lint + formatação em um único binário. A combinação ESLint + Prettier requer duas dependências, dois comandos no pipeline e coordenação via `eslint-config-prettier`. O custo prático é baixo dado que `@adonisjs/eslint-config` já gerencia essa coordenação — mas é uma complexidade inexistente no Biome.

- **Latência de lint em projetos grandes:** ESLint em JavaScript é mais lento do que ferramentas Rust (Biome, oxlint). No estado atual do projeto, o pre-push hook completa em segundos — mas projetos com centenas de arquivos TypeScript podem sentir a diferença. A mitigação é ESLint's `--cache` flag, que processa apenas arquivos modificados.

- **Configuração Prettier invisível para novos contribuidores:** O preset está referenciado por nome em `package.json` — não há arquivo `.prettierrc` com as opções explícitas. Novos contribuidores precisam consultar `@adonisjs/prettier-config` para entender as regras de formatação. A alternativa (copiar as opções para um `.prettierrc` local) criaria divergência com upgrades futuros do preset.

## Referências

- [`@adonisjs/eslint-config`](https://github.com/adonisjs/tooling-config/tree/main/packages/eslint-config): preset oficial ESLint do AdonisJS
- [`@adonisjs/prettier-config`](https://github.com/adonisjs/tooling-config/tree/main/packages/prettier-config): preset oficial Prettier do AdonisJS
- [ESLint flat config](https://eslint.org/docs/latest/use/configure/configuration-files): formato de configuração adotado (ESLint 9+)
- [Biome](https://biomejs.dev/): alternativa considerada — toolchain Rust unificado
- [ADR-0002](./0002-adocao-do-nodejs-como-runtime-de-execucao.md): runtime Node.js sobre o qual ESLint e Prettier operam
- [ADR-0001](./0001-adocao-do-adonisjs-como-framework-backend.md): AdonisJS como framework — origem dos presets oficiais adotados

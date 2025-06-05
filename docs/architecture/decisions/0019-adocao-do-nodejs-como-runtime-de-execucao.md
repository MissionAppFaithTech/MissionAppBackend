# [ADR-0019]: Adoção do Node.js como Runtime de Execução

## Dados

- **Status:** 🔵 Em Uso
- **Data:** 2026-06-08
- **Proponentes:** [Allber Ferreira](https://github.com/AFSFerreira)

---

## Contexto e Problema

A adoção do AdonisJS v7 como framework no [ADR-0001](./0001-adocao-do-adonisjs-como-framework-backend.md) tornou o runtime de execução uma decisão implicitamente tomada — o AdonisJS v7 exige **Node.js 24 ou superior** como requisito mínimo. No entanto, essa decisão nunca foi registrada de forma explícita, e a existência de runtimes alternativos (Bun, Deno) que se propõem à compatibilidade com o ecossistema Node.js torna a lacuna relevante: sem um ADR, contribuidores podem assumir que a troca de runtime é uma escolha arbitrária — e abrir PRs ou issues questionando ou tentando substituir o Node.js sem o contexto técnico que motivou a escolha.

Este ADR não documenta uma nova decisão. Documenta uma decisão que já estava em vigor, torna explícito o raciocínio por trás dela e registra por que as alternativas não são viáveis no contexto atual do projeto.

A questão central é: **qual runtime de execução deve ser adotado e por que as alternativas disponíveis no ecossistema JavaScript (Bun, Deno) não são viáveis para o contexto atual do projeto?**

---

## Decisão

Adotaremos **Node.js 24 LTS** como único runtime de execução do MissionApp Backend.

O Node.js é o runtime JavaScript server-side mantido pela OpenJS Foundation, com ciclo de vida LTS bem definido, suporte amplo em ambientes de CI/CD, imagens Docker oficiais e adoção consolidada no ecossistema. A versão 24 é a versão mínima suportada pelo AdonisJS v7 e oferece APIs nativas que o framework usa diretamente — sem camadas de polyfill ou compatibilidade.

A versão do Node.js em uso no projeto é fixada no campo `"engines"` do `package.json` e na imagem base do `Dockerfile` (`node:24-alpine`). Todos os ambientes — desenvolvimento local, CI e produção — devem usar a mesma versão para garantir paridade de comportamento.

---

## Justificativa

- **Requisito do framework:** O AdonisJS v7 exige explicitamente Node.js 24+ como versão mínima. Não é uma preferência — é uma restrição técnica documentada. Usar qualquer runtime alternativo implica assumir responsabilidade por garantir equivalência de APIs nativas que o framework usa, o que nenhuma alternativa atualmente oferece de forma confiável.

- **APIs nativas do Node.js 24 em uso direto pelo AdonisJS v7:** O AdonisJS v7 removeu dependências de bibliotecas de utilitários em favor de APIs nativas do Node.js 24 — entre elas `util.parseEnv` (substitui o `dotenv` para leitura de variáveis de ambiente), `crypto.randomUUID` (geração de UUIDs), e diagnostic channels para observabilidade. Essas APIs são específicas do Node.js e têm comportamento ou disponibilidade inconsistente em runtimes alternativos.

- **Paridade com o ecossistema de pacotes:** O `node_modules/` instalado via pnpm ([ADR-0007](./0007-adocao-do-pnpm-como-gerenciador-de-pacotes.md)) assume Node.js como runtime. Pacotes com módulos nativos compilados (addons em C++ como `sharp`, `bcrypt`, `argon2`) são compilados para a ABI do Node.js — não são portáveis para outros runtimes sem recompilação ou shims.

- **Compatibilidade com o ciclo de vida do Docker:** A imagem `node:24-alpine` é mantida oficialmente pela equipe do Node.js com patches de segurança regulares. Runtimes alternativos têm imagens Docker menos maduras, atualizações menos previsíveis e menor adoção em ambientes de produção gerenciados.

---

## Alternativas Consideradas

### Bun

O Bun é um runtime JavaScript moderno desenvolvido pela Oven.sh, posicionado como substituto drop-in para o Node.js com execução mais rápida de scripts, transpilação TypeScript nativa e server HTTP integrado. Descartado porque:

1. **Incompatibilidade com APIs do Node.js 24 usadas pelo AdonisJS v7:** O Bun mantém uma issue de tracking aberta especificamente para atingir compatibilidade suficiente com AdonisJS. Há divergências documentadas de comportamento no carregamento de módulos ESM — por exemplo, diferenças na resolução de `import.default` que exigem ajustes de código entre os dois runtimes — e o Bun ainda não implementa todas as APIs de diagnostic channels que o AdonisJS v7 usa para observabilidade.

2. **AdonisJS não suporta Bun como runtime:** A documentação oficial e os releases do AdonisJS v7 não listam o Bun como runtime suportado. O suporte ao `bun install` (gerenciador de pacotes) foi adicionado no AdonisJS v6.12.0, mas isso não implica suporte ao Bun como runtime — são dois produtos distintos da Oven.sh com matrizes de compatibilidade independentes.

3. **Instabilidade para projetos em início de desenvolvimento:** Adotar um runtime com incompatibilidades conhecidas no começo de um projeto significa assumir uma dívida técnica de rastreamento — problemas que surgem podem ser bugs do runtime, do framework, ou da interação entre ambos, com pouca documentação e comunidade para apoiar o diagnóstico.

> **Nota:** Bun como _gerenciador de pacotes_ (`bun install`) é tecnicamente viável com AdonisJS, mas foi descartado em favor do pnpm pelos critérios documentados no [ADR-0007](./0007-adocao-do-pnpm-como-gerenciador-de-pacotes.md). Os dois produtos são independentes.

### Deno

O Deno é um runtime JavaScript/TypeScript desenvolvido pela Deno Land Inc., com foco em segurança, suporte TypeScript nativo e compatibilidade com Web APIs. Descartado porque:

1. **Sem suporte oficial pelo AdonisJS:** O AdonisJS não lista Deno como runtime suportado e não há sinalização de roadmap para isso. O ecossistema de pacotes do Deno é distinto do `node_modules/` — compatibilidade com npm é parcial via `npm:` specifiers e não garante equivalência de comportamento para pacotes com módulos nativos.

2. **Modelo de permissões incompatível com o pipeline do projeto:** O sistema de permissões do Deno (flags como `--allow-net`, `--allow-read`) é incompatível com a forma como o AdonisJS e seus pacotes acessam sistema de arquivos, rede e variáveis de ambiente sem declaração explícita de permissões por processo.

3. **Ecossistema npm fragmentado:** Embora o Deno suporte pacotes npm via `npm:` specifiers, pacotes com módulos nativos (addons C++) não funcionam — o que exclui dependências como `argon2` (hashing de senha) e `sharp` (processamento de imagens), ambas usadas ou previstas no projeto.

---

## Consequências (Trade-offs)

### Positivas / Benefícios

- **Compatibilidade garantida com AdonisJS v7:** Node.js 24 é o único runtime com suporte oficial. Sem friction de compatibilidade, sem issue tracking para acompanhar, sem comportamentos divergentes entre ambientes.

- **Ecossistema npm completo:** Todos os pacotes com módulos nativos funcionam sem configuração adicional. O pnpm ([ADR-0007](./0007-adocao-do-pnpm-como-gerenciador-de-pacotes.md)) instala para a ABI correta automaticamente.

- **Suporte LTS com ciclo previsível:** Node.js 24 tem suporte LTS com patches de segurança regulares e horizonte de suporte até abril de 2027 (Active LTS) e abril de 2028 (Maintenance). Atualizações previsíveis facilitam o planejamento de upgrades.

- **Imagens Docker oficiais estáveis:** `node:24-alpine` é mantida oficialmente, com patches de segurança e builds para múltiplas arquiteturas (`amd64`, `arm64`), alinhando-se à estratégia de containerização do [ADR-0006](./0006-uso-do-docker-para-ambiente-de-desenvolvimento-e-deploy.md).

- **Familiaridade dos contribuidores:** Node.js é o runtime dominante no ecossistema. A maioria dos contribuidores potenciais já trabalha com Node.js — sem curva de aprendizado de runtime, sem surpresas de compatibilidade.

### Negativas / Riscos

- **Performance de startup inferior ao Bun:** O Bun tem tempo de inicialização e execução de scripts mais rápido que o Node.js em benchmarks micro. Para uma API REST em contêiner com processos de longa duração, essa diferença não é material — mas é uma limitação real em cenários de cold start (serverless, Kubernetes com scale-to-zero).

- **Ausência de transpilação TypeScript nativa:** O Node.js não executa TypeScript diretamente. O projeto depende do `ts-exec` (compilador SWC integrado ao AdonisJS v7) para desenvolvimento com HMR e do `tsc` para build de produção. Bun executaria `.ts` diretamente sem etapa de build — mas esse ganho não justifica a troca dado o custo de compatibilidade.

- **Dependência do ciclo de release do Node.js:** Upgrades de versão principal do Node.js (ex: 24 → 26) precisam ser coordenados com o AdonisJS, que pode ou não ter adotado as APIs da nova versão. O Renovate ([ADR-0011](./0011-adocao-do-renovate-para-atualizacao-automatica-de-dependencias.md)) monitora isso, mas upgrades de runtime ainda requerem validação manual.

---

## Referências

- [AdonisJS v7 — Requisitos de sistema](https://docs.adonisjs.com/guides/installation): exige Node.js 24+ como runtime mínimo, constraint que originou esta decisão
- [Node.js — Calendário de releases e LTS](https://nodejs.org/en/about/previous-releases): referência para selecionar a versão LTS correta e planejar atualizações futuras
- [Bun — Site oficial](https://bun.sh): runtime alternativo avaliado e descartado pela incompatibilidade com AdonisJS
- [Bun — Issue de compatibilidade com AdonisJS](https://github.com/oven-sh/bun/issues/1290): issue que documenta a incompatibilidade que levou à rejeição do Bun
- [Deno — Site oficial](https://deno.com): runtime alternativo avaliado e descartado pelo ecossistema npm ainda imaturo
- [ADR-0001](./0001-adocao-do-adonisjs-como-framework-backend.md): adoção do AdonisJS, que exige Node.js 24+ como runtime
- [ADR-0006](./0006-uso-do-docker-para-ambiente-de-desenvolvimento-e-deploy.md): Docker que padroniza o runtime Node.js 24 em todos os ambientes
- [ADR-0007](./0007-adocao-do-pnpm-como-gerenciador-de-pacotes.md): pnpm gerenciado via Corepack, que requer Node.js 24 habilitado
- [ADR-0011](./0011-adocao-do-renovate-para-atualizacao-automatica-de-dependencias.md): Renovate para atualizar a imagem base do Node.js quando novas versões LTS forem lançadas

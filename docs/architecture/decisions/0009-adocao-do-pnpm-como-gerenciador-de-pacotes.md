# [ADR-0009]: Adoção do pnpm como Gerenciador de Pacotes

## Dados

- **Status:** 🔵 Em Uso
- **Data:** 2026-05-31
- **Proponentes:** [Allber Ferreira](https://github.com/AFSFerreira)

---

## Contexto e Problema

Todo projeto Node.js exige um gerenciador de pacotes para instalar dependências, gerar lockfile e garantir reprodutibilidade entre ambientes. O ecossistema oferece três opções principais — npm, Yarn e pnpm — cada uma com implicações diferentes para a integridade das dependências, desempenho de instalação, uso de disco e consistência entre ambientes de desenvolvimento.

Dois problemas específicos motivam a escolha explícita de um gerenciador de pacotes para o MissionApp:

**Phantom dependencies em projetos com node_modules hoisted:**
npm e Yarn v1 instalam dependências em uma estrutura flat (`node_modules/` na raiz), onde todos os pacotes são içados independentemente de quem os declarou. Isso permite que o código da aplicação faça `import` de um pacote que não está listado explicitamente em `package.json` — ele existe em `node_modules/` apenas como dependência transitiva de outro pacote. Essa prática, conhecida como _phantom dependency_, cria fragilidade silenciosa: o pacote pode ser removido em uma atualização de dependência de terceiro sem nenhum aviso, quebrando o build sem causa aparente.

**Reprodutibilidade e consistência de ambiente:**
Em um projeto open-source com contribuidores voluntários e rotatividade alta, a existência de múltiplos gerenciadores de pacotes no mesmo repositório gera divergência. Se um colaborador executar `npm install` em vez de `pnpm install`, um `package-lock.json` será gerado ao lado do `pnpm-lock.yaml`, os dois arquivos entrarão em conflito, e o lockfile autoritativo do projeto ficará corrompido. Sem uma decisão explícita e documentada, essa situação é inevitável.

A questão central é: **qual gerenciador de pacotes oferece a melhor combinação de integridade de dependências, reprodutibilidade de ambiente e desempenho para o MissionApp Backend?**

## Decisão

Adotaremos o **pnpm** (versão 11.x) como único gerenciador de pacotes do MissionApp Backend.

O pnpm é um gerenciador de pacotes Node.js de código aberto, lançado em 2016 como alternativa ao npm e ao Yarn. Sua principal diferença arquitetural é o uso de um store global com hard links: ao invés de copiar pacotes para o `node_modules/` de cada projeto, o pnpm cria links para um store centralizado no disco, eliminando duplicação. Adicionalmente, impõe um modelo de resolução de dependências mais estrito — impedindo que pacotes acessem dependências não declaradas explicitamente (_phantom dependencies_) — o que reduz a superfície de falhas silenciosas em produção.

O arquivo `pnpm-lock.yaml` é o lockfile autoritativo do projeto e deve ser versionado no repositório. O uso de `npm install`, `yarn` ou qualquer outro gerenciador é proibido — qualquer PR que contenha `package-lock.json` ou `yarn.lock` deve ser rejeitado.

O campo `"packageManager"` no `package.json` será definido com a versão exata do pnpm (`"packageManager": "pnpm@11.x.x"`), ativando o Corepack do Node.js para verificação automática da versão do gerenciador ao executar comandos.

## Justificativa

O pnpm foi escolhido por resolver diretamente os dois problemas identificados no contexto:

- **Estrutura de `node_modules` não-flat com isolamento estrito:** Por padrão, o pnpm cria `node_modules/` com symlinks para um store global content-addressable — cada pacote só enxerga as dependências que declarou explicitamente em seu `package.json`. Imports de phantom dependencies falham em tempo de instalação ou execução, expondo o problema imediatamente em vez de deixá-lo latente para futuras atualizações de dependências transitivas.

- **Store global com hard links — eficiência de disco:** O pnpm mantém um único store global de pacotes no sistema. Quando dois projetos dependem da mesma versão de um pacote, o pnpm cria hard links para o mesmo arquivo físico em vez de copiar os bytes. Em máquinas de desenvolvimento com múltiplos projetos Node.js, isso elimina gigabytes de duplicação — cada versão de cada pacote existe uma única vez no disco.

- **Performance de instalação superior:** Por não copiar arquivos entre projetos (hard links) e por reutilizar o cache do store global, o pnpm instala dependências significativamente mais rápido que npm e Yarn v1, especialmente em instalações subsequentes e em pipelines de CI/CD com cache configurado.

- **Lockfile determinístico:** O `pnpm-lock.yaml` registra o grafo completo de dependências com checksums, garantindo que `pnpm install` em qualquer ambiente produza exatamente o mesmo resultado. A estrutura do lockfile é mais legível em diffs de PR do que o `package-lock.json` do npm, facilitando revisão de atualizações de dependências.

- **Prevenção de uso acidental de outro gerenciador:** O campo `"packageManager"` no `package.json` integrado ao Corepack garante que o Node.js alertará ou bloqueará o uso de `npm` ou `yarn` neste repositório, reduzindo o risco de conflito de lockfiles por desatenção de contribuidores.

## Alternativas Consideradas

- **npm:** Gerenciador padrão do Node.js, instalado com qualquer versão do runtime e com adoção universal. Descartado porque: (1) instala dependências em estrutura flat com hoisting, permitindo phantom dependencies sem aviso; (2) lockfile (`package-lock.json`) copia pacotes para cada projeto individualmente, sem compartilhamento de store global — uso de disco proporcionalmente maior; (3) performance de instalação inferior ao pnpm, especialmente em projetos com alto número de dependências transitivas como o AdonisJS.

- **Yarn v1 (Classic):** Amplamente adotado, com boa performance e lockfile mais legível que npm. Descartado porque: (1) também usa estrutura flat com hoisting — os mesmos problemas de phantom dependency do npm se aplicam; (2) o Yarn v1 entrou em modo de manutenção — novos desenvolvimentos acontecem no Yarn v3/v4 (Berry), tornando-o uma escolha com horizonte de suporte incerto; (3) não oferece store global com hard links, sem ganho de eficiência de disco.

- **Yarn v3 / v4 (Berry):** Versão moderna do Yarn com Plug'n'Play (PnP) — elimina `node_modules/` completamente e resolve dependências via `.pnp.cjs`. Descartado porque: (1) o modo PnP é uma mudança paradigmática que quebra ferramentas que assumem a existência de `node_modules/` — incluindo alguns plugins e integrações do AdonisJS e do ecossistema Node.js em geral; (2) a curva de adoção é significativamente maior para contribuidores que nunca trabalharam com PnP; (3) o modo `node-modules` do Yarn Berry (que mantém `node_modules/` para compatibilidade) não oferece vantagens suficientes sobre o pnpm para justificar a troca.

## Consequências (Trade-offs)

### Positivas / Benefícios

- **Phantom dependencies eliminadas por design:** A estrutura isolada do `node_modules/` garante que imports de pacotes não declarados falhem imediatamente, expondo problemas de integridade de dependências antes que eles se tornem bugs silenciosos em produção.

- **Economia de disco em ambientes de desenvolvimento:** O store global com hard links elimina a duplicação de pacotes entre projetos no mesmo host — relevante para contribuidores que mantêm múltiplos projetos Node.js localmente.

- **Instalações rápidas em CI/CD:** Com cache do store global configurado no pipeline, `pnpm install` em CI reutiliza pacotes já baixados, reduzindo o tempo de instalação de dependências em cada execução.

- **Lockfile como barreira de integridade:** `pnpm-lock.yaml` versionado e verificado em CI previne deploys com dependências não-determinísticas.

### Negativas / Riscos

- **pnpm não é pré-instalado:** Ao contrário do npm, o pnpm precisa ser instalado explicitamente (`npm install -g pnpm` ou via Corepack). Isso adiciona um passo no onboarding — embora seja um único comando e deva ser documentado no guia de setup.

- **Pacotes com dependência implícita de hoisting podem falhar:** Bibliotecas mal escritas que assumem acesso a dependências transitivas via `node_modules/` flat podem falhar com pnpm. Esses casos são raros no ecossistema moderno, mas quando ocorrem exigem configuração de `hoist-pattern` ou `.npmrc` para exceções — adicionando complexidade pontual.

- **Risco de conflito de lockfile por contribuidores desatentos:** Colaboradores habituados a npm podem executar `npm install` por reflexo, gerando `package-lock.json` no repositório. O campo `"packageManager"` com Corepack mitiga isso, mas não bloqueia completamente em todos os ambientes Node.js.

## Referências

- [Documentação oficial do pnpm](https://pnpm.io/motivation): motivação, vantagens e referência principal do gerenciador adotado
- [pnpm — Store global e hard links](https://pnpm.io/symlinked-node-modules-structure): explica a estrutura de armazenamento que reduz uso de disco
- [Corepack — Node.js package manager enforcement](https://nodejs.org/api/corepack.html): ferramenta nativa do Node.js para fixar o gerenciador de pacotes por projeto
- [ADR-0001](./0001-adocao-do-adonisjs-como-framework-backend.md): adoção do AdonisJS, framework que guia os requisitos do ambiente de desenvolvimento

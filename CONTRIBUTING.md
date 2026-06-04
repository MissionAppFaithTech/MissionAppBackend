# Contribuindo com o MissionApp Backend

Obrigado pelo interesse em contribuir. Este guia cobre tudo que você precisa saber para configurar o ambiente, entender os padrões do projeto e submeter contribuições de qualidade.

---

## Sumário

1. [Pré-requisitos](#pre-requisitos)
2. [Configurando o Ambiente](#configurando-o-ambiente)
3. [Fluxo de Trabalho](#fluxo-de-trabalho)
4. [Padrões de Código](#padroes-de-codigo)
5. [Testes](#testes)
6. [Testando a API com Bruno](#testando-a-api-com-bruno)
7. [Decisões Arquiteturais (ADRs)](#decisoes-arquiteturais-adrs)
8. [Abrindo um Pull Request](#abrindo-um-pull-request)
9. [Reportando Problemas](#reportando-problemas)

---

<a name="pre-requisitos"></a>

## Pré-requisitos

Antes de começar, você precisa ter instalado:

| Ferramenta | Versão mínima | Finalidade |
|---|---|---|
| Node.js | 24.x | Runtime da aplicação |
| pnpm | 11.x | Gerenciador de pacotes ([ADR-0007](./docs/architecture/decisions/0007-adocao-do-pnpm-como-gerenciador-de-pacotes.md)) |
| Docker + Docker Compose | Qualquer versão estável | Serviços de infraestrutura ([ADR-0006](./docs/architecture/decisions/0006-uso-do-docker-para-ambiente-de-desenvolvimento-e-deploy.md)) |
| Git | 2.x | Controle de versão |
| [Bruno](https://www.usebruno.com/) | Última estável | Cliente HTTP oficial para testar a API ([ADR-0015](./docs/architecture/decisions/0015-adocao-do-bruno-como-cliente-http-oficial.md)) |

### Gerenciando a versão do Node.js

O repositório contém um arquivo `.node-version` com a versão exata do Node.js utilizada no projeto (`24.16.0`). Use um gerenciador de versões que leia esse arquivo para garantir que seu ambiente use a versão correta automaticamente ao entrar no diretório do projeto.

**Linux e macOS — recomendado: [mise](https://mise.jdx.dev/)**

```bash
# Instalar o mise
curl https://mise.run | sh

# Ativar o mise no shell (adicione ao ~/.bashrc, ~/.zshrc ou equivalente)
eval "$(mise activate bash)"   # bash
eval "$(mise activate zsh)"    # zsh

# Na raiz do repositório, o mise lerá o .mise.toml/.node-version automaticamente
mise install
```

**Windows — recomendado: [fnm](https://github.com/Schniz/fnm)**

```powershell
# Instalar o fnm via winget
winget install Schniz.fnm

# Ativar o fnm no PowerShell (adicione ao $PROFILE)
fnm env --use-on-cd --shell powershell | Out-String | Invoke-Expression

# Na raiz do repositório, o fnm lerá o .node-version automaticamente
fnm install
fnm use
```

Ambas as ferramentas detectam o `.node-version` ao entrar no diretório do projeto e ativam a versão correta sem nenhum comando adicional nas sessões seguintes.

### Instalando o pnpm

O `package.json` declara o campo `"packageManager": "pnpm@11.5.0"`, que ativa a verificação de versão do gerenciador via **Corepack** (incluído no Node.js 16+). O uso de `npm install` ou `yarn` neste repositório está proibido — qualquer PR que contenha `package-lock.json` ou `yarn.lock` será rejeitado.

```bash
# Habilitar o Corepack para que o Node.js gerencie o pnpm automaticamente
corepack enable

# Ou instalar o pnpm manualmente
npm install -g pnpm@11
```

---

<a name="configurando-o-ambiente"></a>

## Configurando o Ambiente

### 1. Clone o repositório

```bash
git clone https://github.com/MissionAppFaithTech/MissionAppBackend
cd MissionAppBackend
```

### 2. Instale as dependências

```bash
pnpm install
```

### 3. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Abra o `.env` e preencha os valores obrigatórios em branco. Os valores padrão do `.env.example` são suficientes para rodar o ambiente de desenvolvimento local sem alterações — as credenciais dos serviços Docker já estão pré-configuradas.

### 4. Suba os serviços de infraestrutura

```bash
docker compose up -d
```

Este comando provisiona todos os serviços do stack de desenvolvimento: **PostgreSQL**, e quaisquer outros serviços adicionados futuramente ao `docker-compose.yaml`. Para confirmar que os containers subiram corretamente:

```bash
docker compose ps
```

Todos os serviços devem estar com status `healthy` antes de continuar.

### 5. Execute as migrations

```bash
node ace migration:run
```

### 6. Inicie o servidor de desenvolvimento

```bash
pnpm dev
# ou
node ace serve --hmr
```

O servidor estará disponível em `http://localhost:3333` por padrão (conforme `PORT` no `.env`). O modo `--hmr` recarrega o servidor automaticamente a cada mudança em arquivos TypeScript.

---

<a name="fluxo-de-trabalho"></a>

## Fluxo de Trabalho

### Branches

Crie sempre uma branch a partir de `main`:

```bash
git checkout main
git pull origin main
git checkout -b <tipo>/<descricao-curta>
```

Convenções de prefixo:

| Prefixo | Quando usar |
|---|---|
| `feat/` | Nova funcionalidade |
| `fix/` | Correção de bug |
| `docs/` | Documentação |
| `refactor/` | Refatoração sem mudança de comportamento |
| `test/` | Adição ou correção de testes |
| `chore/` | Configuração, CI, dependências |

### Commits

Siga o padrão [Conventional Commits](https://www.conventionalcommits.org/):

```
<tipo>(<escopo opcional>): <descrição imperativa em minúsculas>
```

Exemplos:

```
feat(auth): adicionar verificação de expiração do token de verificação de email
fix(doações): corrigir arredondamento de moeda no payload pix
docs(adr): adicionar ADR-0013 para estratégia de autenticação
test(missionários): adicionar teste de integração para atualização de perfil
```

---

<a name="padroes-de-codigo"></a>

## Padrões de Código

### Linting e formatação

O projeto usa **ESLint** e **Prettier**. Antes de cada commit, execute:

```bash
pnpm lint        # Verificar problemas de lint
pnpm format      # Formatar o código automaticamente
pnpm typecheck   # Verificar tipos TypeScript sem compilar
```

O CI rejeitará PRs com erros de lint ou falhas de typecheck.

### Convenções do AdonisJS

- **Controllers** são finos: validam a requisição com VineJS, delegam para um Service, retornam a resposta transformada. Nenhuma regra de negócio vive no controller.
- **Services** são o local da lógica de negócio e da transação relacional. Ao concluir uma operação, emitem um evento via `emitter` — nunca chamam diretamente Elasticsearch, serviço de email ou outros efeitos colaterais. Veja o [ADR-0008](./docs/architecture/decisions/0008-adocao-de-arquitetura-orientada-a-eventos-com-bullmq.md).
- **Listeners** são roteadores: recebem um evento e enfileiram um Job no BullMQ em menos de 1ms. Nenhuma lógica pesada dentro de Listeners.
- **Jobs** executam o trabalho assíncrono real (indexação, email, compressão) como workers isolados.
- **Workers** são criados exclusivamente via `node ace make:command` e vivem em `commands/`. Nunca crie `Dockerfiles` separados para workers — a aplicação usa imagem única com múltiplos entrypoints. Veja o [ADR-0013](./docs/architecture/decisions/0013-padrao-imagem-unica-multiplos-entrypoints-para-workers.md).
- **Validators** usam VineJS e vivem em `app/validators/`. Nunca valide entrada de usuário no controller ou no service diretamente.
- **Nunca use `npm install` ou `yarn`** — use exclusivamente `pnpm`. O arquivo `pnpm-lock.yaml` é o lockfile autoritativo.

### Comentários no código

Não adicione comentários que expliquem *o que* o código faz — nomes bem escolhidos já fazem isso. Adicione um comentário apenas quando o *porquê* for não-óbvio: uma restrição oculta, uma invariante sutil ou um contorno para um bug específico.

---

<a name="testes"></a>

## Testes

```bash
pnpm test
```

O projeto usa **Japa** (framework de testes nativo do AdonisJS). Organize os testes em:

- `tests/unit/` — testes de unidade para Services, Validators e utilitários isolados
- `tests/functional/` — testes de integração que exercitam a API HTTP end-to-end

Antes de abrir um PR, confirme que todos os testes passam localmente. O CI executará a suite completa e bloqueará o merge em caso de falha.

---

<a name="testando-a-api-com-bruno"></a>

## Testando a API com Bruno

O [Bruno](https://www.usebruno.com/) é o cliente HTTP oficial do repositório ([ADR-0015](./docs/architecture/decisions/0015-adocao-do-bruno-como-cliente-http-oficial.md)). A coleção de requisições fica em `bruno/` na raiz do projeto e é versionada junto com o código — após clonar o repositório, a coleção já está pronta para uso.

### Configurando o Bruno

1. Baixe e instale o Bruno em [usebruno.com](https://www.usebruno.com/).
2. Abra o Bruno e clique em **Open Collection**, selecionando a pasta `bruno/` na raiz do repositório.
3. Crie um arquivo `.env` na raiz do projeto (já coberto pelo `.gitignore`) e preencha as variáveis sensíveis referenciadas na coleção:

```bash
# .env — valores locais, nunca commitar
BRUNO_AUTH_TOKEN=seu_token_aqui
```

4. No Bruno, selecione o ambiente **local** no seletor de ambientes — ele aponta para `http://localhost:3333` e lê as variáveis do `.env`.

### Convenção obrigatória

Toda alteração que mude o contrato de uma rota (path, método HTTP, campos do payload, headers obrigatórios, formato de resposta) deve incluir, **no mesmo commit**, a atualização do arquivo `.bru` correspondente em `bruno/`. PRs que alteram contratos de API sem atualizar a coleção serão solicitados a corrigir antes do merge.

Nunca insira valores de tokens ou credenciais reais diretamente em arquivos `.bru` — use sempre variáveis (`{{variavel}}`), cujos valores ficam exclusivamente no `.env` local.

---

<a name="decisoes-arquiteturais-adrs"></a>

## Decisões Arquiteturais (ADRs)

Este projeto documenta suas decisões de arquitetura em [Architecture Decision Records](./docs/architecture/decisions/README.md). Antes de implementar uma mudança significativa, leia os ADRs relevantes para entender o raciocínio por trás das escolhas do stack.

**Quando criar um novo ADR:**

Qualquer mudança que introduza ou substitua um banco de dados, ORM, serviço externo, padrão arquitetural, convenção global ou dependência de alto acoplamento precisa de um ADR antes da implementação. Em caso de dúvida: se a mudança geraria debate em uma code review, ela merece um ADR.

O processo completo está documentado no [README dos ADRs](./docs/architecture/decisions/README.md).

---

<a name="abrindo-um-pull-request"></a>

## Abrindo um Pull Request

1. Certifique-se de que `pnpm lint`, `pnpm typecheck` e `pnpm test` passam localmente.
2. PRs que contenham `package-lock.json` ou `yarn.lock` serão fechados imediatamente.
3. PRs com novas dependências devem incluir uma justificativa no corpo — se a dependência for de alto acoplamento, um ADR é necessário antes do merge.
4. Mantenha o escopo do PR focado: uma mudança por PR. PRs que misturam features, refatorações e correções de bug são difíceis de revisar e atraem comentários que atrasam o merge.
5. Se o PR implementa uma decisão arquitetural, referencie o ADR correspondente no corpo.
6. Se o PR adiciona ou altera uma rota (path, método, payload, headers), inclua a atualização do arquivo `.bru` correspondente em `bruno/`. PRs que alteram contratos de API sem atualizar a coleção serão solicitados a corrigir antes do merge.
7. Descreva o que foi mudado e como testar — o revisor não deve precisar adivinhar o contexto.

---

<a name="reportando-problemas"></a>

## Reportando Problemas

Abra uma [issue no GitHub](https://github.com/MissionAppFaithTech/MissionAppBackend/issues) com:

- Descrição clara do problema
- Passos para reproduzir
- Comportamento esperado vs. comportamento observado
- Versão do Node.js, sistema operacional e saída de `docker compose ps` se relevante

Para **vulnerabilidades de segurança**, não abra uma issue pública. Consulte o [SECURITY.md](./SECURITY.md) para o processo de divulgação responsável.

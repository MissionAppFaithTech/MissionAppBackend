# ⛪ Mission App — Backend

## 📋 Sumário

1. [Visão Geral](#visao-geral)
2. [Estrutura do Projeto](#estrutura-do-projeto)
3. [Estrutura da Documentação](#estrutura-da-documentacao)
4. [Tipos de Usuários](#tipos-de-usuarios)
5. [Ferramentas Necessárias](#ferramentas-necessarias)
6. [Versões de Tecnologias Utilizadas](#versoes-de-tecnologias-utilizadas)
7. [Como Executar o Servidor](#como-executar-o-servidor)
8. [Links Externos](#links-externos)
9. [Equipe de Desenvolvimento](#equipe-de-desenvolvimento)

---

<a name="visao-geral"></a>

## 🗺️ Visão Geral

O **MissionApp** é uma plataforma open-source de conexão entre **missionários** e seus **apoiadores**. O sistema oferece ao missionário uma presença digital estruturada — perfil, projetos de impacto, campanhas e feed de postagens — enquanto os apoiadores acompanham, interagem e contribuem financeiramente com as causas que acreditam.

---

<a name="estrutura-do-projeto"></a>

## 📂 Estrutura do Projeto

<details open> 
  <summary>Mostrar/Ocultar</summary>

<!-- readme-tree start -->
```
.
├── app
│   ├── auth
│   │   ├── guards
│   │   └── providers
│   ├── constants
│   ├── controllers
│   │   ├── auth
│   │   └── user
│   ├── enums
│   │   ├── authentication_audit
│   │   ├── financial_config
│   │   ├── media_asset
│   │   ├── missionary
│   │   ├── refresh_token
│   │   ├── user
│   │   └── user_action_audit
│   ├── events
│   │   ├── auth
│   │   └── user
│   ├── exceptions
│   │   └── auth
│   ├── jobs
│   │   ├── auth
│   │   └── user
│   ├── listeners
│   │   ├── auth
│   │   └── user
│   ├── middleware
│   ├── models
│   │   ├── filters
│   │   └── mixins
│   ├── queues
│   ├── services
│   │   ├── auth
│   │   ├── search
│   │   └── shared
│   │       ├── cache
│   │       └── search
│   ├── transformers
│   ├── types
│   │   ├── auth
│   │   ├── events
│   │   │   ├── auth
│   │   │   └── user
│   │   ├── http
│   │   └── services
│   │       └── auth
│   ├── utils
│   └── validators
│       ├── shared
│       │   ├── fields
│       │   └── schemas
│       └── user
├── bin
├── bruno
│   ├── auth
│   │   └── sessions
│   ├── environments
│   └── user
├── client
│   └── registry
├── commands
├── config
├── database
│   ├── migrations
│   └── seeders
├── docs
│   ├── api
│   │   └── v1
│   │       ├── auth
│   │       └── user
│   ├── architecture
│   │   ├── decisions
│   │   └── templates
│   └── deployment
├── providers
├── resources
│   ├── assets
│   │   └── emails
│   └── views
│       └── emails
│           ├── auth
│           ├── components
│           └── user
├── start
├── stubs
│   └── make
│       ├── model
│       └── util
├── tests
│   ├── functional
│   │   ├── auth
│   │   └── user
│   └── unit
│       ├── jobs
│       │   ├── auth
│       │   └── user
│       ├── listeners
│       │   └── user
│       └── services
│           ├── auth
│           └── search
└── tmp

104 directories
```
<!-- readme-tree end -->

</details>

<a name="estrutura-da-documentacao"></a>

## 📁 Estrutura da Documentação (`docs/`)

A pasta `docs/` é organizada por **audiência** — cada subpasta serve a um perfil diferente de colaborador:

<table width="100%">
  <thead>
    <tr>
      <th>Pasta</th>
      <th>Audiência</th>
      <th>O que contém</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>docs/api/v1/&lt;domínio&gt;/</code></td>
      <td>Devs frontend e mobile</td>
      <td>Contrato OpenAPI por domínio (<code>auth/</code>, <code>user/</code> e etc). <code>openapi.yaml</code> é um agregador só com <code>$ref</code>s; o conteúdo real (paths, schemas) vive em <code>&lt;domínio&gt;.openapi.yaml</code> no mesmo diretório. Servido estaticamente via Scalar — ver <a href="./docs/architecture/decisions/0027-documentacao-de-endpoints-com-openapi-estatico-e-scalar.md">ADR-0027</a>.</td>
    </tr>
    <tr>
      <td><code>docs/architecture/</code></td>
      <td>Todo o time</td>
      <td><strong>ADRs</strong> — o porquê de cada decisão arquitetural. Template oficial em <code>templates/</code>. Leia o <a href="./docs/architecture/decisions/README.md">guia de ADRs</a> antes de propor mudanças estruturais.</td>
    </tr>
    <tr>
      <td><code>docs/deployment/</code></td>
      <td>DevOps e infraestrutura</td>
      <td>Pipelines do GitHub Actions, arquitetura AWS (ver <a href="./docs/architecture/decisions/0013-padronizacao-de-nomenclatura-de-buckets.md">ADR-0013</a>), requisitos de produção e runbooks.</td>
    </tr>
  </tbody>
</table>

> [!IMPORTANT]
> Antes de implementar qualquer mudança arquitetural de alto impacto — troca de ORM, novo serviço de infraestrutura, alteração de fluxo de negócio crítico — consulte os ADRs existentes e avalie se a mudança exige um novo registro.

---

<a name="tipos-de-usuarios"></a>

## 👤 Tipos de Usuários

A plataforma reconhece **três perfis principais**, cada um com privilégios e responsabilidades específicas alinhadas com o fluxo de negócio da MissionApp:

<table width="100%">
  <colgroup>
    <col width="18%">
    <col width="28%">
    <col width="54%">
  </colgroup>
  <thead>
    <tr>
      <th>Role</th>
      <th>Criação de Conta</th>
      <th>Permissões Principais</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>ADMIN</code></td>
      <td>Provisionamento interno (DB) — sem auto-cadastro</td>
      <td><strong>Gerenciamento global:</strong> Aprovação de missionários, curadoria de projetos, gestão de campanhas de promoção, controle de usuários.<br><br><strong>Acesso exclusivo:</strong> Painel administrativo com verificação explícita de role.</td>
    </tr>
    <tr>
      <td><code>MISSIONARY</code></td>
      <td>Auto-cadastro + email verification + aprovação de admin</td>
      <td><strong>Produção de conteúdo:</strong> Criar posts com imagens, projetos de impacto com vídeo e capa, campanhas de arrecadação.<br><br><strong>Gerenciamento financeiro:</strong> Configurar Pix, transferência bancária e futuros gateways.<br><br><strong>Rede social:</strong> Seguir outros missionários, visualizar feeds de conexões. Perfil expandido com agência missionária e dados eclesiásticos.</td>
    </tr>
    <tr>
      <td><code>SUPPORTER</code></td>
      <td>Auto-cadastro com dados básicos — opcional: criar/vincular comunidade de fé</td>
      <td><strong>Consumo e apoio:</strong> Seguir missionários, visualizar feed de postagens, interagir com likes em posts.<br><br><strong>Descoberta:</strong> Explorar projetos recomendados, pesquisar missionários e projetos.<br><br><strong>Doações:</strong> Realizar contribuições via Pix, transferência bancária e futuro gateway.<br><br><strong>Acesso anônimo:</strong> Usuários não autenticados podem acessar rotas públicas em leitura.</td>
    </tr>
  </tbody>
</table>

---

<a name="ferramentas-necessarias"></a>

## ✔️ Ferramentas Necessárias

Certifique-se de ter os seguintes softwares instalados antes de continuar:

- [Node.js](https://nodejs.org/) (versão mínima: 22.x)
- [pnpm](https://pnpm.io/) (versão mínima: 11.x)
- [Docker](https://www.docker.com/) (versão mínima: 20.10)
- [Docker Compose](https://docs.docker.com/compose/) (versão mínima: 2.x)

---

<a name="versoes-de-tecnologias-utilizadas"></a>

## ⚙️ Versões de Tecnologias Utilizadas

- **Node.js**: 24.14.0
- **TypeScript**: 6.0.2
- **pnpm**: 11.0.8
- **AdonisJS Core**: 7.3.1
- **AdonisJS Lucid (ORM)**: 22.4.2
- **VineJS (Validação)**: 4.3.1
- **Argon2 (Hashing)**: 0.44.0
- **PostgreSQL**: 18.3 (alpine)

---

<a name="como-executar-o-servidor"></a>

## 💻 Como Executar o Servidor

1. Abra o terminal em um diretório de sua preferência e clone o repositório:

```bash
git clone https://github.com/MissionAppFaithTech/MissionAppBackend.git
```

2. Navegue para dentro do projeto clonado:

```bash
cd MissionApp_Backend
```

3. Instale as dependências do projeto:

```bash
pnpm install
```

4. Crie o arquivo `.env` copiando o exemplo:

```bash
cp .env.example .env
# Preencha os valores obrigatórios que estiverem em branco.
```

5. Inicialize o container do banco de dados:

```bash
docker compose up -d
```

6. Execute as migrations para criar as tabelas do banco:

```bash
node ace migration:run
```

7. Rode o servidor em modo de desenvolvimento com HMR:

```bash
node ace serve --hmr
```

---

<a name="links-externos"></a>

## 🔗 Links Externos

- **Design Figma do Projeto**: <a href="https://www.figma.com/design/uMAwJPYKaEoN7ScjAmgZ6O/Mission-app?node-id=902-4759&p=f&t=HoAfNbpnftTUdkHA-0" target="_blank">Clique Aqui</a>
- **Diagrama ER do Banco de Dados**: <a href="https://dbdocs.io/missionapp.faithtech/Mission-App-DB?view=relationships" target="_blank">Clique Aqui</a>
- **Trello do Projeto**: <a href="https://trello.com/b/3lhDRlzx/mission-app" target="_blank">Clique Aqui</a>
- **Requisitos do Projeto**: <a href="https://missionappfaithtech.github.io/MissionAppRequirementsList/" target="_blank">Clique Aqui</a>
- **Configuração do Mend Renovate**: <a href="https://developer.mend.io" target="_blank">Clique Aqui</a>
- **Configuração do Snyk**: <a href="https://app.snyk.io/login" target="_blank">Clique Aqui</a>
- **Configuração do Resend**: <a href="https://resend.com/login" target="_blank">Clique Aqui</a>

---

<a name="equipe-de-desenvolvimento"></a>

## 👥 Equipe de Desenvolvimento

- **Dev Backend**: <a href="https://github.com/Amaro-peter" target="_blank">Pedro Amaro</a>
- **Dev Backend**: <a href="https://github.com/allanacaoliveira" target="_blank">Allana Oliveira</a>
- **Dev Backend**: <a href="https://github.com/AFSFerreira" target="_blank">Allber Ferreira</a>

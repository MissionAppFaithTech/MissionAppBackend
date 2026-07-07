# ⛪ Mission App — Backend

## 📋 Sumário

1. [Visão Geral](#visao-geral)
2. [Estrutura do Projeto](#estrutura-do-projeto)
3. [Estrutura da Documentação](#estrutura-da-documentacao)
4. [Tipos de Usuários](#tipos-de-usuarios)
5. [Funcionalidades por Requisito](#funcionalidades-por-requisito)
6. [Requisitos Não Funcionais](#requisitos-nao-funcionais)
7. [Ferramentas Necessárias](#ferramentas-necessarias)
8. [Versões de Tecnologias Utilizadas](#versoes-de-tecnologias-utilizadas)
9. [Como Executar o Servidor](#como-executar-o-servidor)
10. [Links Externos](#links-externos)
11. [Equipe de Desenvolvimento](#equipe-de-desenvolvimento)

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
│   ├── enums
│   │   ├── authentication_audit
│   │   ├── financial_config
│   │   ├── media_asset
│   │   ├── missionary
│   │   ├── refresh_token
│   │   ├── user
│   │   └── user_action_audit
│   ├── exceptions
│   ├── jobs
│   ├── listeners
│   ├── middleware
│   ├── models
│   │   ├── filters
│   │   └── mixins
│   ├── services
│   ├── transformers
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
│   └── migrations
├── docs
│   ├── api
│   │   └── v1
│   │       ├── auth
│   │       └── user
│   ├── architecture
│   │   ├── decisions
│   │   └── templates
│   ├── business
│   ├── deployment
│   └── setup
├── providers
├── server
├── start
├── stubs
│   └── make
│       ├── model
│       └── util
├── tests
│   ├── functional
│   │   └── auth
│   └── unit
│       └── services
└── tmp

66 directories
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
      <td><code>docs/api/</code></td>
      <td>Devs frontend e mobile</td>
      <td>Specs OpenAPI/Swagger, coleções Postman, guias de autenticação e contratos de resposta por endpoint.</td>
    </tr>
    <tr>
      <td><code>docs/architecture/</code></td>
      <td>Todo o time</td>
      <td><strong>ADRs</strong> — o porquê de cada decisão arquitetural. Template oficial em <code>templates/</code>. Leia o <a href="./docs/architecture/decisions/README.md">guia de ADRs</a> antes de propor mudanças estruturais.</td>
    </tr>
    <tr>
      <td><code>docs/business/</code></td>
      <td>Product Managers e devs</td>
      <td>Regras de negócio puras, fluxos de doações, aprovação de campanhas, campos obrigatórios por perfil de usuário.</td>
    </tr>
    <tr>
      <td><code>docs/setup/</code></td>
      <td>Novos contribuidores</td>
      <td>Guia de instalação, subida dos containers Docker, execução das migrations e explicação do <code>.env.example</code>.</td>
    </tr>
    <tr>
      <td><code>docs/deployment/</code></td>
      <td>DevOps e infraestrutura</td>
      <td>Pipelines do GitHub Actions, arquitetura AWS (ver <a href="./docs/architecture/decisions/0011-padronizacao-de-nomenclatura-de-buckets.md">ADR-0011</a>), requisitos de produção e runbooks.</td>
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
      <td>Provisionamento interno (DB) — sem auto-cadastro (Req 4.1)</td>
      <td><strong>Gerenciamento global:</strong> Aprovação de missionários (Req 5), curadoria de projetos (Req 5.4), gestão de campanhas de promoção, controle de usuários.<br><br><strong>Acesso exclusivo:</strong> Painel administrativo com verificação explícita de role (Req 4.2).</td>
    </tr>
    <tr>
      <td><code>MISSIONARY</code></td>
      <td>Auto-cadastro + email verification + aprovação de admin (Req 3)</td>
      <td><strong>Produção de conteúdo:</strong> Criar posts com imagens (Req 6), projetos de impacto com vídeo e capa (Req 7), campanhas de arrecadação.<br><br><strong>Gerenciamento financeiro:</strong> Configurar Pix, transferência bancária e futuros gateways (Req 9).<br><br><strong>Rede social:</strong> Seguir outros missionários, visualizar feeds de conexões (Req 14.4). Perfil expandido com agência missionária e dados eclesiásticos (Req 3.1.1).</td>
    </tr>
    <tr>
      <td><code>SUPPORTER</code></td>
      <td>Auto-cadastro com dados básicos (Req 2.1) — opcional: criar/vincular comunidade de fé</td>
      <td><strong>Consumo e apoio:</strong> Seguir missionários, visualizar feed de postagens, interagir com likes em posts (Req 5.4, 15.2.1).<br><br><strong>Descoberta:</strong> Explorar projetos recomendados (Req 12, 15.4.1), pesquisar missionários e projetos (Req 11).<br><br><strong>Doações:</strong> Realizar contribuições via Pix, transferência bancária e futuro gateway (Req 9).<br><br><strong>Acesso anônimo:</strong> Usuários não autenticados podem acessar rotas públicas em leitura (Req 1.4).</td>
    </tr>
  </tbody>
</table>

### Contexto de Comunidade de Fé

Usuários **SUPPORTER** e **MISSIONARY** podem estar vinculados a uma **Comunidade de Fé (igreja)** durante o cadastro:

- Os dados eclesiásticos podem ser atualizados pelo próprio usuário dentro de **30 dias** após cadastro
- Após 30 dias, alterações requerem aprovação formal do administrador (Req 13.3)
- Pastores são implementados como usuários **SUPPORTER** com vinculação à comunidade de fé, sem role separada

---

<a name="funcionalidades-por-requisito"></a>

## ✅ Funcionalidades por Requisito

### 📌 Requisito 1 – Autenticação e Acesso

- [ ] 1.1 Login com e-mail e senha
- [ ] 1.2 Logout e revogação de token de acesso
- [ ] 1.3 Aprovação de cadastro: administrador aprova pedido de registro de missionário

### 📌 Requisito 2 – Cadastro e Edição de Usuários

- [ ] 2.1 Cadastro de usuário padrão
- [ ] 2.2 Cadastro e perfil de missionário (com agência missionária vinculada)
- [ ] 2.3 Cadastro e perfil de pastor (com comunidade de fé vinculada)
- [ ] 2.4 Cadastro de administrador do sistema
- [ ] 2.5 Edição e deleção de perfis pelos respectivos tipos de usuário

### 📌 Requisito 3 – Agências Missionárias

- [ ] 3.1 Criação de agência missionária
- [ ] 3.2 Edição e deleção de agência
- [ ] 3.3 Associação de missionários a agências
- [ ] 3.4 Listagem e busca de agências

### 📌 Requisito 4 – Comunidades de Fé

- [ ] 4.1 Criação de comunidade de fé
- [ ] 4.2 Edição e deleção de comunidade
- [ ] 4.3 Vinculação de pastor a comunidade

### 📌 Requisito 5 – Posts e Interações

- [ ] 5.1 Criação de post por missionário
- [ ] 5.2 Edição e deleção de post pelo autor
- [ ] 5.3 Listagem e feed de posts
- [ ] 5.4 Likes em posts:
  - [ ] 5.4.1 Criação de like
  - [ ] 5.4.2 Remoção de like
  - [ ] 5.4.3 Contagem de likes por post
- [ ] 5.5 Comentários em posts:
  - [ ] 5.5.1 Criação de comentário
  - [ ] 5.5.2 Recuperação de comentários de um post
  - [ ] 5.5.3 Edição de comentário pelo autor
  - [ ] 5.5.4 Deleção de comentário
  - [ ] 5.5.5 Resposta a comentários (comentários aninhados)
- [ ] 5.6 Seguidores:
  - [ ] 5.6.1 Seguir missionário
  - [ ] 5.6.2 Deixar de seguir
  - [ ] 5.6.3 Listagem de seguidores e seguidos

### 📌 Requisito 6 – Projetos de Impacto e Campanhas

- [ ] 6.1 Criação de projeto de impacto por missionário
- [ ] 6.2 Edição e deleção de projeto de impacto
- [ ] 6.3 Criação de campanha vinculada a projeto de impacto
- [ ] 6.4 Edição e deleção de campanha
- [ ] 6.5 Criação de projeto de campanha
- [ ] 6.6 Acompanhamento de progresso de campanha

### 📌 Requisito 7 – Mídias e Arquivos

- [ ] 7.1 Upload de foto de perfil (missionário, pastor, usuário)
- [ ] 7.2 Upload de imagens em posts
- [ ] 7.3 Upload de documentos em projetos de impacto
- [ ] 7.4 Deleção de mídia associada a recurso removido

---

<a name="requisitos-nao-funcionais"></a>

## 🧪 Requisitos Não Funcionais

- [x] NF.1 — **Segurança:** Controle de acesso por tipo de usuário via middleware de autenticação
- [x] NF.2 — **Auditoria:** Ações sensíveis registradas em `authentication_audits` e `user_action_audits`
- [ ] NF.3 — **Desempenho:** Respostas de busca em menos de 500ms
- [ ] NF.4 — **Usabilidade:** Busca tolerante a erros de digitação em termos individuais
- [ ] NF.5 — **Observabilidade:** Logs estruturados em produção com rastreabilidade de requisições

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

- **Design Figma do Projeto**: <a href="https://www.figma.com/design/uMAwJPYKaEoN7ScjAmgZ6O/Mission-app?node-id=0-1&p=f&t=tbv9G0Hex8H0IrXX-0" target="_blank">Clique Aqui</a>
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

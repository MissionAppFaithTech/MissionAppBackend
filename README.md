# ⛪ Mission App — Backend

## 📋 Sumário

1. [Visão Geral](#visao-geral)
2. [Estrutura do Projeto](#estrutura-do-projeto)
3. [Esquema do Banco de Dados e Migrations](#esquema-do-banco-de-dados)
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

<!-- START_TREE -->
```bash
├── app/
│   ├── controllers/            # Handlers HTTP das rotas
│   ├── enums/                  # Enums do domínio (usuário, missionário, mídia, auditoria...)
│   ├── exceptions/             # Handler global de erros
│   ├── middleware/             # Auth, silent auth, force JSON response...
│   ├── models/                 # Modelos Lucid ORM
│   │   └── mixins/             # Mixins reutilizáveis (soft delete, timestamps...)
│   ├── transformers/           # Serialização e formatação das respostas
│   └── validators/             # Schemas de validação com VineJS
├── bin/                        # Entrypoints: server, console e test
├── config/                     # Configurações do framework (auth, DB, CORS, session...)
├── database/
│   └── migrations/             # Migrations Lucid ordenadas por timestamp
├── docs/
│   ├── api/v1/                 # Specs OpenAPI, coleções Postman/Insomnia
│   ├── architecture/
│   │   ├── decisions/          # Architecture Decision Records (ADRs)
│   │   └── templates/          # Template oficial de ADR
│   ├── business/               # Regras de negócio e fluxos funcionais
│   ├── deployment/             # Pipelines CI/CD, infraestrutura cloud, runbooks
│   └── setup/                  # Guia de setup local para novos contribuidores
├── providers/                  # Service providers customizados do AdonisJS
├── start/                      # Bootstrap: rotas, kernel, env, validadores globais
├── tests/                      # Testes de integração com Japa
├── docker-compose.yml
├── adonisrc.ts
└── tsconfig.json
```
<!-- END_TREE -->

## 📁 Estrutura da Documentação (`docs/`)

A pasta `docs/` é organizada por **audiência** — cada subpasta serve a um perfil diferente de colaborador:

<div align="center">

<table width="100%">
  <thead>
    <tr>
      <th align="left">Pasta</th>
      <th align="left">Audiência</th>
      <th align="left">O que contém</th>
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
      <td>Pipelines do GitHub Actions, arquitetura AWS (ver <a href="./docs/architecture/decisions/0009-padronizacao-de-nomenclatura-de-buckets.md">ADR-0009</a>), requisitos de produção e runbooks.</td>
    </tr>
  </tbody>
</table>

</div>

> [!IMPORTANT]
> Antes de implementar qualquer mudança arquitetural de alto impacto — troca de ORM, novo serviço de infraestrutura, alteração de fluxo de negócio crítico — consulte os ADRs existentes e avalie se a mudança exige um novo registro.

---

<a name="tipos-de-usuarios"></a>

## 👤 Tipos de Usuários

<div align="center">

| Tipo de Usuário | Permissões Principais |
| :---: | :--- |
| `ADMIN` | Gerenciamento global do sistema; aprovação de cadastros de missionários |
| `MISSIONARY` | Criação de posts, projetos de impacto e campanhas; perfil expandido com agência |
| `PASTOR` | Gestão de comunidade de fé vinculada; acesso a recursos pastorais |
| `DEFAULT` | Usuário padrão: segue missionários, curte e comenta posts, apoia campanhas |

</div>

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
git clone https://github.com/AFSFerreira/MissionApp_Backend
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
- **Documentação da API**: <a href="https://documenter.getpostman.com/view/49158090/2sB3QKrpbz" target="_blank">Clique Aqui</a>
- **Diagrama ER do Banco de Dados**: <a href="https://dbdocs.io/missionapp.faithtech/Mission-App-DB?view=relationships" target="_blank">Clique Aqui</a>
- **Trello do Projeto**: <a href="https://trello.com/b/3lhDRlzx/mission-app" target="_blank">Clique Aqui</a>
- **Requisitos do Projeto**: <a href="https://docs.google.com/document/d/1aTgtD6RwDOv-ElDbvlErbRf1JiwT4dvD950_ZKWVTGU/edit?tab=t.0" target="_blank">Clique Aqui</a>

---

<a name="equipe-de-desenvolvimento"></a>

## 👥 Equipe de Desenvolvimento

- **Dev Backend**: <a href="https://github.com/Amaro-peter" target="_blank">Pedro Amaro</a>
- **Dev Backend**: <a href="https://github.com/allanacaoliveira" target="_blank">Allana Oliveira</a>
- **Dev Backend**: <a href="https://github.com/AFSFerreira" target="_blank">Allber Ferreira</a>

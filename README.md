# ⛪ Mission App

## 📋 Sumário:

1. [Visão Geral](#visao-geral)
2. [Estrutura do Projeto](#estrutura-do-projeto)
3. [Tipos de Usuários](#tipos-de-usuarios)
4. [Funcionalidades por Requisito](#funcionalidades-por-requisito)
5. [Requisitos Não Funcionais](#requisitos-nao-funcionais)
6. [Ferramentas Necessárias](#ferramentas-necessarias)
7. [Versões de Tecnologias Utilizadas](#versoes-de-tecnologias-utilizadas)
8. [Como Executar o Servidor](#como-executar-o-servidor)
9. [Links Externos](#links-externos)
10. [Equipe de Desenvolvimento](#equipe-de-desenvolvimento)

---

<a name="visao-geral"></a>

## 🗺️ Visão Geral:

Neste projeto consta o backend recriado para o sistema do projeto MissionAPP.

---

<a name="estrutura-do-projeto"></a>

## 📂 Estrutura do Projeto:

```bash
├─── .github
├─── .husky
├─── .vscode
├─── logs
├─── prisma
│    ├─── seed-data
│    └─── migrations
│         └─── ...
└─── src
     ├─── @types
     ├─── constants
     ├─── env
     ├─── http
     │    ├─── controllers
     │    │    └─── users
     │    ├─── middlewares
     │    ├─── plugins
     │    ├─── presenters
     │    └─── schemas
     │         ├─── users
     │         └─── utils
     │              ├─── components
     │              ├─── enums
     │              └─── primitives
     ├─── lib
     │    ├─── async-local-storage
     │    ├─── logger
     │    ├─── prisma
     │    └─── redis
     ├─── repositories
     │    └─── prisma
     ├─── templates
     │    └─── forgot-password
     ├─── use-cases
     │    ├─── errors
     │    ├─── factories
     │    └─── users
     └─── utils
```

---

<a name="tipos-de-usuarios"></a>

## 👤 Tipos de Usuários:

<div align="center">

| Tipo de Usuário   |             Permissões Principais                  |
| :---------------: | :------------------------------------------------: |
|   ADMIN           |       Gerenciamento global do sistema              |
|   MISSIONARY      |  Missionário com permissão de criar postagens      |
|   DEFAULT         |  Usuário do sistema sem permissões especiais       |

</div>

---

<a name="funcionalidades-por-requisito"></a>

## ✅ Funcionalidades por Requisito:

### 📌 Requisito 1 – Autenticação e Acesso:

- [ ] 1.1 Login com email e senha
- [ ] 1.2 Redefinição de senha (esqueci a senha)
- [ ] 1.3 Aprovação de Cadastro: Administrador do sistema aprova pedido de cadastro de missionário

### 📌 Requisito 2 – Cadastro e Edição de Usuários:

- [ ] 2.1 Cadastro de usuário
- [ ] 2.2 Cadastro de missionário
- [ ] 2.3 Cadastro de gestor do sistema
- [ ] 2.4 Edição/Deleção de informações dos diferentes tipos de usuários do sistema

### 📌 Requisito 3 – Criação e Edição de Postagens:
- [ ] 3.1 Criação de postagens por um missionário
- [ ] 3.2 Edição/Deleção de postagens por um missionário
- [ ] 3.3 Comentários em postagens:
     - [ ] 3.3.1 Criação de comentários em postagens
     - [ ] 3.3.2 Recuperação de comentários em postagens
     - [ ] 3.3.3 Deleção de comentários em postagens
     - [ ] 3.3.4 Atualização de comentários em postagens
     - [ ] 3.3.5 Responder comentários em postagens
- [ ] 3.4 Likes em postagens:
     - [ ] 3.4.1 Criação de likes em postagens
     - [ ] 3.4.2 Recuperação de likes em postagens
     - [ ] 3.4.3 Deleção de likes em postagens

---

<a name="requisitos-nao-funcionais"></a>

## 🧪 Requisitos Não Funcionais:

- [x] NF.1 - Segurança: O sistema deve controlar o acesso por tipo de usuário
- [ ] NF.2 - Usabilidade: A busca deve recuperar resultados relevantes mesmo quando a entrada contiver erros de digitação em termos individuais.
- [ ] NF.3 - Desempenho: O sistema deve retornar os resultados de busca em menos de 500ms

---

<a name="ferramentas-necessarias"></a>

## ✔️ Ferramentas Necessárias:
Certifique-se de que você tenha os seguintes softwares instalados antes de continuar:

- [Node.js](https://nodejs.org/) (versão mínima: 18.x)
- [NPM](https://www.npmjs.com/) (versão mínima: 9.x)
- [Docker](https://www.docker.com/) (versão mínima: 20.10)
- [Docker Compose](https://docs.docker.com/compose/) (versão mínima: 1.29)

---

<a name="versoes-de-tecnologias-utilizadas"></a>

## ⚙️ Versões de Tecnologias Utilizadas:
- **Node.js**: 22.19.0
- **TypeScript**: 5.3.3
- **Fastify**: 5.6.1
- **Zod**: 4.1.11
- **Pino**: 9.9.2
- **Prisma**: 6.16.3
- **PostgreSQL**: 13.12 (alpine)
- **Redis**: 7.2.11 (alpine)
- **Firebase**: 12.0.0
- **ElasticSearch**: 9.1.5

---

<a name="como-executar-o-servidor"></a>

## 💻 Como Executar o Servidor:
1. Abra o terminal - `CMD`, `PowerShell`, `Bash` ou similares - em algum diretório de preferência em sua máquina.
2. Clone este repositório com o comando:

```bash
git clone https://github.com/Amaro-peter/Mission_App_v1.1
```

3. Navegue para dentro do projeto clonado com o comando:

```bash
cd Mission_App_v1.1
```

4. Instale as dependências do projeto ao executar no console o comando:

```bash
npm install
```

5. Crie um arquivo `.env` na raiz do projeto copiando o conteúdo do `.env.example`:

```bash
copy .env.example .env
# Preencha manualmente os valores do arquivo .env que não estiverem definidos.
```

6. Inicialize os contêiners do Docker executando o comando:

```bash
docker compose up -d
```

7. Execute o comando para resetar o banco de dados, populá-lo com dados de teste definidos em `prisma/seed.ts` e habilitar as extensões necessárias:

```bash
npx prisma migrate reset
```

8. Rode o projeto com o comando:

```bash
npm run start:dev
```

---

<a name="links-externos"></a>

## 🔗 Links Externos:

- **Design Figma do Projeto**: <a href="https://www.figma.com/design/uMAwJPYKaEoN7ScjAmgZ6O/Mission-app?node-id=0-1&p=f&t=tbv9G0Hex8H0IrXX-0" target="_blank">Clique Aqui</a>
- **Documentação da API**: <a href="https://documenter.getpostman.com/view/49158090/2sB3QKrpbz" target="_blank">Clique Aqui</a>
- **Diagrama ER do Banco de Dados**: <a href="https://dbdocs.io/missionapp.faithtech/Mission-App-DB?view=relationships" target="_blank">Clique Aqui</a>
- **Trello do Projeto**: <a href="https://trello.com/b/3lhDRlzx/mission-app" target="_blank">Clique Aqui</a>

---

<a name="equipe-de-desenvolvimento"></a>

## 👥 Equipe de Desenvolvimento:

- **Dev Backend**: <a href="https://github.com/Amaro-peter" target="_blank">Pedro Amaro</a>
- **Dev Backend**: <a href="https://github.com/allanacaoliveira" target="_blank">Allana Oliveira</a>
- **Dev Backend**: <a href="https://github.com/AFSFerreira" target="_blank">Allber Ferreira</a>

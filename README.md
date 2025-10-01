# Mission App - ⛪

## 📋 Sumário:

1. [Visão Geral](#visao-geral)
2. [Estrutura do Projeto](#estrutura-do-projeto)
3. [Tipos de Usuários](#tipos-de-usuarios)
4. [Funcionalidades por Requisito](#funcionalidades-por-requisito)
5. [Requisitos Não Funcionais](#requisitos-nao-funcionais)
6. [Casos de Uso Principais](#casos-de-uso-principais)
7. [Requisitos](#requisitos)
8. [Versões Utilizadas](#versoes-utilizadas)
9. [Como Executar o Servidor](#como-executar-o-servidor)
10. [Links Externos](#links-externos)
11. [Equipe de Desenvolvimento](#equipe-de-desenvolvimento)

---

<a name="visao-geral"></a>

## 🗺️ Visão Geral:

Neste projeto consta o backend recriado para o sistema do projeto MissionAPP. 

---

<a name="estrutura-do-projeto"></a>

## 📂 Estrutura do Projeto:

```bash
├─── .github
├─── .vscode
├─── logs
├─── prisma
└─── src
     ├─── @types
     ├─── constants
     ├─── env
     ├─── http
     │    ├─── controllers
     │    │    └─── users
     │    ├─── middlewares
     │    └─── schemas
     │         ├───users
     │         └───utils
     ├─── lib
     │    ├─── logger
     │    └─── prisma
     ├─── repositories
     │    └─── prisma
     ├─── templates
     │    └─── forgot-password
     ├─── use-cases
     │    ├─── errors
     │    ├─── factories
     │    ├─── messaging
     │    └─── users
     └─── utils
```

---

<a name="tipos-de-usuarios"></a>

## 👤 Tipos de Usuários:

<div align="center">

| Tipo de Usuário   |            Permissões Principais                   |
| :---------------: | :------------------------------------------------: |
|   ADMIN           |       Gerenciamento global do sistema              |
|   MISSIONARY      |  Missionário com permissão de criar postagens      |
|   DEFAULT         |  Usuário do sistema sem permissões especiais       |

</div>

---

<a name="funcionalidades-por-requisito"></a>

## ✅ Funcionalidades por Requisito:

### 📌 Requisito 1 – (Nome do Requisito 1):

- [x] 1.1 Cadastro de usuário
- [x] 1.2 Redefinição de senha (esqueci a senha)
- [x] 1.3 Login com email e senha

### 📌 Requisito 2 – (Nome do Requisito 2):

- [ ] 2.1 ...
- [ ] 2.2 ...
- [ ] 2.3 ...

---

<a name="requisitos-nao-funcionais"></a>

## 🧪 Requisitos Não Funcionais:

- [x] NF.1 - Segurança: controle de acesso por tipo de usuário
- [ ] NF.2 - ...
- [ ] NF.3 - ...

---

<a name="casos-de-uso-principais"></a>

## 🛠️ Casos de Uso Principais:

- [x] 1\. Usuário se cadastra no sistema
- [x] 2\. Administrador gerencia o sistema
- [ ] 3\. ...
- [ ] 4\. ...

---

<a name="requisitos"></a>

## ✔️ Requisitos:
Certifique-se de que você tenha os seguintes softwares instalados antes de continuar:

- [Docker](https://www.docker.com/) (versão mínima: 20.10)
- [Docker Compose](https://docs.docker.com/compose/) (versão mínima: 1.29)

---

<a name="versoes-utilizadas"></a>

## ⚙️ Versões Utilizadas:
- **Node.js**: 22.18.0
- **PostgreSQL**: 17.4.0 (Imagem Docker Bitnami)
- **Prisma**: 6.14.0
- **Redis**: 
- **ElasticSearch**: 

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
- **Documentação da API**: <a href="#" target="_blank">(a fazer)</a>
- **Diagrama ER do Banco de Dados**: <a href="https://dbdiagram.io/d/Mission-App-v1-1-68dd6bc2d2b621e422d705fe" target="_blank">Clique Aqui</a>

---

<a name="equipe-de-desenvolvimento"></a>

## 👥 Equipe de Desenvolvimento:

- **Dev Backend**: <a href="https://github.com/Amaro-peter" target="_blank">Pedro Amaro</a>
- **Dev Backend**: <a href="https://github.com/AFSFerreira" target="_blank">Allber Ferreira</a>

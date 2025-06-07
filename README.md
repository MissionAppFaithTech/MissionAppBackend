# Características do Banco de Dados Mission App

Segue algumas particularidades e características do modelo banco de dados:

1. A coleção pastorUsers não precisará ser considerada.
2. A coleção churchUsers não precisará ser considerada.
3. Users é uma coleção de documentos e subcoleções. O documento se refere aos atributos do próprio usuário.
4. O documento (schema ou modelo) de um usuário contém diversos atributos, dentre eles destacamos "missionaryAgency" que precisará de normalização no campo de entrada.
5. Missionários podem seguir e ser seguidos, mas usuários comuns não podem ser seguidos, somente seguir outros missionários.
6. As subcoleções de users são: followers, following e project.
7. followers são os seguidores de um missionário (role: missionary)
8. following são as pessoas que um usuário está seguindo.
9. project é o projeto pessoal de um missionário.
10. churches é um modelo necessário e está presente no cadastro. Também precisamos normalizar o campo "faithCommunity".


# Execução

1. Clone este repositório: `git clone https://github.com/Amaro-peter/Mission_App_v1.1`.
2. Instale as dependências ao executar o comando no console: `npm install`.
3. Crie um arquivo `.env`, copie e cole o conteúdo de `.env.example` e configure as variáveis de ambiente.
4. Inicialize os contêiners do Docker executando o comando `docker-compose up -d`.
5. Execute o comando `npx prisma migrate dev` para transferir as migrações do banco de dados.
6. Execute o projeto com o comando: `npm run start:dev`.


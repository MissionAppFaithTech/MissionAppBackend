# [ADR-0001]: Adoção do AdonisJS como Framework Web Backend

## Dados
* **Status:** Proposto
* **Data:** 2026-05-30
* **Proponentes:** [Allber Ferreira](https://github.com/AFSFerreira)

---

## Contexto e Problema

O MissionApp Backend é uma API REST construída com Node.js e TypeScript que precisa servir três perfis de usuário distintos — missionários, apoiadores e administradores — com requisitos funcionais que incluem autenticação com controle de acesso por role, gerenciamento de perfis, publicação de posts com mídia, projetos de impacto, campanhas de arrecadação, doações, auditoria de ações sensíveis e integração com serviços de armazenamento em nuvem.

Ao iniciar o projeto, a equipe precisou escolher um framework Node.js que sustentasse essa complexidade com as seguintes restrições:

- **Equipe pequena e rotativa:** Por ser open-source com colaboradores voluntários, o framework precisava impor convenções claras o suficiente para que novos contribuidores pudessem navegar e contribuir com o código sem depender de orientação extensa — reduzindo o custo de onboarding.

- **TypeScript como cidadão de primeira classe:** Toda a base de código é TypeScript. O framework não poderia ser uma solução JavaScript com tipos retroativamente adicionados, pois isso introduz inconsistências de tipagem e problemas de DX em projetos maiores.

- **Funcionalidades integradas sem assembly manual:** Um projeto com escopo de API completo — ORM, migrações, validação, autenticação, middleware, IoC — não pode depender de um ecossistema fragmentado de bibliotecas independentes. Cada integração adicional é uma superfície de falha, uma decisão extra e uma dependência que pode se tornar abandonada.

- **Produtividade com convenção:** Em times distribuídos e voluntários, a liberdade excessiva de configuração se converte em inconsistência. Um framework com convenções fortes reduz o espaço de decisões individuais, garantindo que o codebase permaneça coeso independentemente de quem escreveu cada parte.

A questão central é: **qual framework Node.js oferece o melhor equilíbrio entre produtividade, tipagem forte, funcionalidades integradas e convenções que sustentam um projeto open-source de longo prazo?**

## Decisão

Adotaremos o **AdonisJS v7** como framework web principal do MissionApp Backend.

Toda a aplicação será estruturada segundo as convenções do AdonisJS: roteamento via `start/routes.ts`, controllers em `app/controllers/`, modelos Lucid em `app/models/`, validadores VineJS em `app/validators/`, middleware em `app/middleware/`, e migrações em `database/migrations/`. O IoC container nativo será utilizado para injeção de dependências onde aplicável.

As seguintes peças do ecossistema AdonisJS serão adotadas em conjunto:

- **Lucid ORM** — mapeamento objeto-relacional, migrações e seeders
- **VineJS** — validação de entrada tipada com esquemas declarativos
- **@adonisjs/auth** — autenticação com suporte a access tokens
- **@adonisjs/drive** — abstração de armazenamento de arquivos (local e S3)

## Justificativa

O AdonisJS foi escolhido por atender de forma direta e integrada ao conjunto de requisitos levantados:

- **TypeScript nativo desde a concepção:** O AdonisJS v7 foi projetado inteiramente em TypeScript, sem camadas de compatibilidade. Decorators, inferência de tipos nos modelos Lucid, tipagem automática dos validadores VineJS e suporte a IoC fortemente tipado garantem consistência de tipos em toda a aplicação — não apenas nas camadas mais externas.

- **Framework batteries-included com escopo adequado:** AdonisJS entrega em um único ecossistema coeso tudo que o MissionApp precisa: ORM com migrations e relacionamentos, validação declarativa, autenticação com tokens, abstração de storage, sistema de filas, middleware, IoC container e scheduler. Isso elimina a necessidade de avaliar, integrar e manter múltiplas bibliotecas independentes para funções centrais.

- **Convenções fortes que sustentam contribuição aberta:** A estrutura de pastas, o ciclo de vida das requisições e os padrões de nomenclatura do AdonisJS são consistentes e bem documentados. Contribuidores podem entender a navegação do projeto rapidamente, o que é crítico num projeto com alta rotatividade de voluntários.

- **Lucid ORM como caso de uso central:** O MissionApp possui um modelo de dados com múltiplos relacionamentos complexos — usuários polimórficos, posts, projetos de impacto, campanhas, doações, auditorias. O Lucid oferece Active Record com suporte a `belongsTo`, `hasMany`, `manyToMany`, transações, hooks de ciclo de vida e scopes de query — suficiente para toda a modelagem sem introduzir uma camada de abstração extra como Repository Pattern.

- **VineJS como validação type-safe:** A validação de entrada é crítica num sistema com múltiplos perfis de usuário e rotas protegidas. VineJS integra-se nativamente ao AdonisJS com inferência de tipos automática dos esquemas, eliminando a necessidade de tipos duplicados para entrada e domínio.

## Alternativas Consideradas

* **NestJS:** Framework mais popular no ecossistema TypeScript, com arquitetura inspirada no Angular (módulos, decorators, DI). Possui ecossistema amplo e suporte corporativo da Trilon. Descartado porque: (1) a arquitetura modular é mais complexa e exige mais boilerplate para projetos de escopo médio como o MissionApp; (2) não possui ORM nem validação nativos — requer decisões separadas entre TypeORM, Prisma ou MikroORM, e entre class-validator ou Zod; (3) a curva de aprendizado inicial para colaboradores sem background Angular é maior, aumentando o custo de onboarding.

* **Fastify:** Framework minimalista focado em performance, com extenso ecossistema de plugins. Descartado porque: (1) é deliberadamente sem opinião sobre estrutura — toda decisão de ORM, autenticação, validação e organização de pastas precisa ser tomada e integrada pela equipe, multiplicando a superfície de decisão; (2) a ausência de convenções fortes prejudica a coesão em projetos open-source com múltiplos contribuidores; (3) o ganho de performance sobre o AdonisJS não justifica o overhead de montagem e manutenção de um stack fragmentado para o escopo do projeto.

* **Express.js:** Framework mais amplamente adotado do ecossistema Node.js, com vasta quantidade de recursos e tutoriais. Descartado pelos mesmos motivos do Fastify, agravados pelo fato de que o suporte TypeScript é retroativo e a ausência de qualquer convenção de estrutura tornaria o projeto difícil de manter com equipe rotativa. A familiaridade do Express não compensa a incoesão que produziria num projeto de escopo completo.

* **Hono:** Framework moderno, extremamente leve e multi-runtime (Node, Deno, Bun, Edge). Ideal para aplicações serverless e APIs de borda. Descartado porque o MissionApp é uma API com estado (sessões, banco relacional, ORM, uploads) que roda em containers — contexto para o qual Hono não foi projetado e no qual oferece pouco em termos de estrutura e funcionalidades integradas.

## Consequências (Trade-offs)

### Positivas / Benefícios

* **Redução de decisões de infraestrutura:** ORM, migrações, validação, autenticação, storage e IoC estão resolvidos pelo ecossistema AdonisJS. A equipe concentra energia nas regras de negócio, não na montagem do stack.

* **Onboarding estruturado:** A estrutura de pastas e os padrões do AdonisJS são consistentes e documentados. Novos colaboradores têm um mapa claro de onde cada tipo de artefato reside.

* **Tipagem fim-a-fim:** Modelos Lucid, validadores VineJS e controllers carregam tipos consistentes. Erros de integração entre camadas são detectados em tempo de compilação.

* **Auditoria facilitada:** Os hooks de ciclo de vida do Lucid (`beforeCreate`, `afterUpdate`, etc.) e o middleware nativo tornam simples registrar ações sensíveis nas tabelas `authentication_audits` e `user_action_audits`, conforme exigido pelos requisitos não funcionais do projeto.

* **Abstração de storage pronta:** O `@adonisjs/drive` abstrai local, S3 e GCS com a mesma interface, o que alinha diretamente com a estratégia de buckets S3 documentada no [ADR-0009](./0009-padronizacao-de-nomenclatura-de-buckets.md).

### Negativas / Riscos

* **Ecossistema menor que NestJS e Express:** A quantidade de plugins, artigos, tutoriais e perguntas resolvidas no Stack Overflow é inferior à dos frameworks mais populares. Problemas menos comuns podem exigir leitura direta do código-fonte do framework ou da documentação oficial.

* **Menor pool de contribuidores familiarizados:** A maioria dos desenvolvedores Node.js tem experiência com Express ou NestJS, não AdonisJS. Parte dos contribuidores precisará de um período de adaptação às convenções do framework antes de contribuir com confiança.

* **AdonisJS v7 ainda em amadurecimento:** A versão 7 é relativamente recente e parte da documentação e de alguns pacotes do ecossistema ainda está sendo consolidada. Atualizações de breaking changes são possíveis enquanto a API ainda não está totalmente estabilizada.

* **Acoplamento às convenções do framework:** A adoção de AdonisJS significa que decisões de estrutura, ciclo de vida e IoC são ditadas pelo framework. Migrar para outro framework no futuro exigiria refatoração significativa — especialmente nas camadas de modelo (Lucid) e validação (VineJS), que têm APIs proprietárias.

## Referências

* [Documentação oficial do AdonisJS v7](https://docs.adonisjs.com/)
* [Lucid ORM — documentação oficial](https://lucid.adonisjs.com/)
* [VineJS — documentação oficial](https://vinejs.dev/)
* [ADR-0009 — Padronização de Nomenclatura de Buckets S3](./0009-padronizacao-de-nomenclatura-de-buckets.md)

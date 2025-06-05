# 📋 Architecture Decision Records

> [!NOTE]
> Esta pasta é o **registro histórico imutável** das decisões arquiteturais do MissionApp Backend. Cada arquivo aqui explica **o quê foi decidido, por quê, e quais alternativas foram descartadas**.
>
> Se você quer entender por que o projeto foi construído de determinada forma, este é o lugar certo.

---

## 🧭 O que é um ADR?

Um **Architecture Decision Record** captura uma decisão arquitetural importante em um documento estruturado. Não descreve _como_ o código funciona — descreve _por que_ ele foi escrito daquela forma.

<table width="100%">
   <colgroup>
      <col width="40%">
      <col width="60%">
   </colgroup>
   <thead>
      <tr>
         <th>Seção</th>
         <th>O que responde</th>
      </tr>
   </thead>
   <tbody>
      <tr>
         <td align="left"><strong>Contexto e Problema</strong></td>
         <td align="left">Qual era o problema ou necessidade?</td>
      </tr>
      <tr>
         <td align="left"><strong>Decisão</strong></td>
         <td align="left">O que foi escolhido?</td>
      </tr>
      <tr>
         <td align="left"><strong>Justificativa</strong></td>
         <td align="left">Por que essa opção e não outra?</td>
      </tr>
      <tr>
         <td align="left"><strong>Alternativas Consideradas</strong></td>
         <td align="left">O que foi avaliado e descartado?</td>
      </tr>
      <tr>
         <td align="left"><strong>Consequências (Trade-offs)</strong></td>
         <td align="left">Quais os impactos positivos e negativos?</td>
      </tr>
   </tbody>
</table>

> [!TIP]
> Leia os ADRs em ordem cronológica (`0000 → 0001 → ...`) para entender a evolução arquitetural do projeto. É a forma mais eficiente de fazer onboarding na arquitetura.

O formato adotado é baseado no modelo de [Michael Nygard (2011)](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions), com adaptações para o contexto open-source do MissionApp. A decisão de adotar ADRs está documentada no próprio [ADR-0000](./0000-uso-de-architecture-decision-records.md).

---

## ✅ Quando criar um ADR

Crie um ADR quando a decisão...

<table width="100%">
   <colgroup>
      <col width="45%">
      <col width="55%">
   </colgroup>
   <thead>
      <tr>
         <th>Categoria</th>
         <th>Exemplos</th>
      </tr>
   </thead>
   <tbody>
      <tr>
         <td align="left">
            <strong>🏗️ Infraestrutura central</strong><br/>
            Introduz ou substitui banco de dados, ORM, sistema de filas, provedor de autenticação ou storage.
         </td>
         <td align="left">
            <ul>
               <li>Migrar de Lucid para Drizzle</li>
               <li>Adotar Redis para cache</li>
               <li>Usar S3 para imagens de posts</li>
            </ul>
         </td>
      </tr>
      <tr>
         <td align="left">
            <strong>📐 Padrões arquiteturais</strong><br/>
            Define ou altera estrutura de pastas, convenções de camadas, tratamento de erros, contrato da API.
         </td>
         <td align="left">
            <ul>
               <li>Adotar Repository Pattern</li>
               <li>Definir resposta padrão da API REST</li>
               <li>Versionar rotas</li>
            </ul>
         </td>
      </tr>
      <tr>
         <td align="left">
            <strong>🗄️ Modelo de dados</strong><br/>
            Cria ou altera entidades centrais, estratégia de relacionamentos, normalização vs. denormalização.
         </td>
         <td align="left">
            <ul>
               <li>Separar endereços em tabela própria</li>
               <li>Soft delete em entidades críticas</li>
               <li>Modelar projetos de impacto</li>
            </ul>
         </td>
      </tr>
      <tr>
         <td align="left">
            <strong>💸 Fluxo de negócio crítico</strong><br/>
            Muda o funcionamento de doações, autenticação de missionários, publicação de posts ou aprovação de campanhas.
         </td>
         <td align="left">
            <ul>
               <li>Migrar de JWT para sessão</li>
               <li>Alterar fluxo de aprovação de projetos de impacto</li>
            </ul>
         </td>
      </tr>
      <tr>
         <td align="left">
            <strong>📦 Dependência de alto acoplamento</strong><br/>
            Adiciona biblioteca ou serviço externo cuja remoção exigiria refatoração significativa.
         </td>
         <td align="left">
            <ul>
               <li>Provider de e-mail transacional</li>
               <li>Gateway de pagamento</li>
               <li>Lib de geração de PDF</li>
            </ul>
         </td>
      </tr>
      <tr>
         <td align="left">
            <strong>📏 Convenção global</strong><br/>
            Estabelece padrão que todos os colaboradores devem seguir — nomenclatura, testes, logging.
         </td>
         <td align="left">
            <ul>
               <li>Padrão de nomenclatura de arquivos e pastas</li>
               <li>Estratégia de testes adotada pelo projeto</li>
               <li>Formato de logs e observabilidade</li>
            </ul>
         </td>
      </tr>
   </tbody>
</table>

> [!IMPORTANT]
> **Em caso de dúvida:** se a mudança geraria debate em uma code review ou em uma issue, ela merece um ADR.

---

## ❌ Quando NÃO criar um ADR

Não é necessário um ADR para:

<table width="100%">
   <colgroup>
      <col width="55%">
      <col width="45%">
   </colgroup>
   <thead>
      <tr>
         <th>❌ Não cria ADR</th>
         <th>✅ Onde registrar</th>
      </tr>
   </thead>
   <tbody>
      <tr>
         <td align="left">Correção de bugs</td>
         <td align="left">Issue + PR</td>
      </tr>
      <tr>
         <td align="left">Refatoração sem mudança de comportamento externo</td>
         <td align="left">PR com descrição clara</td>
      </tr>
      <tr>
         <td align="left">Adição de testes para código existente</td>
         <td align="left">PR</td>
      </tr>
      <tr>
         <td align="left">Ajustes de ferramentas de dev (ESLint, Prettier)</td>
         <td align="left">PR</td>
      </tr>
      <tr>
         <td align="left">Bump de versão sem breaking change</td>
         <td align="left">PR / Dependabot / RenovateBot</td>
      </tr>
      <tr>
         <td align="left">Otimização pontual (índice, query)</td>
         <td align="left">PR com justificativa no código</td>
      </tr>
      <tr>
         <td align="left">Decisões de UI/UX ou estilo visual</td>
         <td align="left">Repositório do frontend</td>
      </tr>
   </tbody>
</table>

---

## 🚀 Como propor uma decisão arquitetural

### 1. Abra uma Issue

Antes de escrever o ADR completo, abra uma issue descrevendo o problema. Permite discussão prévia e evita esforço desnecessário caso a direção seja descartada.

> [!TIP]
> Use a label **`architecture`** na issue para facilitar o filtro e o acompanhamento pelos gestores.

---

### 2. Copie o template

```bash
cp docs/architecture/templates/adr-template.md \
   docs/architecture/decisions/XXXX-nome-curto-da-decisao.md
```

Substitua `XXXX` pelo próximo número sequencial (verifique o último arquivo nesta pasta).

---

### 3. Preencha o ADR

<table width="100%">
   <colgroup>
      <col width="35%">
      <col width="65%">
   </colgroup>
   <thead>
      <tr>
         <th>Campo</th>
         <th>Instrução</th>
      </tr>
   </thead>
   <tbody>
      <tr>
         <td align="left"><strong>Dados › Status</strong></td>
         <td align="left">Sempre <code>Proposto</code> no início</td>
      </tr>
      <tr>
         <td align="left"><strong>Dados › Proponentes</strong></td>
         <td align="left">Seu link de perfil do GitHub</td>
      </tr>
      <tr>
         <td align="left"><strong>Contexto e Problema</strong></td>
         <td align="left">Seja específico — cite entidades, rotas, arquivos quando relevante</td>
      </tr>
      <tr>
         <td align="left"><strong>Decisão</strong></td>
         <td align="left">Imperativo e objetivo: <em>"Adotaremos X"</em>, não <em>"Poderíamos X"</em></td>
      </tr>
      <tr>
         <td align="left"><strong>Justificativa</strong></td>
         <td align="left">Critérios técnicos que fizeram essa opção vencer</td>
      </tr>
      <tr>
         <td align="left"><strong>Alternativas Consideradas</strong></td>
         <td align="left">O que foi descartado e <strong>por quê exatamente</strong></td>
      </tr>
      <tr>
         <td align="left"><strong>Consequências</strong></td>
         <td align="left">Seja honesto com os negativos — um ADR só com benefícios é suspeito</td>
      </tr>
      <tr>
         <td align="left"><strong>Referências</strong></td>
         <td align="left">Link da issue de origem e documentação relevante</td>
      </tr>
   </tbody>
</table>

---

### 4. Abra um Pull Request

> [!IMPORTANT]
> O PR deve conter **apenas** o arquivo do ADR — sem código de implementação junto. A implementação vem depois, em PR separado, somente após o ADR ser aceito.

Use o título no formato:

```
docs(adr): ADR-XXXX — <título curto da decisão>
```

Adicione a label **`architecture`** e mencione a issue relacionada no corpo do PR.

---

### 5. Aguarde revisão e aprovação

ADRs de alto impacto precisam da aprovação de ao menos **um gestor do projeto** antes de serem marcados como `Aceito`.

```
PR aberto → Revisão e discussão → Aprovado → Status: Aceito → Implementação pode começar
```

---

## 🔄 Ciclo de vida de um ADR

```mermaid
flowchart LR
   Proposto["Proposto"] --> Rejeitado["Rejeitado"]
   Proposto --> Aceito["Aceito"]
   Aceito --> EmUso["em uso"]
   EmUso --> Obsoleto["Obsoleto<br/>(contexto mudou, sem substituto)"]
   EmUso --> Substituido["Substituido pelo ADR-XXXX<br/>(nova decisao supera esta)"]
```

### Legenda de status

<table width="100%">
   <colgroup>
      <col width="20%">
      <col width="80%">
   </colgroup>
   <thead>
      <tr>
         <th>Status</th>
         <th>Significado</th>
      </tr>
   </thead>
   <tbody>
      <tr>
         <td>🟡 Proposto</td>
         <td align="left">PR aberto, ADR em discussão — ainda não aprovado pelos gestores.</td>
      </tr>
      <tr>
         <td>🟢 Aceito</td>
         <td align="left">Aprovado pelos gestores. Implementação autorizada, mas ainda não em uso ativo no projeto.</td>
      </tr>
      <tr>
         <td>🔵 Em Uso</td>
         <td align="left">Aprovado <em>e</em> implementado — decisão ativa no projeto.</td>
      </tr>
      <tr>
         <td>🔴 Rejeitado</td>
         <td align="left">Discutido e descartado. Mantido para histórico e rastreabilidade.</td>
      </tr>
      <tr>
         <td>⚫ Obsoleto</td>
         <td align="left">Contexto mudou e a decisão não se aplica mais — sem ADR substituto direto.</td>
      </tr>
      <tr>
         <td>🟠 Substituído</td>
         <td align="left">Superado por ADR mais recente. O campo <em>Substituído por</em> aponta para o sucessor.</td>
      </tr>
   </tbody>
</table>

> [!CAUTION]
> **ADRs aceitos nunca são editados retroativamente.** Se uma decisão muda, crie um novo ADR marcando o anterior como `Substituído pelo ADR-XXXX`. Reescrever um ADR aceito apaga o histórico e quebra a rastreabilidade — o principal valor deste processo.

---

## 📚 Índice de ADRs

<table width="100%">
   <colgroup>
      <col width="15%">
      <col width="70%">
      <col width="15%">
   </colgroup>
   <thead>
      <tr>
         <th>#</th>
         <th>Título</th>
         <th>Status</th>
      </tr>
   </thead>
   <tbody>
      <tr>
         <td><a href="./0000-uso-de-architecture-decision-records.md">ADR-0000</a></td>
         <td align="left">Adoção de Architecture Decision Records como Mecanismo de Documentação Arquitetural</td>
         <td>🔵 Em Uso</td>
      </tr>
      <tr>
         <td><a href="./0001-adocao-do-adonisjs-como-framework-backend.md">ADR-0001</a></td>
         <td align="left">Adoção do AdonisJS como Framework Web Backend</td>
         <td>🔵 Em Uso</td>
      </tr>
      <tr>
         <td><a href="./0002-adocao-do-postgresql-como-banco-de-dados.md">ADR-0002</a></td>
         <td align="left">Adoção do PostgreSQL como Banco de Dados Relacional</td>
         <td>🔵 Em Uso</td>
      </tr>
      <tr>
         <td><a href="./0003-adocao-do-dragonfly-como-cache-e-armazenamento-temporario.md">ADR-0003</a></td>
         <td align="left">Adoção do DragonflyDB como Cache, Armazenamento Temporário e Broker de Filas</td>
         <td>🔵 Em Uso</td>
      </tr>
      <tr>
         <td><a href="./0004-uso-do-minio-como-emulador-de-storage-em-desenvolvimento.md">ADR-0004</a></td>
         <td align="left">Uso do MinIO como Emulador de Storage em Ambiente de Desenvolvimento</td>
         <td>🔵 Em Uso</td>
      </tr>
      <tr>
         <td><a href="./0005-adocao-do-elasticsearch-como-mecanismo-de-busca.md">ADR-0005</a></td>
         <td align="left">Adoção do Elasticsearch como Mecanismo de Busca</td>
         <td>🔵 Em Uso</td>
      </tr>
      <tr>
         <td><a href="./0006-uso-do-docker-para-ambiente-de-desenvolvimento-e-deploy.md">ADR-0006</a></td>
         <td align="left">Uso do Docker para Padronização de Ambiente de Desenvolvimento e Deploy</td>
         <td>🔵 Em Uso</td>
      </tr>
      <tr>
         <td><a href="./0007-adocao-do-pnpm-como-gerenciador-de-pacotes.md">ADR-0007</a></td>
         <td align="left">Adoção do pnpm como Gerenciador de Pacotes</td>
         <td>🔵 Em Uso</td>
      </tr>
      <tr>
         <td><a href="./0008-adocao-de-arquitetura-orientada-a-eventos-com-bullmq.md">ADR-0008</a></td>
         <td align="left">Adoção de Arquitetura Orientada a Eventos com BullMQ para Operações Assíncronas</td>
         <td>🔵 Em Uso</td>
      </tr>
      <tr>
         <td><a href="./0009-padronizacao-de-nomenclatura-de-buckets.md">ADR-0009</a></td>
         <td align="left">Padronização de Nomenclatura de Buckets</td>
         <td>🔵 Em Uso</td>
      </tr>
      <tr>
         <td><a href="./0010-adocao-do-resend-como-provedor-de-email-transacional.md">ADR-0010</a></td>
         <td align="left">Adoção do Resend como Provedor de Email Transacional</td>
         <td>🔵 Em Uso</td>
      </tr>
      <tr>
         <td><a href="./0011-adocao-do-renovate-para-atualizacao-automatica-de-dependencias.md">ADR-0011</a></td>
         <td align="left">Adoção do Renovate para Atualização Automática de Dependências</td>
         <td>🔵 Em Uso</td>
      </tr>
      <tr>
         <td><a href="./0012-adocao-do-snyk-para-deteccao-de-vulnerabilidades.md">ADR-0012</a></td>
         <td align="left">Adoção do Snyk para Detecção e Correção de Vulnerabilidades</td>
         <td>🔵 Em Uso</td>
      </tr>
      <tr>
         <td><a href="./0013-padrao-imagem-unica-multiplos-entrypoints-para-workers.md">ADR-0013</a></td>
         <td align="left">Padrão de Imagem Única com Múltiplos Entrypoints para Workers BullMQ</td>
         <td>🔵 Em Uso</td>
      </tr>
      <tr>
         <td><a href="./0014-adocao-do-ghcr-como-registry-de-imagens-docker.md">ADR-0014</a></td>
         <td align="left">Adoção do GitHub Container Registry (GHCR) como Registry de Imagens Docker</td>
         <td>🔵 Em Uso</td>
      </tr>
      <tr>
         <td><a href="./0015-adocao-do-bruno-como-cliente-http-oficial.md">ADR-0015</a></td>
         <td align="left">Adoção do Bruno como Cliente HTTP Oficial do Repositório</td>
         <td>🔵 Em Uso</td>
      </tr>
      <tr>
         <td><a href="./0016-convencoes-de-escrita-de-migracoes.md">ADR-0016</a></td>
         <td align="left">Convenções de Escrita de Migrações de Banco de Dados</td>
         <td>🔵 Em Uso</td>
      </tr>
      <tr>
         <td><a href="./0017-adocao-de-uuid-v7-como-estrategia-de-chave-primaria.md">ADR-0017</a></td>
         <td align="left">Adoção de UUID v7 como Estratégia de Chave Primária</td>
         <td>🔵 Em Uso</td>
      </tr>
      <tr>
         <td><a href="./0018-padrao-de-composicao-de-mixins-para-comportamentos-compartilhados-em-models.md">ADR-0018</a></td>
         <td align="left">Padrão de Composição de Mixins para Comportamentos Compartilhados em Models</td>
         <td>🔵 Em Uso</td>
      </tr>
      <tr>
         <td><a href="./0019-adocao-do-nodejs-como-runtime-de-execucao.md">ADR-0019</a></td>
         <td align="left">Adoção do Node.js como Runtime de Execução</td>
         <td>🔵 Em Uso</td>
      </tr>
      <tr>
         <td><a href="./0020-estrategia-de-autenticacao-jwt-hibrido-com-revogacao-via-dragonflydb.md">ADR-0020</a></td>
         <td align="left">Estratégia de Autenticação: JWT Híbrido com Revogação via DragonflyDB</td>
         <td>🔵 Em Uso</td>
      </tr>
      <tr>
         <td><a href="./0021-convencao-de-documentacao-de-codigo-com-jsdoc.md">ADR-0021</a></td>
         <td align="left">Convenção de Documentação de Código com JSDoc</td>
         <td>🔵 Em Uso</td>
      </tr>
      <tr>
         <td><a href="./0022-convencoes-de-controllers-e-roteamento-rest.md">ADR-0022</a></td>
         <td align="left">Convenções de Controllers e Roteamento REST</td>
         <td>🔵 Em Uso</td>
      </tr>
      <tr>
         <td><a href="./0023-adocao-do-adonis-lucid-filter-para-filtragem-de-queries.md">ADR-0023</a></td>
         <td align="left">Adoção do adonis-lucid-filter para Filtragem Declarativa de Queries</td>
         <td>🔵 Em Uso</td>
      </tr>
      <tr>
         <td><a href="./0024-documentacao-de-endpoints-com-openapi-estatico-e-scalar.md">ADR-0024</a></td>
         <td align="left">Documentação de Endpoints com OpenAPI Estático e Scalar</td>
         <td>🔵 Em Uso</td>
      </tr>
      <tr>
         <td><a href="./0025-arquitetura-de-validators-reutilizaveis-com-vinejs.md">ADR-0025</a></td>
         <td align="left">Arquitetura de Validators Reutilizáveis com VineJS</td>
         <td>🔵 Em Uso</td>
      </tr>
      <tr>
         <td><a href="./0026-adocao-do-fallow-para-analise-estatica-de-codigo-morto.md">ADR-0026</a></td>
         <td align="left">Adoção do Fallow para Análise Estática de Código Morto</td>
         <td>🔵 Em Uso</td>
      </tr>
      <tr>
         <td><a href="./0027-adocao-do-k6-como-quality-gate-de-performance.md">ADR-0027</a></td>
         <td align="left">Adoção do k6 como Ferramenta de Load Testing e Quality Gate de Performance</td>
         <td>🟢 Aceito</td>
      </tr>
      <tr>
         <td><a href="./0028-adocao-do-owasp-zap-como-quality-gate-de-seguranca-dast.md">ADR-0028</a></td>
         <td align="left">Adoção do OWASP ZAP como Quality Gate de Segurança DAST</td>
         <td>🟢 Aceito</td>
      </tr>
   </tbody>
</table>

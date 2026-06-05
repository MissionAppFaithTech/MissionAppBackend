# [ADR-0000]: Adoção de Architecture Decision Records (ADR) como Mecanismo de Documentação Arquitetural

## Dados

- **Status:** Proposto
- **Data:** 2026-05-23
- **Proponentes:** [Allber Ferreira](https://github.com/AFSFerreira)

---

## Contexto e Problema

O MissionApp Backend é um projeto open-source de caráter missionário, desenvolvido com AdonisJS e TypeScript, que tem por natureza uma base de colaboradores **flutuante e geograficamente distribuída**. Voluntários e contribuidores ingressam e saem do projeto em ciclos irregulares, motivados por disponibilidade, chamado ministerial ou outros compromissos. Essa rotatividade cria um risco estrutural crítico: **o conhecimento arquitetural fica concentrado em pessoas, não no repositório**.

Em projetos de software de longa duração — especialmente open-source — as decisões mais impactantes raramente são as que aparecem no código final. São as que explicam _por que_ o código foi escrito daquela forma. Sem um mecanismo formal para capturar essas decisões, o projeto enfrenta os seguintes problemas recorrentes:

- **Perda de contexto histórico:** Quando um colaborador sai, leva consigo o raciocínio por trás de escolhas como "por que usamos AdonisJS em vez de NestJS?", "por que esse modelo de banco usa essa relação?" ou "por que rejeitamos aquela lib de autenticação?".

- **Rediscussão de decisões já resolvidas:** Sem registro, novas ondas de contribuidores tendem a reabrir debates já travados, gerando retrabalho, conflitos desnecessários e perda de tempo. A decisão é tomada duas, três ou mais vezes.

- **Inconsistência arquitetural silenciosa:** Na ausência de um registro explícito, cada contribuidor interpreta as intenções da arquitetura à sua maneira. Com o tempo, o projeto acumula camadas conflitantes de estilo, padrão e estrutura, degradando a coesão do codebase.

- **Onboarding ineficiente:** Novos colaboradores precisam explorar o histórico de pull requests, issues e conversas em chats para reconstruir o raciocínio de decisões passadas — quando esse histórico existe. Na maioria dos projetos open-source, boa parte dessa troca acontece de forma informal e se perde.

- **Dificuldade de auditoria e governança:** Gestores do projeto não conseguem rastrear com clareza o que foi decidido, quando, por quem e com base em quais premissas — o que dificulta revisões de segurança, onboarding de novos gestores e qualquer processo de due diligence.

A pergunta central que este ADR responde é: **como garantir que as decisões arquiteturais significativas do MissionApp Backend sejam documentadas de forma consistente, rastreável e acessível a qualquer colaborador, presente ou futuro?**

## Decisão

Adotaremos o formato **Architecture Decision Records (ADR)**, conforme proposto originalmente por Michael Nygard no artigo _"Documenting Architecture Decisions"_ (2011), com as adaptações descritas no template deste projeto (`docs/architecture/templates/adr-template.md`).

Cada ADR é um documento de texto versionado no próprio repositório, que registra **uma única decisão arquitetural significativa**, incluindo o contexto que a motivou, as alternativas consideradas e as consequências esperadas — positivas e negativas.

As seguintes regras operacionais se aplicam a partir da adoção deste ADR:

1. **Escopo de aplicação:** Qualquer decisão que afete a estrutura, os limites entre camadas, a escolha de bibliotecas ou frameworks, a modelagem de dados, a estratégia de autenticação/autorização, a infraestrutura de deploy ou qualquer outro aspecto de alto impacto **deve ser documentada em um ADR** antes ou concomitantemente à sua implementação.

2. **Numeração sequencial:** ADRs são numerados de forma sequencial a partir de `0000`, com quatro dígitos (`0001`, `0002`, etc.), garantindo ordenação cronológica imutável.

3. **Imutabilidade do registro:** ADRs aceitos **nunca são editados retroativamente** para refletir uma nova visão. Se uma decisão muda, cria-se um novo ADR com status _"Substituído pelo ADR-XXXX"_, preservando o histórico completo.

4. **Processo de aprovação:** ADRs que introduzem decisões de alto impacto devem ser submetidos como Pull Request e revisados por ao menos um gestor do projeto antes de serem marcados como _Aceito_.

5. **Localização no repositório:** Todos os ADRs residem em `docs/architecture/decisions/`, usando o template oficial em `docs/architecture/templates/adr-template.md`, e são escritos em Português Brasileiro para alinhar-se à audiência primária do projeto.

6. **Status válidos:** `Proposto` → decisão em discussão; `Aceito` → decisão vigente; `Rejeitado` → alternativa descartada com justificativa registrada; `Obsoleto` → não mais aplicável por mudança de contexto; `Substituído pelo ADR-XXXX` → supersedido por decisão posterior.

## Justificativa

ADRs foram escolhidos por cumprirem exatamente os requisitos do contexto do MissionApp Backend:

- **Co-localização com o código:** Por serem arquivos Markdown no próprio repositório Git, ADRs são versionados automaticamente, têm autoria rastreável via `git blame` e acompanham o código em qualquer migração de plataforma — eliminando a dependência de ferramentas externas como Confluence ou Notion.

- **Formato mínimo e sustentável:** A estrutura proposta por Nygard é deliberadamente enxuta. Não exige ferramentas especiais, fluxos complexos ou licenças. Qualquer colaborador com acesso ao repositório pode criar, ler e revisar um ADR usando apenas um editor de texto.

- **Registro do raciocínio, não só da solução:** Diferente de diagramas ou wikis que descrevem _o quê_, o ADR captura o _porquê_ — incluindo as alternativas rejeitadas e os trade-offs conscientes. Essa dimensão é a mais valiosa em projetos com alta rotatividade de colaboradores.

- **Imutabilidade como garantia histórica:** A convenção de nunca editar um ADR aceito — e sim criar um novo que o substitui — garante rastreabilidade completa da evolução das decisões ao longo do tempo, sem reescrever a história.

- **Maturidade e adoção ampla:** O formato ADR é amplamente adotado na indústria (ThoughtWorks, GitHub, AWS, Netflix) e amplamente documentado, o que reduz a curva de aprendizado para novos contribuidores com experiência prévia em outros projetos open-source.

## Alternativas Consideradas

- **Wiki (Confluence, Notion, GitHub Wiki):** Wikis centralizam documentação, mas ficam fora do fluxo de código. Tendem a desatualizar rapidamente, não são versionadas junto ao código-fonte e dependem de disciplina manual para manutenção. Em projetos open-source com alta rotatividade, wikis viram "cemitérios de documentação". Descartado.

- **Comentários inline no código (`// Decision: ...`):** Capturam decisão no local exato do código, mas são invisíveis para quem não lê aquele arquivo específico, não têm rastreabilidade centralizada, não cobrem decisões de nível arquitetural que transcendem um único arquivo e se perdem em refatorações. Descartado.

- **Documentação em Pull Requests e Issues:** O histórico de PRs e issues preserva discussões, mas é desordenado, não estruturado, difícil de consultar e dependente da plataforma — se o repositório migrar de host, esse histórico pode ser perdido ou ficar inacessível. Descartado como mecanismo _primário_; mantido como complemento para rastrear a discussão que originou cada ADR.

- **Diagrama arquitetural único (C4, UML):** Diagramas comunicam _o quê_ da arquitetura, mas não o _porquê_. São úteis como documentação complementar, mas não registram o raciocínio de decisão nem as alternativas rejeitadas. Descartado como substituto; mantido como complemento.

- **Nenhuma documentação formal:** Em projetos pequenos com equipe estável, a ausência de documentação formal pode ser tolerável a curto prazo. No contexto open-source com rotatividade de colaboradores, essa abordagem é estruturalmente inviável e resulta diretamente nos problemas listados no Contexto. Descartado.

## Consequências (Trade-offs)

### Positivas / Benefícios

- **Memória institucional persistente:** O repositório torna-se a fonte de verdade sobre _por que_ o projeto foi construído de determinada forma. O conhecimento não depende mais de nenhum indivíduo específico.

- **Onboarding acelerado:** Novos colaboradores conseguem entender as intenções arquiteturais do projeto lendo os ADRs em ordem cronológica, sem precisar arqueologar issues, PRs ou histórico de chat.

- **Prevenção de rediscussão:** Decisões documentadas com contexto e alternativas rejeitadas eliminam debates recorrentes. Ao invés de reabrir uma discussão, o colaborador lê o ADR e entende por que aquela alternativa foi descartada.

- **Governança e rastreabilidade:** Gestores do projeto têm visibilidade clara sobre o conjunto de decisões vigentes, quando foram tomadas e quem as aprovou.

- **Cultura de arquitetura deliberada:** O processo de escrever um ADR força a articulação clara do problema, a avaliação honesta de alternativas e a antecipação de consequências — elevando a qualidade das decisões em si, não apenas da documentação.

- **Independência de plataforma:** ADRs são arquivos Markdown no repositório. Funcionam em qualquer host de código (GitHub, GitLab, Gitea, etc.) sem perda de histórico.

### Negativas / Riscos

- **Overhead de processo:** Escrever um ADR bem fundamentado exige tempo e disciplina. Em momentos de urgência, existe a tentação de pular o processo. É responsabilidade dos gestores do projeto manter a cultura de documentação mesmo sob pressão.

- **Curva de aprendizado inicial:** Colaboradores sem experiência prévia com ADRs podem ter dificuldade para determinar quais decisões merecem um ADR e como estruturá-lo adequadamente. O template (`adr-template.md`) e este ADR-0000 servem como referência, mas algum nível de orientação ativa será necessário inicialmente.

- **Risco de ADRs desatualizados sem marcação:** Se um ADR aceito se tornar obsoleto sem que um novo ADR o marque formalmente como `Substituído` ou `Obsoleto`, ele pode induzir novos colaboradores a erros. A disciplina de manutenção do ciclo de vida dos ADRs é tão importante quanto a criação de novos.

- **Não cobre documentação operacional:** ADRs documentam decisões, não procedimentos. Setup de ambiente, guias de contribuição e documentação de API pertencem a outras seções de `docs/` e não substituem nem são substituídos pelos ADRs.

## Referências

- [Documenting Architecture Decisions — Michael Nygard (2011)](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [ADR GitHub Organization — exemplos e ferramentas da comunidade](https://adr.github.io/)
- [Guia completo sobre ADR — definicao e melhores praticas](https://medium.com/@jhonywalkeer/guia-completo-sobre-architecture-decision-records-adr-defini%C3%A7%C3%A3o-e-melhores-pr%C3%A1ticas-f63e66d33e6)
- [Template oficial deste projeto](../templates/adr-template.md)

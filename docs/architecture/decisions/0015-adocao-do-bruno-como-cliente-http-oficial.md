# [ADR-0015]: Adoção do Bruno como Cliente HTTP Oficial do Repositório

## Dados
* **Status:** Proposto
* **Data:** 2026-06-04
* **Proponentes:** [Allber Ferreira](https://github.com/AFSFerreira)

---

## Contexto e Problema

O MissionApp Backend expõe uma API HTTP com rotas autenticadas, payloads validados via VineJS e contratos de resposta que evoluem junto com o domínio. Toda vez que um desenvolvedor implementa ou altera uma rota, ele precisa de um cliente HTTP para testar manualmente o comportamento antes de abrir um Pull Request. A equipe também precisa de um mecanismo para compartilhar coleções de requisições — exemplos prontos de chamadas à API — para que novos colaboradores consigam exercitar os endpoints sem reconstruir cada requisição do zero.

Ferramentas de mercado como Postman e Insomnia resolvem esse problema parcialmente, mas introduzem um desacoplamento estrutural entre o código e as coleções de requisições:

**Coleções desacopladas do repositório:**
Em ferramentas baseadas em sincronização via nuvem, as coleções vivem em um servidor externo. Um desenvolvedor que altera o contrato de uma rota precisa lembrar de, separadamente, abrir o aplicativo, localizar a coleção, atualizar a requisição e sincronizar com a nuvem. Esse passo manual raramente acontece no momento certo — na prática, as coleções ficam desatualizadas em relação ao código, e novos colaboradores encontram exemplos que não refletem mais o comportamento atual da API.

**Revisões de PR cegas para mudanças de contrato:**
Quando as coleções vivem fora do repositório, um revisor que avalia um PR que altera a assinatura de um endpoint não consegue ver, na mesma tela, como a requisição de exemplo foi atualizada para refletir a mudança. A revisão fica incompleta: o código novo está visível, mas o impacto no consumidor da API não.

**Vendor lock-in e restrições de acesso:**
Ferramentas como Postman têm progressivamente movido funcionalidades de colaboração e automação via CLI para planos pagos, criando limite de assentos e dependência de assinatura corporativa. As coleções ficam presas no formato proprietário do fornecedor — exportar e migrar é possível, mas trabalhoso e com perda de metadados.

A pergunta central é: **como garantir que as coleções de requisições HTTP evoluam em sincronia com o código, sejam revisáveis em Pull Requests, não imponham restrições de acesso por número de colaboradores e não criem dependência de nenhum fornecedor externo?**

## Decisão

Adotaremos o **Bruno** como cliente HTTP oficial do repositório. A coleção de requisições será armazenada na pasta `bruno/` na raiz do projeto e versionada no Git como parte do repositório.

**Formato de arquivo Git-native (`.bru`):**
O Bruno armazena cada requisição em um arquivo de texto plano com extensão `.bru`. O formato é legível por humanos, produz diffs limpos e é revisável diretamente na interface do GitHub sem nenhuma ferramenta adicional. Qualquer mudança em um endpoint — path, método, body, headers — resulta em um diff de texto que aparece junto ao diff do código TypeScript no mesmo Pull Request.

**Estrutura de pastas da coleção:**
```
bruno/
  environments/
    local.bru        # Variáveis de ambiente para desenvolvimento local
    staging.bru      # Variáveis de ambiente para staging
  auth/
    login.bru
    register.bru
    refresh-token.bru
  missionaries/
    list-missionaries.bru
    get-missionary.bru
    create-missionary.bru
    update-missionary.bru
  donations/
    create-donation.bru
  webhooks/
    resend-webhook.bru
```

A estrutura de pastas da coleção espelha os grupos de rotas da API, facilitando a navegação para colaboradores que não conhecem o código.

**Gerenciamento de segredos com variáveis de ambiente:**
O Bruno suporta variáveis de ambiente em arquivos `.bru` de ambiente. Valores sensíveis (tokens de autenticação, chaves de API) são definidos em um arquivo `.env` local — gitignored — e referenciados nas requisições via `{{variavel}}`. O arquivo de ambiente versionado (`environments/local.bru`) contém apenas os nomes das variáveis com valores em branco ou exemplos não sensíveis; os valores reais nunca entram no repositório.

```
# environments/local.bru (versionado)
vars {
  base_url: http://localhost:3333
  auth_token:            # preenchido localmente via .env
}
```

**Execução via CLI em CI/CD:**
O Bruno disponibiliza o pacote `@usebruno/cli` para execução de coleções em pipelines de CI. Isso permite criar um job de smoke test que executa as requisições marcadas como `smoke` após o deploy em staging — garantindo que os endpoints críticos respondem corretamente após cada entrega, sem depender de um cliente desktop em execução.

```bash
npx @usebruno/cli run bruno/ --env staging --reporter-junit results.xml
```

**Convenção de commits:**
Toda mudança de rota que altere path, método, payload ou resposta deve incluir, no mesmo commit ou no mesmo PR, a atualização do arquivo `.bru` correspondente em `bruno/`. Esta convenção é exigida no processo de revisão de Pull Requests (documentado no `CONTRIBUTING.md`).

## Justificativa

O Bruno foi escolhido por ser a única ferramenta do mercado que atende simultaneamente os requisitos de rastreabilidade, colaboração sem restrições e ausência de dependência externa:

- **Coleção versionada com o código:** Arquivos `.bru` no repositório garantem que a coleção e o código nunca divergem. Um `git checkout` de qualquer branch ou tag histórica entrega tanto o código da API quanto as requisições que a documentam naquele estado. Não existe "versão atual da coleção" desacoplada da "versão atual do código".

- **Revisão de contrato visível no Pull Request:** O diff de um arquivo `.bru` no GitHub mostra exatamente o que mudou na requisição — path alterado, campo adicionado ao body, header removido. O revisor avalia código e contrato na mesma tela, sem precisar abrir uma ferramenta externa para comparar o estado anterior e o novo.

- **Zero vendor lock-in:** O Bruno é 100% open-source (MIT). Os dados da coleção pertencem ao repositório, não a uma conta em servidor externo. Não há limite de assentos, sem plano pago necessário para colaboração ou uso da CLI. Migrar para outra ferramenta no futuro significa apenas exportar arquivos que já estão no repositório.

- **Onboarding imediato para novos colaboradores:** Um desenvolvedor que clona o repositório e abre o Bruno já encontra todas as requisições organizadas e prontas para uso. Não há "exportar coleção do Postman e enviar no Slack" como etapa de onboarding — a coleção está no `git clone`.

- **Formato legível que documenta a API implicitamente:** Arquivos `.bru` com exemplos de payloads reais, headers necessários e variáveis de ambiente configuradas funcionam como documentação executável da API. Complementam (sem substituir) uma documentação OpenAPI formal, oferecendo exemplos que podem ser disparados imediatamente.

- **CLI para smoke tests pós-deploy:** A integração com CI via `@usebruno/cli` transforma a coleção em uma suite de smoke tests automáticos. Requisições marcadas como críticas podem ser executadas após cada deploy em staging, detectando regressões antes de chegarem à produção — sem nenhum framework de teste adicional para configurar.

- **Aplicativo desktop leve:** O Bruno usa Tauri em vez de Electron, resultando em menor consumo de memória e tempo de inicialização mais rápido do que concorrentes baseados em Chromium empacotado.

## Alternativas Consideradas

* **Postman:** Ferramenta mais difundida do mercado, com grande comunidade e recursos avançados de testes automatizados. Descartado porque: (1) coleções vivem em servidor próprio do Postman por padrão — colaboração requer sincronização com nuvem externa, desacoplando a evolução das coleções do ciclo de vida do repositório; (2) funcionalidades de colaboração em equipe e execução via CLI (`newman`) são progressivamente migradas para planos pagos, introduzindo risco de restrição de acesso conforme o projeto cresce; (3) o formato de exportação (`collection.json`) é um arquivo grande e monolítico com diffs ilegíveis — uma mudança em uma única requisição gera diff de centenas de linhas de JSON, impossibilitando revisão efetiva no GitHub.

* **Insomnia:** Cliente HTTP open-source com boa experiência de uso e suporte a plugins. Descartado porque: (1) após a aquisição pela Kong, passou por mudanças de modelo de negócio que forçaram sincronização obrigatória com conta na nuvem em versões recentes, revertida depois com atrito — o histórico de instabilidade na política de dados cria risco de lock-in similar ao Postman; (2) o formato de armazenamento local é JSON compactado — revisão de diffs no GitHub é inviável; (3) a CLI para execução automatizada tem maturidade inferior ao `@usebruno/cli`.

* **Thunder Client (extensão VS Code):** Cliente HTTP integrado diretamente ao VS Code, com suporte a exportação de coleções como JSON. Descartado porque: (1) armazenamento padrão é fora do repositório (pasta global do VS Code) — exige configuração explícita para versionar as coleções no Git; (2) acopla o fluxo de teste de API ao VS Code — colaboradores que usam outros editores (Neovim, JetBrains) ficam sem suporte nativo; (3) desenvolvido por empresa privada com histórico de mudanças de modelo de licenciamento.

* **REST Client (extensão VS Code com arquivos `.http`):** Extensão que executa requisições escritas em arquivos `.http` — Git-native por design, já que os arquivos ficam no repositório. Descartado porque: (1) não tem interface gráfica de gerenciamento de coleções — requisições são arquivos `.http` dispersos sem organização hierárquica nativa; (2) sem suporte a ambientes com troca contextual (local → staging → produção) além de variáveis globais simples; (3) sem CLI para execução em CI/CD; (4) sem suporte a scripts de pre-request ou asserções pós-resposta para smoke tests.

* **curl / scripts shell:** Chamadas diretas via `curl` documentadas no `README` ou em scripts `.sh`. Descartado porque: (1) sem interface gráfica, a barreira de uso para desenvolvedores menos familiarizados com linha de comando é alta; (2) scripts shell não têm uma estrutura de coleção hierárquica — manutenção de dezenas de endpoints em scripts dispersos é trabalhosa; (3) sem suporte nativo a ambientes com variáveis contextuais, os scripts exigem parametrização manual.

## Consequências (Trade-offs)

### Positivas / Benefícios

* **Coleções e código sempre sincronizados:** A convenção de atualizar `.bru` no mesmo commit que altera a rota garante que nenhuma branch pode divergir silenciosamente entre código e exemplos de API.

* **Revisão de contrato integrada ao fluxo de PR:** Revisores veem mudanças de payload, path e headers como diff de texto limpo, sem precisar abrir nenhuma ferramenta externa.

* **Onboarding sem setup adicional de coleções:** `git clone` + abrir Bruno = coleção pronta. Tempo de configuração de ferramentas de teste de API reduzido a zero para novos colaboradores.

* **Smoke tests pós-deploy gratuitos:** `@usebruno/cli` transforma a coleção em automação de CI sem framework adicional.

* **Sem custo e sem limite de colaboradores:** MIT, dados no repositório, sem conta obrigatória.

### Negativas / Riscos

* **Adoção de mercado menor que Postman:** Bruno tem comunidade menor e ecossistema de plugins menos maduro. Recursos avançados de mocking, documentação automática de API e integrações com ferramentas enterprise disponíveis no Postman podem não estar disponíveis ou ter maturidade inferior.

* **Curva de aprendizado da convenção de commits:** A disciplina de atualizar `.bru` no mesmo commit que altera o código precisa ser comunicada e revisada ativamente. Um revisor que não verifica a pasta `bruno/` no PR pode deixar a coleção desatualizar. A solução é incluir essa verificação explicitamente no checklist de revisão.

* **Formato `.bru` é proprietário do Bruno:** Embora seja texto legível, o formato não é um padrão aberto (como OpenAPI). Se o projeto migrar para outro cliente HTTP no futuro, será necessário converter os arquivos — conversão existe, mas com possível perda de metadados específicos do Bruno.

* **Segredos exigem disciplina adicional:** A separação entre variáveis de ambiente versionadas (nomes, valores não sensíveis) e valores reais (no `.env` gitignored) precisa ser comunicada no onboarding. Um colaborador que insere um token real diretamente no arquivo `.bru` versionado expõe a credencial no repositório público.

## Referências

* [Bruno — Site oficial e repositório open-source](https://www.usebruno.com/)
* [Bruno — Documentação de ambientes e variáveis](https://docs.usebruno.com/secrets-management/overview)
* [Bruno — CLI (`@usebruno/cli`)](https://docs.usebruno.com/cli/overview)
* [Bruno — Formato de arquivo `.bru`](https://docs.usebruno.com/bru-lang/overview)
* [ADR-0006 — Docker para Padronização de Ambiente de Desenvolvimento e Deploy](./0006-uso-do-docker-para-ambiente-de-desenvolvimento-e-deploy.md)

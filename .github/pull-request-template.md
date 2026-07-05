## 📌 Tipo de Mudança

<!-- TODO: Adicionar checkbox de sanitização de comentarios, revisar comentarios criados, eliminar TODO's da codebase antes de submeter qualquer codigo e etc -->

<!-- Marque todas que se aplicam -->

- [ ] `feat` — nova funcionalidade
- [ ] `fix` — correção de bug
- [ ] `refactor` — refatoração sem mudança de comportamento
- [ ] `perf` — melhoria de performance
- [ ] `test` — adição ou correção de testes
- [ ] `docs` — atualização de documentação
- [ ] `chore` — configuração, dependências, infraestrutura
- [ ] `ci` — pipeline de CI/CD
- [ ] ⚠️ **Breaking change** — altera contrato de API ou comportamento esperado por clientes

---

## 🚀 Motivação

<!-- Por que essa mudança é necessária? Qual problema ela resolve ou qual requisito atende? -->

Precisamos fazer essa mudança para ...

---

## 💡 O que foi feito

<!-- Descreva objetivamente as mudanças implementadas. -->

Proponho a seguinte mudança ...

---

## 🧪 Como Testar

<!-- Passos para validar o comportamento esperado. -->

1. ...
2. ...

---

## 📸 Evidências

<!-- Prints, vídeos ou logs que demonstrem o comportamento. Remova se não aplicável. -->

[Print/Video]

---

## 📋 Checklist

**Qualidade e testes**

<!-- `just pr-check` roda as 3 checagens abaixo de uma vez (lint + typecheck + test + lockfiles) -->

- [ ] `pnpm lint` e `pnpm typecheck` (ou `just ci`) passam sem erros — _erro de lint: `pnpm lint:fix` ou `just lint-fix`; erro de tipo exige correção manual_
- [ ] `pnpm test` (ou `just test`) passa localmente — suite completa, não só os testes novos — _sem fix automático; corrija o teste ou o código_
- [ ] Testes novos/atualizados cobrem o comportamento alterado, não só o happy path — _sem fix automático_

**Contrato e documentação**

- [ ] Rota criada/alterada: documentação OpenAPI atualizada em `docs/api/v1/<domínio>/` (ADR-0025) — _sem fix automático, edição manual do YAML_ (se possível e preferível, utilize auxílio de ferramentas de IA)
- [ ] Rota criada/alterada: coleção Bruno atualizada/criada em `bruno/` (ADR-0017) — _sem fix automático, crie/edite o `.bru` correspondente_ (se possível e preferível, utilize auxílio de ferramentas de IA)
- [ ] JSDoc adicionado apenas onde a convenção exige — Services, Providers, Middlewares e etc (ADR-0022) — _sem fix automático_

**Banco de dados**

- [ ] Migration criada: `database/schema.ts` regenerado (`just migrate` ou `node ace migration:run` + codegen) — _fix: rode `just migrate` ou `node ace migration:run`_
- [ ] Migration segue convenção de comentários e constraints nomeados (ADR-0018) — _sem fix automático_

**Arquitetura**

- [ ] Mudança não viola nenhum ADR existente em `docs/architecture/decisions/` — _sem fix automático_
- [ ] Mudança não introduz banco/ORM/serviço externo/padrão arquitetural novo sem ADR correspondente criado — _use `docs/architecture/templates/adr-template.md` como base_
- [ ] Controllers permanecem finos — lógica de negócio vive em Services (ADR-0023) — _sem fix automático_

**Higiene do PR**

- [ ] PR não contém `package-lock.json` nem `yarn.lock` (`just check-lockfiles`) — _fix: `git rm --cached package-lock.json yarn.lock`_
- [ ] Escopo focado — uma mudança por PR — _sem fix automático; considere abrir PRs separados_
- [ ] Dependência nova incluída: justificativa dada no corpo do PR — _sem fix automático_

---

## 🔗 Links

<!-- Issues, tarefas, ADRs ou documentações relacionadas. -->

- [link-1](primeira-referencia)
- [link-2](segunda-referencia)

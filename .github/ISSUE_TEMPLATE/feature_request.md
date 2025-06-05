---
name: Feature Request
about: Sugira uma nova funcionalidade ou melhoria
title: '[Feature]: '
labels: ['enhancement']
assignees: ''
---

## Problema ou necessidade

Descreva o problema ou situação que a funcionalidade resolve.

## Solução proposta

Descreva de forma clara a funcionalidade desejada e como ela deveria funcionar.

## Domínio(s) afetado(s)

<!-- Marque o(s) domínio(s) relacionado(s). Critério: o que o endpoint faz,
     não em qual tabela o dado é persistido — ver ADR-0027. -->

- [ ] `auth` — autenticação e ciclo de vida de sessão
- [ ] `user` — conta, perfil, credenciais
- [ ] `missionary` — missionários, agências, endereços de campo
- [ ] `campaign` / `impact_project` — campanhas e projetos de impacto
- [ ] `post` — posts, comentários, curtidas, seguidores
- [ ] `faith_community` — comunidades de fé
- [ ] `financial_config` — configuração financeira / doações
- [ ] `pastor` — pastores
- [ ] `media_asset` — upload e gestão de arquivos
- [ ] `audit` — trilhas de auditoria (login, ações de usuário)
- [ ] Outro: `__________`

## Checklist arquitetural

<!-- Verificações rápidas antes de implementar. Marque as aplicáveis. -->

- [ ] Requer nova migration?
- [ ] Requer novo endpoint / rota?
- [ ] Requer novo Service?
- [ ] Requer novo Validator (VineJS)?
- [ ] Requer novo Transformer?
- [ ] Requer background job (BullMQ)?
- [ ] Requer novo ADR (banco/ORM/serviço externo/padrão arquitetural novo)?
- [ ] Requer documentação OpenAPI em `docs/api/v1/<domínio>/` (ADR-0027)?
- [ ] Requer requisição Bruno nova/atualizada em `bruno/` (ADR-0019)?

## Alternativas consideradas

<!-- Houve outra abordagem analisada? Se sim, explique por que foi descartada. -->

## Contexto adicional

<!-- Mockups, referências externas, links de tasks, etc. -->

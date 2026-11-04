# [ADR-0036]: Perfil Público Anônimo e Orçamento de Rate Limit para o Servidor do BFF

## Dados

- **Status:** 🟢 Aceito
- **Data:** 2026-11-03
- **Proponentes:** [@Amaro-peter](https://github.com/Amaro-peter)

---

## Contexto e Problema

O RF 1.4 define o perfil do missionário como rota pública, acessível sem login e só leitura. O RF 10 descreve o que esse perfil mostra: identificação, agência, aba "Sobre" (pública, RF 10.7) e contato público (RF 10.3). Até agora a API só tinha endpoints do próprio usuário ("me"), então o perfil público do frontend usava dados de exemplo.

O frontend renderiza as rotas públicas no servidor com `use cache` (ADR-0004 do frontend), compartilhando o resultado entre visitantes. Isso cria um problema de rate limit:

- Dentro de `use cache` não há IP do visitante, então o BFF não tem o que repassar em `x-missionapp-client-ip` (ADR-0032).
- Sem um tratamento próprio, todas essas leituras cairiam no limite por IP do servidor do BFF. Ou esgotariam o orçamento de um IP qualquer, ou exigiriam um limite alto demais para chamadas diretas.

Também é preciso decidir **quais campos** são públicos e **quais perfis** são visíveis, o que é regra de negócio.

A questão central é: **como a API expõe o perfil público de missionário de forma anônima, sem vazar dados pessoais, e como limita esse tráfego quando ele vem renderizado e cacheado pelo servidor do BFF?**

## Decisão

Criar `GET /api/v1/public/missionaries/:username`, anônimo, com as regras abaixo.

### Campos (decisão do produto, 2026-11-03)

- **Públicos:**
  - username, nome completo, minibiografia e papel;
  - agência `{ id, name }` e comunidade de fé `{ id, name }`;
  - "Sobre": `aboutMe`, `missionStorySummary`, `originLocation`, `prayerRequest`, `lifeVerse`;
  - local de atuação, só `city`, `state` e `country`;
  - `followersCount` e `followingCount`;
  - contato público: `publicEmail`, `publicPhone`, `publicPhoneIsWhatsapp`.
- **Nunca expostos:** documento de identidade, e-mail e telefone da conta, status, dados financeiros e de doação, CEP e bairro.

O transformer `PublicMissionaryProfileTransformer` monta exatamente esse conjunto, e um teste funcional verifica as chaves e a ausência de PII.

### Visibilidade

Só aparece quem tem papel `MISSIONARY`, perfil `APPROVED`, conta `ACTIVE` e `deletedAt` nulo. Qualquer outro caso (pendente de aprovação, e-mail não confirmado, inativo, excluído, outro papel, inexistente) responde **o mesmo 404** (`E_MISSIONARY_PROFILE_NOT_FOUND`), para não revelar se o username existe.

### Rate limit

| Origem do pedido                                                                 | Chave                                                       | Limite                       |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------- |
| Servidor do BFF com segredo válido (ADR-0032) e **sem** `x-missionapp-client-ip` | `rate_limit:public_profile:bff_server`                      | **600/min**, orçamento único |
| Demais, inclusive o BFF repassando o IP do visitante                             | `rate_limit:public_profile:ip:<ip>` (via `resolveClientIp`) | **60/min** por IP            |

Ao exceder: 429 com `Retry-After: 60` e o envelope do ADR-0034 (`E_TOO_MANY_REQUESTS`). O segredo é comparado em tempo constante, e segredo inválido cai no limite por IP.

## Justificativa

- **Atende o RF 1.4 e o RF 10** sem login, com os campos que o produto definiu como públicos.
- **Privacidade por construção:** a lista de campos é explícita no transformer, não derivada do model, e o 404 único não permite enumerar usernames.
- **Cache compartilhado sem punir visitantes:** o tráfego renderizado no servidor tem orçamento próprio e não consome o limite de nenhum IP de usuário. Chamadas diretas continuam limitadas a 60/min.
- **Reaproveita a confiança do ADR-0032:** só quem conhece o segredo do BFF entra no orçamento do servidor.

## Alternativas Consideradas

**1. Exigir login para ver o perfil**

Contraria o RF 1.4, que define o perfil do missionário como rota pública. Descartada.

**2. Um único limite por IP para tudo**

O tráfego cacheado do Next sairia todo do IP do servidor do BFF. Com 60/min, a página pública ficaria indisponível sob carga moderada; com um limite alto, chamadas diretas ficariam praticamente sem limite. Descartada.

**3. Reaproveitar o endpoint `GET /account/profile`**

É do próprio usuário, exige autenticação e traz dados privados. Descartada.

## Consequências (Trade-offs)

### Positivas / Benefícios

- O frontend pode trocar os dados de exemplo do perfil público por dados reais, com renderização no servidor e cache por tag.
- O contrato de campos públicos fica documentado e testado.

### Negativas / Riscos

- O orçamento de 600/min do servidor do BFF é compartilhado por todas as instâncias. Se o cache do Next for pouco efetivo, ele pode esgotar, e as páginas públicas recebem 429 até a janela virar. Mitigação: o cache por tag no frontend (300 s, revalidado na edição do dono) e monitoramento do 429 nessa chave.
- Um segredo do BFF vazado dá acesso ao orçamento maior. O ADR-0032 já trata o segredo como credencial que nunca vai para o cliente.

## Referências

- [Site de requisitos](https://missionappfaithtech.github.io/MissionAppRequirementsList/): RF 1.4, RF 10.1, 10.3, 10.7
- [ADR-0032](./0032-ip-do-usuario-repassado-pelo-bff-com-segredo-compartilhado.md): segredo do BFF e IP do usuário
- [ADR-0034](./0034-envelope-de-erro-unico-com-codigo.md): envelope dos erros 404/422/429
- [ADR-0004 do frontend](https://github.com/MissionAppFaithTech/MissionAppFrontend/blob/main/docs/architecture/decisions/0004-rotas-publicas-com-server-components-e-use-cache.md): renderização pública com `use cache`

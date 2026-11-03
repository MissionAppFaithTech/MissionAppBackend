# [ADR-0037]: API Avisa o Site para Descartar o Cache do Perfil Público

## Dados

- **Status:** 🟡 Proposto
- **Data:** 2026-11-03
- **Proponentes:** [@Amaro-peter](https://github.com/Amaro-peter)

---

## Contexto e Problema

O site (MissionAppFrontend) serve o perfil público do missionário a partir do `GET /api/v1/public/missionaries/:username` (ADR-0036). Ele guarda a resposta em cache por username (`'use cache'` + `cacheTag('profile:<username>')`, ADR-0004 do frontend) por **5 minutos**, o mesmo tempo das páginas públicas antes do Cache Components.

Quando o próprio missionário salva pelo site, a Server Action descarta a tag na hora (`updateTag`, ADR-0006 do frontend), e a página mostra o dado novo. O problema são as mudanças que **não passam pelo site**:

- **Edição pelo app mobile:** chama a API direto. O site continua mostrando a versão antiga por até 5 minutos.
- **Aprovação de um missionário:** quando existir o fluxo de avaliação (RF 17), o perfil continua respondendo 404 por até 5 minutos, porque o "não encontrado" também fica em cache.
- **Desativação, exclusão ou reprovação:** o perfil continua público por até 5 minutos. É o caso mais sensível, por ser questão de privacidade.
- **Mudança de nome de agência ou comunidade de fé** e **contadores de seguidores:** ficam atrasados no mesmo prazo.

Diminuir o tempo de cache só reduz a janela e aumenta a carga na API (orçamento de 600/min do servidor do BFF, ADR-0036). Aumentar o tempo, o que aliviaria a API, alonga todas essas janelas.

A questão central é: **como o site descobre na hora que um perfil público mudou fora dele, para poder descartar só aquele cache?**

## Decisão (proposta)

A API avisa o site sempre que um dado exibido no perfil público mudar, e o site descarta a tag daquele username.

1. **Evento na API.** Os services que alteram dados públicos do perfil disparam um evento `PublicProfileChanged` com os usernames afetados (o antigo e o novo, quando o username muda):
   - hoje: `UpdateProfileService` (nome, username, minibiografia), `UpdateMissionaryAboutService`, `UpdateMissionaryProfileService` (contatos públicos) e `UpsertMissionaryWorkAddressService`;
   - quando existirem: aprovação ou reprovação do missionário, mudança de `membershipStatus`, exclusão de conta e renomeação de agência ou comunidade de fé (avisa todos os missionários vinculados).
2. **Entrega por fila.** Um listener enfileira um job (BullMQ, como a indexação no Elasticsearch). O job chama `POST {FRONTEND_URL}/api/revalidate/profiles` com `{ "usernames": [...] }`, com retentativas e backoff. Uma falha de entrega nunca afeta a resposta do pedido original: o cache volta ao comportamento atual e expira pelo tempo.
3. **Autenticação do aviso.** O corpo vai assinado com HMAC-SHA256, um segredo próprio (`PROFILE_REVALIDATION_SECRET`, diferente do segredo do BFF do ADR-0032, para um vazamento não dar outros poderes) e um timestamp, para rejeitar replays com mais de 5 minutos.
4. **Rota no site.** Um route handler valida assinatura e timestamp, normaliza os usernames e chama `revalidateTag('profile:<username>', { expire: 0 })` para cada um. Assim a próxima visita já busca o dado novo. Ele responde 204, e 401 para assinatura inválida.
5. **Tempo de cache.** Com o aviso em produção, o `cacheLife('public')` do perfil pode subir (por exemplo, de 5 minutos para 1 hora). O tempo de cache vira só uma rede de segurança para avisos perdidos. O valor exato fica para a implementação.

## Justificativa

- **Atualização imediata onde importa:** desativação e exclusão deixam de ficar públicas por minutos.
- **Menos carga na API:** com cache mais longo, cada perfil é lido bem menos vezes, e o orçamento do servidor do BFF sobra.
- **Reaproveita o que existe:** eventos e filas (BullMQ) já são o padrão da API para efeitos colaterais, e a entrega fora do pedido não aumenta a latência de quem salvou.
- **Falha segura:** se o aviso não chegar, o site se comporta como hoje (expira pelo tempo).

## Alternativas Consideradas

**1. Só diminuir o tempo de cache**

Reduz a janela mas não a elimina, e multiplica as leituras na API. Descartada como solução, mantida como rede de segurança.

**2. Sem cache no perfil público**

Dado sempre atual, mas cada visita vira uma chamada à API e o shell da página perde o cache. Contraria o ADR-0004 do frontend. Descartada.

**3. O site consulta a API para saber o que mudou (polling)**

Exige um endpoint de "mudanças desde" e um processo periódico no site. É mais complexo que o aviso e ainda tem atraso. Descartada.

**4. Cache compartilhado (Dragonfly) lido pelos dois lados**

A API apagaria a chave direto no cache que o Next usa, com um cache handler customizado. Acopla os dois apps à mesma infraestrutura e ao formato interno do cache do Next. Descartada por ora; vira opção se o deploy do site exigir um cache handler compartilhado (ver riscos).

## Consequências (Trade-offs)

### Positivas / Benefícios

- O perfil público reflete na hora as mudanças feitas pelo app mobile, pela avaliação e pela administração.
- O cache pode ficar mais longo, o que reduz a carga na API e a latência das páginas públicas.
- O contrato fica explícito: quem muda dado público avisa, e há um único lugar para acrescentar novos casos.

### Negativas / Riscos

- **Mais uma integração entre os repositórios:** endpoint, segredo e job novos, com testes nos dois lados.
- **Esquecer de disparar o evento** num service novo traz o atraso de volta, limitado ao tempo de cache. Um teste de contrato pode listar os services que alteram dados públicos.
- **Deploy com várias instâncias do site:** `revalidateTag` só invalida o cache que a instância enxerga. Em hospedagem própria com várias instâncias, é preciso um cache handler compartilhado (ou avisar todas as instâncias). Na Vercel, o cache de dados já é compartilhado. Isso depende da decisão de hospedagem, ainda em aberto.
- **Ordem e duplicidade:** avisos repetidos ou fora de ordem só causam uma releitura a mais, porque descartar uma tag é idempotente.

## Referências

- ADR-0036: perfil público anônimo e orçamento de rate limit do servidor do BFF
- ADR-0032: IP do usuário repassado pelo BFF com segredo compartilhado
- MissionAppFrontend, ADR-0004 (rotas públicas com `use cache`) e ADR-0006 (Server Actions com `updateTag`)
- [revalidateTag (Next.js)](https://nextjs.org/docs/app/api-reference/functions/revalidateTag): `{ expire: 0 }` em route handlers descarta o dado na próxima leitura

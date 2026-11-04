# ADR-0032: IP do Usuário Repassado pelo BFF com Segredo Compartilhado

## Dados

- **Status:** 🟢 Aceito
- **Data:** 2026-10-31
- **Proponentes:** [@Amaro-peter]

---

## Contexto e Problema

O frontend (Next.js) não chama a API direto do navegador: o BFF (route handlers do Next) recebe o pedido e chama a API a partir do próprio servidor. Os rate limits por IP (disponibilidade de username e listagem pública de catálogos, ADR do PR #137) usam `request.ip()`, que nesse caminho é **o IP do servidor do BFF para todos os usuários**.

A verificação integrada confirmou o efeito. Um visitante esgotou o orçamento de 20 req/min e, em seguida, **outro visitante recebeu 429**. Em produção, um único usuário (ou bot) bloquearia a verificação de username e as listas de agências e igrejas do cadastro para todo mundo.

Confiar em `X-Forwarded-For` não resolve sozinho. O `trustProxy` (`app/utils/trust_proxy.ts`) só aceita proxies em rede privada, e o BFF pode rodar fora da rede da API (ex.: Vercel).

A questão central é: **como a API identifica o usuário final num pedido que chega pelo BFF, sem permitir que um cliente qualquer forje esse IP?**

## Decisão

O BFF se autentica com um **segredo compartilhado** e repassa o IP do usuário em headers próprios:

- `x-missionapp-bff-secret`: o valor de `BFF_SHARED_SECRET`, configurado nas duas aplicações;
- `x-missionapp-client-ip`: o IP do usuário final, como o BFF o recebeu.

`resolveClientIp()` (`app/utils/client_ip.ts`) usa o IP repassado **somente** quando:

- `BFF_SHARED_SECRET` está configurado na API;
- o segredo recebido confere, com comparação em tempo constante sobre digests SHA-256;
- o valor é um IP válido (`node:net` `isIP`).

Em qualquer outro caso, vale `request.ip()`. Os dois middlewares de rate limit passam a usar essa função.

O escopo é deliberadamente estreito: o IP repassado **só** alimenta a chave dos rate limits. Não altera `request.ip()`, autenticação nem logs.

## Justificativa

- Funciona em qualquer hospedagem do BFF (Vercel, VPS, container), sem depender de rede privada.
- Um cliente comum não forja o IP sem conhecer o segredo, que só existe no servidor do BFF e na API.
- Sem `BFF_SHARED_SECRET`, o comportamento é exatamente o anterior, então a adoção pode ser gradual.

## Alternativas Consideradas

**1. Repassar `X-Forwarded-For` e confiar só em proxies de rede privada**

Mais simples, mas só funciona se BFF e API dividirem rede privada. Na Vercel o IP de origem é público e o header seria ignorado.

**2. Ampliar o `trustProxy` para confiar em qualquer origem**

Qualquer cliente que chame a API direto poderia forjar `X-Forwarded-For` e contornar os rate limits. Descartado.

**3. Rate limit por sessão/usuário em vez de IP**

As rotas limitadas são públicas: não há sessão na verificação de username nem nas listas do cadastro.

## Consequências (Trade-offs)

### Positivas / Benefícios

- Cada usuário volta a ter o próprio orçamento de rate limit, e um visitante não bloqueia o cadastro dos outros.
- O mecanismo é reaproveitável por rotas futuras que precisem do IP real.

### Negativas / Riscos

- Mais um segredo a gerenciar e rotacionar nas duas aplicações. Se vazar, permite forjar IPs **apenas** para fins de rate limit.
- O BFF passa a ser responsável por extrair o IP correto. O proxy na frente do Next deve sobrescrever (não só anexar) `x-forwarded-for`/`x-real-ip`. A Vercel já faz isso.

## Referências

- PR #137: listagem pública de catálogos com rate limit por IP
- `app/utils/trust_proxy.ts`: política de proxies confiáveis
- [crypto.timingSafeEqual (Node.js)](https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b): comparação em tempo constante do segredo

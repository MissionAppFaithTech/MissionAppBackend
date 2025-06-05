# Política de Segurança

## Versões suportadas

Apenas a versão mais recente na branch `main` recebe correções de segurança. Versões anteriores não são mantidas.

| Branch / Versão       | Recebe correções de segurança |
| --------------------- | ----------------------------- |
| `main` (última)       | ✅ Sim                        |
| Qualquer outra branch | ❌ Não                        |

---

## Reportando uma vulnerabilidade

**Não abra uma issue pública no GitHub para relatar vulnerabilidades de segurança.** Issues públicas expõem o problema antes que uma correção esteja disponível, colocando todos os usuários do projeto em risco.

### Como reportar

Envie um email para **missionapp.faithtech@gmail.com** com:

1. **Descrição da vulnerabilidade** — o que é, onde está localizada (arquivo, endpoint, componente)
2. **Passos para reproduzir** — instruções detalhadas que permitam reproduzir o problema
3. **Impacto potencial** — o que um atacante poderia fazer ao explorar a vulnerabilidade
4. **Sugestão de correção** (opcional) — se você tiver uma proposta de fix

Inclua "**[SECURITY]**" no assunto do email para que o relatório seja triado com prioridade.

### O que esperar

- **Confirmação de recebimento:** em até 72 horas úteis
- **Avaliação inicial:** em até 7 dias, com confirmação se a vulnerabilidade foi aceita ou rejeitada e o motivo
- **Correção e divulgação:** para vulnerabilidades aceitas, trabalharemos para disponibilizar uma correção o mais rápido possível, considerando a severidade. Você será notificado quando a correção for publicada

Tratamos relatórios de segurança com seriedade e agradecemos o esforço de quem pratica divulgação responsável. Pedimos que você também mantenha confidencialidade sobre a vulnerabilidade até que a correção seja publicada.

---

## Escopo

Esta política cobre vulnerabilidades no código-fonte deste repositório. Estão fora do escopo:

- Vulnerabilidades em dependências de terceiros (reporte diretamente ao mantenedor da biblioteca ou via [npm security advisories](https://docs.npmjs.com/reporting-a-vulnerability-in-an-npm-package))
- Vulnerabilidades na infraestrutura de produção de terceiros (AWS, GitHub, Docker Hub)
- Problemas de configuração em ambientes locais de desenvolvimento

---

## Ferramentas de segurança do projeto

Este projeto utiliza as seguintes ferramentas para detecção contínua de vulnerabilidades:

- **[Snyk](https://snyk.io/)** — varredura de dependências (SCA), análise estática (SAST), containers e IaC em cada PR ([ADR-0014](./docs/architecture/decisions/0014-adocao-do-snyk-para-deteccao-de-vulnerabilidades.md))
- **[Renovate](https://docs.renovatebot.com/)** — atualização automática de dependências com quarentena de pacotes novos ([ADR-0013](./docs/architecture/decisions/0013-adocao-do-renovate-para-atualizacao-automatica-de-dependencias.md))

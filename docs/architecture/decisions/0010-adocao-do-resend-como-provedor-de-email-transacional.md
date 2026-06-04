# [ADR-0010]: Adoção do Resend como Provedor de Email Transacional

## Dados
* **Status:** Proposto
* **Data:** 2026-05-31
* **Proponentes:** [Allber Ferreira](https://github.com/AFSFerreira)

---

## Contexto e Problema

O MissionApp exige envio de emails transacionais em múltiplos fluxos críticos: recuperação de senha via token temporário, notificações de doação para missionários e apoiadores, e alertas administrativos de moderação de conteúdo. Esses emails envolvem tokens de curta validade e links sensíveis — sua entregabilidade e rastreabilidade não são opcionais.

Dois problemas específicos tornam a escolha do provedor uma decisão arquitetural relevante:

**Entregabilidade e rastreabilidade de emails críticos:**
Emails de verificação de conta e redefinição de senha que caem em spam ou que são enviados para endereços inexistentes (hard bounce) criam uma categoria silenciosa de falha: o usuário não recebe o email, não consegue completar o fluxo e interpreta como bug do sistema. Sem um mecanismo que notifique o backend sobre bounces e reclamações de spam, o sistema continua tentando enviar para endereços inválidos — degradando gradualmente a reputação do domínio remetente até que emails legítimos comecem a ser rejeitados em massa.

**Custo de desenvolvimento e manutenção em projeto open-source:**
Em um projeto com contribuidores voluntários e rotatividade alta, a complexidade de configuração do provedor de email e a qualidade do painel de debugging têm impacto direto na velocidade de desenvolvimento. Um provedor que exige dias de configuração de DNS, IAM policies e ambientes de sandbox cria uma barreira proporcional ao número de desenvolvedores que conseguem trabalhar na funcionalidade de email localmente.

A pergunta central é: **qual provedor de email transacional oferece a melhor combinação de entregabilidade, rastreabilidade via webhooks, DX para contribuidores e custo compatível com o modelo open-source do MissionApp?**

## Decisão

Adotaremos o **Resend** como provedor oficial de emails transacionais do MissionApp Backend.

A integração será realizada pelo **transport nativo do Resend disponível no `@adonisjs/mail`**, instalado via:

```bash
node ace add @adonisjs/mail --transports=resend
```

O transport é configurado via API Key do Resend nas variáveis de ambiente, expondo a mesma interface `mail.send()` do AdonisJS independentemente do provedor. A troca de provedor no futuro — se necessária — requer apenas a troca do transport na configuração, sem alteração de código nos Services ou Mailers.

**Webhooks de entregabilidade:**
O Resend será configurado para disparar webhooks para o endpoint `POST /webhooks/resend` da aplicação nos seguintes eventos:


| Evento                   | Ação no backend                                                          |
| :----------------------  | :----------------------------------------------------------------------- |
| `email.bounced`          | Marcar email como inválido; bloquear envios futuros para o endereço      |
| `email.complained`       | Marcar email como inválido; registrar reclamação de spam                 |
| `email.delivery_delayed` | Log de alerta para monitoramento                                         |
| `email.delivered`        | Opcional: atualizar status de entrega em registros de auditoria          |



O endpoint de webhook verificará a assinatura de cada requisição via cabeçalhos Svix (`svix-id`, `svix-timestamp`, `svix-signature`) antes de processar qualquer payload. O processamento do evento seguirá o padrão EDA estabelecido no [ADR-0008](./0008-adocao-de-arquitetura-orientada-a-eventos-com-bullmq.md): o endpoint HTTP apenas valida a assinatura e enfileira um Job no BullMQ — o Worker executa a lógica de atualização do usuário de forma assíncrona.

O header `svix-id` será usado para idempotência: Jobs com `svix-id` já processado serão descartados, protegendo contra a re-entrega que o Resend realiza em caso de falha (at-least-once delivery).

**Plano e limites:**
O projeto iniciará no plano gratuito (3.000 emails/mês, 100/dia, 1 domínio). A migração para o plano Pro (USD 20/mês, 50.000 emails/mês, 10 domínios, sem limite diário) será avaliada conforme o crescimento da base de usuários ativos.

## Justificativa

O Resend foi escolhido por resolver diretamente os dois problemas identificados no contexto, com o menor overhead operacional para o estágio atual do projeto:

- **Transport nativo no `@adonisjs/mail`:** O AdonisJS oferece integração oficial com o Resend como um dos transports do `@adonisjs/mail` — não é necessário implementar adaptadores customizados, configurar Nodemailer manualmente ou manter código de integração. A superfície de contato entre o código da aplicação e o Resend é mínima: uma API Key nas variáveis de ambiente e o nome do transport na configuração.

- **Painel de logs que elimina debugging cego:** O dashboard do Resend exibe o histórico completo de cada email enviado — status de entrega, timestamps, conteúdo renderizado, headers e eventos de webhook — em tempo real. Em um projeto com contribuidores novos, a capacidade de inspecionar visualmente o que foi enviado, quando foi entregue e por que falhou reduz o tempo de diagnóstico de horas para minutos.

- **Webhooks de bounce como proteção ativa da reputação do domínio:** O mecanismo de webhooks do Resend notifica o backend sobre hard bounces, soft bounces e reclamações de spam com payload estruturado e verificação de assinatura via Svix. Isso permite que o sistema reaja ativamente: bloquear reenvios para endereços inválidos, alertar o usuário no próximo login e manter a lista de remetentes limpa — prevenindo a degradação progressiva da reputação do domínio que ocorre quando se continua enviando para endereços que rejeitam os emails.

- **Setup de domínio documentado e direto:** A configuração de registros DNS (SPF, DKIM, DMARC) no Resend é guiada por um fluxo visual no dashboard com verificação em tempo real. Novos contribuidores que precisam configurar um domínio de teste não enfrentam o processo punitivo de configuração de identidades de envio da AWS nem a documentação fragmentada de outras plataformas.

- **Custo zero no estágio atual:** O plano gratuito cobre 3.000 emails/mês — suficiente para desenvolvimento, testes de integração e os primeiros meses de operação com uma base de usuários reduzida. A estrutura de preços do plano Pro (USD 20/mês fixo + USD 0,90 por 1.000 acima de 50.000) é previsível e escala linearmente com o crescimento da plataforma.

- **Mínimo vendor lock-in via abstração do `@adonisjs/mail`:** O código da aplicação que envia emails interage exclusivamente com a API do `@adonisjs/mail` (`mail.send()`, classes de Mailer, templates). O Resend é referenciado apenas na configuração do transport. Migrar para outro provedor — Amazon SES, Mailgun ou SMTP próprio — requer apenas a troca do transport e das credenciais, sem alteração nos Mailers, Services ou templates.

## Alternativas Consideradas

* **Amazon SES (AWS):** Provedor mais barato do mercado em larga escala (USD 0,10 por 1.000 emails, sem custo fixo). Descartado porque: (1) o console da AWS é confuso para desenvolvedores sem experiência prévia na plataforma — navegar por IAM policies, identidades de envio, configuração de DKIM e saída do sandbox são tarefas que consomem horas de um colaborador novo; (2) novas contas AWS SES iniciam em modo sandbox, onde emails só podem ser enviados para endereços verificados manualmente — impossibilitando testes reais sem aprovação de saída do sandbox pela AWS; (3) a DX para debugging é inferior: logs de entrega requerem configuração de CloudWatch ou SNS para webhooks, adicionando infraestrutura adicional para obter o que o Resend oferece nativamente no dashboard; (4) o custo por email é relevante apenas em volumes superiores a 500.000 emails/mês — fora do horizonte de planejamento atual do MissionApp.

* **SendGrid (Twilio):** Foi o padrão da indústria para email transacional durante anos, com SDKs maduros e grande adoção. Descartado porque: (1) a base de IPs compartilhados do SendGrid acumulou problemas históricos de blacklisting — emails enviados por planos básicos frequentemente caem em spam por conta de outros remetentes que compartilham os mesmos IPs; (2) após a aquisição pela Twilio, a interface e a documentação foram fragmentadas em múltiplos produtos (Email API, Marketing Campaigns, Twilio SendGrid), tornando o onboarding confuso; (3) o suporte a webhooks existe, mas a ergonomia de configuração e o painel de logs são inferiores ao Resend; (4) não há transport nativo no `@adonisjs/mail` para SendGrid — a integração exigiria transport SMTP ou implementação customizada.

* **Mailgun:** Plataforma estabelecida com boas capacidades de deliverability e API robusta. Descartada porque: (1) assim como SendGrid, enfrenta problemas de reputação de IP em planos compartilhados; (2) o plano gratuito foi descontinuado — a plataforma exige cartão de crédito mesmo para testes, criando fricção para novos contribuidores que querem rodar a aplicação localmente com email real; (3) a documentação oficial perdeu qualidade nos últimos anos e alguns SDKs estão desatualizados; (4) não há transport nativo no `@adonisjs/mail` para Mailgun — integração via SMTP ou implementação customizada.

* **Nodemailer com servidor SMTP próprio (Postfix / Haraka):** Hospedar o próprio servidor de email para controle total sobre IPs e configuração. Descartado porque: (1) operar um servidor de email próprio com boa reputação de entregabilidade é uma especialidade operacional por si só — requer IP warming, monitoramento ativo de blacklists, configuração de PTR records, feedback loops com provedores de email e resposta a incidentes de spam; (2) a entregabilidade de IPs de servidores em nuvem (AWS EC2, DigitalOcean, Hetzner) é historicamente baixa — muitos provedores bloqueiam por padrão emails originados de endereços IP de data centers; (3) o overhead operacional é desproporcional para o estágio atual de um projeto open-source com foco em desenvolvimento de produto.

* **Resend via SMTP relay (em vez do transport nativo da API):** Usar o relay SMTP do Resend (disponível em todos os planos) em vez do transport nativo do `@adonisjs/mail`. Considerado como opção de mitigação de vendor lock-in, mas descartado como abordagem primária porque: (1) o transport nativo via API oferece respostas de erro mais granulares do que o protocolo SMTP padrão — facilitando diagnóstico de falhas; (2) o `@adonisjs/mail` já abstrai o transport, tornando a troca de provedor uma mudança de configuração independentemente de SMTP ou API; (3) funcionalidades como tags de email e idempotency keys são acessíveis apenas via API REST, não via SMTP relay. O SMTP relay permanece como fallback documentado caso a biblioteca do transport nativo introduza incompatibilidades em atualizações futuras.

## Consequências (Trade-offs)

### Positivas / Benefícios

* **Debugging visual de emails sem instrumentação adicional:** O dashboard do Resend registra cada email enviado com payload completo, timestamps e status de entrega — reduz o tempo de diagnóstico de problemas de email de horas para minutos, especialmente para contribuidores novos.

* **Proteção automática da reputação do domínio:** Webhooks de bounce e reclamação permitem que o sistema reaja a endereços inválidos e destinatários que marcaram o email como spam antes que a reputação do domínio seja degradada — protegendo a entregabilidade de todos os demais emails transacionais.

* **Onboarding sem fricção para novos contribuidores:** Configuração de domínio guiada, plano gratuito sem cartão de crédito e transport nativo no `@adonisjs/mail` permitem que um novo colaborador configure o email local em menos de 30 minutos.

* **Baixo acoplamento via abstração do `@adonisjs/mail`:** Troca de provedor = troca de transport na configuração. Sem alteração nos Mailers, Services ou templates.

### Negativas / Riscos

* **Limite diário de 100 emails no plano gratuito:** O plano gratuito limita 100 emails por dia — suficiente para desenvolvimento mas insuficiente para testes de carga ou campanhas. Pipelines de CI/CD que disparam envios de email em testes de integração devem usar um transport de mock (`mail.fake()` do AdonisJS) para não consumir a cota diária.

* **Webhook endpoint exige URL pública acessível:** O Resend precisa de um endpoint HTTP público para entregar webhooks. Em desenvolvimento local, isso requer um túnel (ex: `ngrok`, Cloudflare Tunnel) para testar o fluxo de bounce end-to-end. O comportamento de bounce deve ser testado com o mock do AdonisJS em testes unitários e com o tunnel apenas em validações manuais.

* **Dependência de serviço de terceiro:** O envio de emails transacionais depende da disponibilidade do Resend. Indisponibilidade do Resend impacta diretamente fluxos críticos como verificação de conta e recuperação de senha. A resiliência parcial é garantida pela fila BullMQ ([ADR-0008](./0008-adocao-de-arquitetura-orientada-a-eventos-com-bullmq.md)): emails enfileirados durante indisponibilidade serão reenviados quando o serviço se recuperar, mas o limite de tempo dos tokens de verificação/redefinição deve ser dimensionado considerando janelas razoáveis de indisponibilidade.

* **Plano gratuito limitado a 1 domínio:** Em estágios iniciais, o limite de um domínio no plano gratuito significa que o domínio de produção e o domínio de staging devem compartilhar a mesma conta — ou a migração para Pro (USD 20/mês, 10 domínios) deve acontecer antes do lançamento de um ambiente de homologação dedicado.

## Referências

* [Resend — Documentação oficial](https://resend.com/docs)
* [Resend — Webhooks: eventos e verificação de assinatura](https://resend.com/docs/webhooks/introduction)
* [Resend — Pricing](https://resend.com/pricing)
* [AdonisJS — Mail: transports e configuração](https://docs.adonisjs.com/guides/digging-deeper/mail#transport-configuration)
* [ADR-0008 — Arquitetura Orientada a Eventos com BullMQ](./0008-adocao-de-arquitetura-orientada-a-eventos-com-bullmq.md)

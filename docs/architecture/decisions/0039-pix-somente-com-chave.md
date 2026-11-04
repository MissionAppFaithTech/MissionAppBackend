# [ADR-0039]: PIX Somente com Chave

## Dados

- **Status:** 🟢 Aceito
- **Data:** 2026-11-03
- **Proponentes:** [@Amaro-peter](https://github.com/Amaro-peter)

---

## Contexto e Problema

A configuração financeira do missionário (`financial_configs`) guarda a chave PIX (`pix_key`) e tinha também a coluna `qr_code_asset_id`, uma FK para `media_assets` com a imagem de um QR Code estático. A coluna veio do RF 12.1.2 da lista de requisitos: "Pode enviar opcionalmente um QR Code estático (upload de imagem)".

Nenhum endpoint gravava ou lia o QR Code. No frontend, a tela "Configurações de Doação" tinha upload e preview da imagem, e o modal de doação a exibia.

Manter o QR Code tem custos sem benefício claro:

- **Duas fontes da mesma informação.** A imagem é enviada pelo usuário e pode apontar para outra chave, outro valor ou outro recebedor. Nada garante que ela corresponda à chave cadastrada.
- **Risco de fraude.** Uma imagem trocada desviaria doações sem que a chave exibida mudasse.
- **Mais armazenamento e moderação** (upload, storage, verificação de imagem) para algo que a chave já resolve: os aplicativos de banco aceitam "Pix copia e cola" e a chave digitada.

A questão central é: **o PIX do missionário deve aceitar uma imagem de QR Code além da chave?**

## Decisão

**Não. O PIX é configurado e exibido apenas pela chave.**

- Migração nova (ADR-0020) remove a FK `fk_financial_configs_qr_code_asset_id` e a coluna `financial_configs.qr_code_asset_id`. O rollback recria as duas como eram.
- O model `FinancialConfig` perde a relação `qrCodeAsset`.
- Assets que existam em `media_assets` continuam lá; nenhum endpoint os gravou, então não há limpeza a fazer.
- O frontend remove o upload, o preview e a imagem no modal, e mantém a chave com "Copiar chave Pix" ([ADR-0008 do frontend](https://github.com/MissionAppFaithTech/MissionAppFrontend/blob/main/docs/architecture/decisions/0008-doacao-via-pix-somente-com-chave.md)).

**Divergência com a lista de requisitos:** o RF 12.1.2 ainda prevê o QR Code opcional. A decisão do produto é removê-lo; a atualização da lista de requisitos fica com o responsável por ela.

## Justificativa

- **Uma fonte de verdade:** a chave cadastrada é a única informação de pagamento exibida.
- **Menos superfície de fraude:** não há imagem que possa divergir da chave.
- **Menos código e infraestrutura:** sem upload, storage nem moderação de imagem para o PIX.

## Alternativas Consideradas

1. **Manter a coluna sem uso.** Descartada: deixaria no banco uma funcionalidade que o produto decidiu não ter, e o próximo desenvolvedor poderia implementá-la de novo.
2. **Gerar o QR Code a partir da chave (BR Code).** Fora do escopo desta decisão. Se for desejado no futuro, o código é gerado da chave cadastrada, sem upload, e não precisa desta coluna.

## Consequências (Trade-offs)

### Positivas / Benefícios

- O doador vê só a chave cadastrada pelo missionário.
- O schema e o model ficam alinhados ao que o produto oferece.

### Negativas / Riscos

- **Quem doava escaneando a imagem** passa a copiar a chave, um passo a mais no celular.
- **Divergência temporária com o RF 12.1.2** até a lista de requisitos ser atualizada.

## Referências

- [ADR-0008](./0008-uso-do-minio-como-emulador-de-storage-em-desenvolvimento.md): fluxos de armazenamento (o QR Code do PIX saiu da lista)
- [ADR-0020](./0020-convencoes-de-escrita-de-migracoes.md): convenção das migrations e das colunas `*_asset_id`
- [ADR-0008 do frontend — Doação via PIX Somente com Chave](https://github.com/MissionAppFaithTech/MissionAppFrontend/blob/main/docs/architecture/decisions/0008-doacao-via-pix-somente-com-chave.md)
- [Lista de requisitos do MissionApp](https://missionappfaithtech.github.io/MissionAppRequirementsList/): RF 12.1.2
- [Banco Central — Pix](https://www.bcb.gov.br/estabilidadefinanceira/pix)

# [ADR-0032]: Upload Direto via URL Pré-Assinada e Compressão de Imagens com sharp em Worker

## Dados

- **Status:** 🟡 Proposto
- **Data:** 2026-10-19
- **Proponentes:** [Henrique Mendonça](https://github.com/devhenriquemendonca)

---

## Contexto e Problema

O MissionApp precisa receber arquivos enviados pelos usuários em fluxos centrais do produto: a imagem de capa (e o vídeo opcional) do projeto de impacto e a galeria de imagens das postagens. Os ADRs [0007](./0007-adocao-do-dragonfly-como-cache-e-armazenamento-temporario.md) e [0012](./0012-adocao-de-arquitetura-orientada-a-eventos-com-bullmq.md) já preveem que a compressão de imagens rode em workers BullMQ, e o [ADR-0001](./0001-adocao-do-adonisjs-como-framework-backend.md) prevê o `@adonisjs/drive` como abstração de storage. Faltava decidir **como o arquivo chega ao storage** e **qual biblioteca faz a compressão**.

Até aqui, o único endpoint de mídia (`POST /media-assets`) registrava metadados de um arquivo que o cliente dizia já ter enviado, com `bucket` e `fileKey` escolhidos pelo próprio cliente. Isso tem três problemas:

- **Sem integração real com storage:** nenhum código da aplicação gravava, lia ou removia objetos. Arquivos de posts e projetos removidos ficariam órfãos no bucket para sempre.
- **Chave escolhida pelo cliente:** um cliente mal-intencionado consegue registrar ou sobrescrever qualquer chave do bucket, inclusive a de outro usuário.
- **Nenhuma validação do conteúdo:** o tipo e o tamanho declarados não eram conferidos. Fotos de celular chegam com 5–10 MB e com EXIF (incluindo coordenadas GPS, um dado sensível sob a LGPD).

Além disso, existe a regra de negócio de manter no máximo **50 imagens por missionário** somando todas as postagens, excluindo os arquivos excedentes. Isso exige remover objetos do storage de forma confiável.

A questão central é: **como receber, validar, comprimir e remover arquivos de usuários sem sobrecarregar a API, sem acoplar services à infraestrutura de storage e sem permitir que o cliente controle o que é gravado no bucket?**

## Decisão

Adotaremos **upload direto ao storage via URL pré-assinada**, com **validação e compressão assíncronas em worker BullMQ usando o `sharp`**:

1. `POST /media-assets/uploads`: o cliente declara finalidade (`purpose`), mime type e tamanho. A API valida contra as regras da finalidade (`MEDIA_ASSET_RULES`), **gera a chave no servidor** (`<prefixo>/<userId>/<uuidv7>.<ext>`), cria o `media_asset` em `PENDING_UPLOAD` e devolve uma URL `PUT` pré-assinada (15 min) **com `content-type` e `content-length` dentro da assinatura**. Assim o próprio storage rejeita um envio divergente do declarado.
2. O cliente envia o arquivo direto ao S3/MinIO. A API não trafega os bytes.
3. `POST /media-assets/:id/completion`: o autor confirma o envio. O asset vai para `PROCESSING` e o evento `MediaAssetUploaded` enfileira o job `process-media-asset` na fila `media-processing`.
4. O worker confere o objeto real (existência, tamanho e, para vídeo, content-type) e, para imagens, aplica `rotate()` (orientação EXIF) → `resize` (limite por finalidade, sem ampliar) → WebP qualidade 80, o que remove todos os metadados. Grava a versão comprimida, aponta o asset para ela (`READY`), e só então apaga o original. Conteúdo inválido vira `FAILED` e o objeto é removido.
5. Recursos (projeto de impacto, post) só aceitam vincular assets do **próprio autor**, com a **finalidade correta** e em `PROCESSING`/`READY`. Quando um vínculo é desfeito (troca de capa, remoção, imagem excedente ao limite de 50), o service emite `MediaAssetsDiscarded` **após o commit**, e o job `delete-media-assets` remove registro e objeto, nessa ordem e na mesma transação. Assim, uma falha no storage desfaz o delete e o job é refeito.

O **sharp** é a biblioteca de processamento de imagens mais usada no ecossistema Node.js, mantida por Lovell Fuller e baseada na libvips. Distribui binários pré-compilados por plataforma (sem toolchain nativa na instalação) e processa imagens em streaming com uso de memória muito menor que alternativas baseadas em ImageMagick.

Junto com esta decisão, o `@adonisjs/drive` (já previsto no ADR-0001) passa a ser instalado e configurado com o driver S3 (`config/drive.ts`), apontando para o MinIO em dev (ADR-0008).

## Justificativa

- **A API não carrega bytes:** com URL pré-assinada, uploads de até 200 MB (vídeo) não ocupam conexões, memória nem o bodyparser da API. O ADR-0012 já separa a carga de CPU da compressão para workers; esta decisão separa também a carga de rede.
- **O servidor controla o que é gravado:** chave gerada no servidor e tipo e tamanho assinados eliminam a sobrescrita de arquivos alheios e o upload de conteúdo ativo (ex: HTML) num bucket público. O worker revalida o objeto real, porque a declaração do cliente nunca é tratada como verdade.
- **Re-encode como sanitização:** converter toda imagem para WebP descarta qualquer payload embutido e todos os metadados (EXIF/GPS), atendendo à LGPD Art. 46 sem lógica específica de remoção de EXIF.
- **Coerente com o pipeline existente:** service → evento → listener → job (ADR-0012). Os services de request não fazem I/O no storage. A única exceção é a assinatura da URL, que é cálculo HMAC local, sem chamada de rede.
- **sharp:** é o padrão de fato, rápido (libvips) e distribui binários pré-compilados por plataforma (linux glibc/musl x64/arm64, macOS, Windows) como dependências opcionais já registradas no `pnpm-lock.yaml`, então não exige toolchain nativa na instalação.

## Alternativas Consideradas

**1. Upload multipart pela própria API**

A API receberia o arquivo via `multipart/form-data`, validaria e gravaria no storage. Descartado porque coloca na API todo o tráfego de bytes (incluindo vídeos de até 200 MB) e exige ajustar limites de bodyparser e timeouts. A compressão continuaria no worker, então a API só repassaria bytes.

**2. Comprimir de forma síncrona na requisição**

Processar a imagem com sharp dentro do request de confirmação. Descartado porque contraria o ADR-0012: a latência da resposta passaria a depender do tamanho da imagem, e picos de upload competiriam por CPU com o restante da API.

**3. Jimp (processamento de imagem em JavaScript puro)**

Evita binários nativos. Descartado por ser de 10 a 20 vezes mais lento e consumir muito mais memória que o sharp, além de não suportar WebP com a mesma qualidade e controle.

**4. Serviço gerenciado de imagens (Cloudinary, imgix, Cloudflare Images)**

Descartado porque adiciona um fornecedor externo pago com dados pessoais de usuários, o que exige uma avaliação de LGPD à parte. O MinIO de dev (ADR-0008) também deixaria de reproduzir o comportamento de produção.

## Consequências (Trade-offs)

### Positivas / Benefícios

- Uploads não consomem recursos da API, e a compressão escala de forma independente (fila `media-processing`).
- Imagens servidas ficam significativamente menores (WebP, no máximo 1600–1920px no maior lado, contra fotos de celular de 4000px+) e sem metadados sensíveis.
- Arquivos de recursos removidos ou substituídos e imagens excedentes ao limite de 50 por missionário são efetivamente apagados do storage.
- O cliente não escolhe mais a chave do objeto nem consegue gravar tipos ou tamanhos diferentes dos declarados.

### Negativas / Riscos

- **Fluxo em três passos para o cliente** (reservar → `PUT` → confirmar), e a URL pública só existe quando o status vira `READY`. O frontend precisa acompanhar o status (`GET /media-assets/:id`).
- **Uploads abandonados:** assets em `PENDING_UPLOAD` que nunca são confirmados (ou que terminam em `FAILED`) exigem limpeza periódica — feita pelo worker `queue:media-assets-cleanup`, que precisa estar em execução em todos os ambientes.
- **Binário nativo:** o sharp depende de binários por plataforma. Uma imagem Docker em plataforma sem binário pré-compilado (ex: Alpine/musl em arquitetura incomum) exigiria compilar a libvips.
- **CORS e leitura pública no bucket:** para o `PUT` direto do browser e a exibição das imagens, o bucket precisa liberar a origem do frontend e permitir `s3:GetObject` público. Em dev, `node ace storage:setup` (executado por `just start`) aplica isso no MinIO; em staging/produção é configuração de infraestrutura — ver [`docs/deployment/storage.md`](../../deployment/storage.md).
- O endpoint legado `POST /media-assets` (registro com chave escolhida pelo cliente) continua existindo e deve ser descontinuado quando nenhum cliente o usar.

## Referências

- [sharp — documentação oficial](https://sharp.pixelplumbing.com/): API de redimensionamento, conversão para WebP e tratamento de metadados usados pelo worker
- [AWS — Uploading objects with presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html): modelo de upload direto adotado e comportamento de headers assinados
- [FlyDrive / @adonisjs/drive](https://flydrive.dev/docs/introduction): abstração de storage usada para assinar URLs e manipular objetos no worker
- [ADR-0012](./0012-adocao-de-arquitetura-orientada-a-eventos-com-bullmq.md): pipeline evento → listener → job seguido pelo processamento e pela remoção de arquivos
- [ADR-0008](./0008-uso-do-minio-como-emulador-de-storage-em-desenvolvimento.md): MinIO como storage S3-compatível em desenvolvimento

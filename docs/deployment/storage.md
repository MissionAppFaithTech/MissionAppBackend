# Storage de arquivos (S3 / MinIO / R2)

Como configurar o armazenamento das imagens enviadas pelo fluxo de upload direto (capa do
projeto de impacto e imagens das postagens — ver
[ADR-0040](../architecture/decisions/0040-upload-direto-via-url-pre-assinada-e-compressao-de-imagens-com-sharp.md)).
Vídeos não são enviados: o projeto de impacto guarda só um link do YouTube ou do Vimeo.

## Discos

O `@adonisjs/drive` (`config/drive.ts`) define quatro discos, separados por visibilidade
([ADR-0013](../architecture/decisions/0013-padronizacao-de-nomenclatura-de-buckets.md)):

| Disco        | Storage                          | Bucket              |
| ------------ | -------------------------------- | ------------------- |
| `s3_public`  | S3-compatível (MinIO em dev/VPS) | `S3_PUBLIC_BUCKET`  |
| `s3_private` | S3-compatível (MinIO em dev/VPS) | `S3_PRIVATE_BUCKET` |
| `r2_public`  | Cloudflare R2                    | `R2_PUBLIC_BUCKET`  |
| `r2_private` | Cloudflare R2                    | `R2_PRIVATE_BUCKET` |

`DRIVE_DISK` escolhe o disco padrão e, com ele, o provedor. As mídias sempre são gravadas
no disco **público** desse provedor (`s3_public` ou `r2_public`). Só os discos públicos
assinam `Content-Type` e `Content-Length` na URL de upload, então o próprio storage
recusa um envio com tipo ou tamanho diferente do declarado. A visibilidade vem da policy
do bucket, não de ACL por objeto (o MinIO ignora ACLs e o R2 não as implementa).

A `url` pública de cada arquivo é montada assim:

- MinIO/S3: `S3_ENDPOINT/<bucket>/<fileKey>` (path-style);
- R2: `R2_PUBLIC_URL/<fileKey>` (o endpoint S3 do R2 não serve leitura pública).

## Desenvolvimento (MinIO local)

Nenhuma conta na nuvem é necessária. O MinIO roda no Docker e implementa a mesma API do S3.

1. Copie `.env.example` para `.env` — os valores de `S3_*` já apontam para o MinIO local
   (`superadmin` / `supersecretpassword`, as credenciais root definidas no `docker-compose.yaml`)
   e `DRIVE_DISK=s3_public`.
2. Rode `just start`. A receita sobe a infraestrutura, aplica as migrations e executa
   `just storage-setup` (`node ace storage:setup`), que de forma idempotente:
   - cria os buckets `S3_PUBLIC_BUCKET` e `S3_PRIVATE_BUCKET` se não existirem;
   - aplica política de **leitura pública** (`s3:GetObject`) **só** ao bucket público — o
     privado não recebe policy e só é acessado por URL assinada;
   - libera **CORS** no bucket público para `FRONTEND_URL` (`PUT`/`GET` com `Content-Type`
     e `Content-Length`). O MinIO não implementa CORS por bucket (já libera qualquer origem),
     então essa etapa é ignorada nele sem erro.
3. Console do MinIO para inspecionar arquivos: `http://127.0.0.1:9001`.

## Workers necessários

| Comando                               | Função                                                          |
| ------------------------------------- | --------------------------------------------------------------- |
| `node ace queue:workers`              | Compressão de imagens e remoção de arquivos descartados         |
| `node ace queue:media-assets-cleanup` | Remove diariamente (4h) uploads nunca confirmados ou rejeitados |

## Staging / Produção

`node ace storage:setup` usa sempre a conexão `S3_*` (MinIO/S3). No VPS com MinIO ele pode
ser executado da mesma forma que em dev. Os buckets do Cloudflare R2 **não** são criados nem
configurados pela aplicação. Antes do deploy:

1. **Buckets** seguindo o [ADR-0013](../architecture/decisions/0013-padronizacao-de-nomenclatura-de-buckets.md):
   `missionapp-{staging|prod}-public-assets` (público) e `missionapp-{staging|prod}-private-docs`
   (privado). Os dois precisam ser diferentes.
2. **Leitura pública** só no bucket público. No MinIO, é a política `s3:GetObject` aplicada
   pelo `storage:setup`. No R2, habilite o domínio `r2.dev` ou um domínio customizado no
   bucket público e informe-o em `R2_PUBLIC_URL`. Listagem e escrita continuam privadas — a
   escrita acontece só via URL pré-assinada.
3. **CORS** do bucket público liberando a origem do frontend (`FRONTEND_URL`) para `PUT` e
   `GET`, com os headers `Content-Type` e `Content-Length`. No R2, configure no painel ou por
   infraestrutura como código.
4. **Credenciais** dedicadas com permissão mínima nos buckets: gravar, ler, remover e listar
   objetos.
5. **Variáveis de ambiente** no ambiente de deploy (nunca no repositório):

| Variável            | Quando                 | Exemplo                                         |
| ------------------- | ---------------------- | ----------------------------------------------- |
| `DRIVE_DISK`        | sempre                 | `s3_public` (MinIO) ou `r2_public`              |
| `S3_ENDPOINT`       | sempre                 | `https://<host-do-minio>`                       |
| `S3_REGION`         | sempre                 | `us-east-1`                                     |
| `S3_PUBLIC_BUCKET`  | sempre                 | `missionapp-prod-public-assets`                 |
| `S3_PRIVATE_BUCKET` | sempre                 | `missionapp-prod-private-docs`                  |
| `S3_ACCESS_KEY`     | sempre                 | chave de acesso do MinIO/S3                     |
| `S3_SECRET_KEY`     | sempre                 | segredo do MinIO/S3                             |
| `R2_ENDPOINT`       | `DRIVE_DISK=r2_*`      | `https://<account-id>.r2.cloudflarestorage.com` |
| `R2_ACCESS_KEY`     | `DRIVE_DISK=r2_*`      | chave do token de API do R2                     |
| `R2_SECRET_KEY`     | `DRIVE_DISK=r2_*`      | segredo do token de API do R2                   |
| `R2_PUBLIC_BUCKET`  | `DRIVE_DISK=r2_*`      | `missionapp-prod-public-assets`                 |
| `R2_PRIVATE_BUCKET` | `DRIVE_DISK=r2_*`      | `missionapp-prod-private-docs`                  |
| `R2_PUBLIC_URL`     | `DRIVE_DISK=r2_public` | `https://<dominio-publico-do-r2>`               |
| `FRONTEND_URL`      | sempre                 | `https://<dominio-do-site>`                     |

As variáveis `R2_*` são opcionais no boot e só passam a ser exigidas quando `DRIVE_DISK`
aponta para um disco `r2_*`. Arquivos antigos continuam no provedor em que foram criados
mesmo que `DRIVE_DISK` mude depois.

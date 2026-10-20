# Storage de arquivos (S3 / MinIO)

Como configurar o armazenamento de imagens e vídeos usado pelo fluxo de upload direto
(ver [ADR-0032](../architecture/decisions/0032-upload-direto-via-url-pre-assinada-e-compressao-de-imagens-com-sharp.md)).

## Desenvolvimento (MinIO local)

Nenhuma conta AWS é necessária. O MinIO roda no Docker e implementa a mesma API do S3.

1. Copie `.env.example` para `.env` — os valores de `S3_*` já apontam para o MinIO local
   (`superadmin` / `supersecretpassword`, as credenciais root definidas no `docker-compose.yaml`).
2. Rode `just start`. A receita sobe a infraestrutura, aplica as migrations e executa
   `just storage-setup` (`node ace storage:setup`), que de forma idempotente:
   - cria o bucket `S3_BUCKET` se ele não existir;
   - aplica política de **leitura pública** de objetos (`s3:GetObject`);
   - libera **CORS** para `FRONTEND_URL` (`PUT`/`GET` com `Content-Type` e `Content-Length`).
3. Console do MinIO para inspecionar arquivos: `http://127.0.0.1:9001`.

## Workers necessários

| Comando                               | Função                                                          |
| ------------------------------------- | --------------------------------------------------------------- |
| `node ace queue:workers`              | Compressão de imagens e remoção de arquivos descartados         |
| `node ace queue:media-assets-cleanup` | Remove diariamente (4h) uploads nunca confirmados ou rejeitados |

## Staging / Produção

A aplicação **não** cria nem configura buckets de produção automaticamente. Antes do deploy:

1. **Bucket** seguindo o [ADR-0013](../architecture/decisions/0013-padronizacao-de-nomenclatura-de-buckets.md):
   `missionapp-{staging|prod}-public-assets`.
2. **Leitura pública** dos objetos (política `s3:GetObject` em `arn:aws:s3:::<bucket>/*`).
   Listagem e escrita continuam privadas — a escrita acontece só via URL pré-assinada.
   Na AWS, desative o "Block Public Access" apenas para essa política ou, preferencialmente,
   sirva via CloudFront com OAC e mantenha o bucket privado (nesse caso, `S3_PUBLIC_URL`
   aponta para a distribuição).
3. **CORS** do bucket liberando a origem do frontend para `PUT` e `GET`, com os headers
   `Content-Type` e `Content-Length`.
4. **Usuário IAM** dedicado com permissão mínima no bucket: `s3:PutObject`, `s3:GetObject`,
   `s3:DeleteObject` e `s3:ListBucket`.
5. **Variáveis de ambiente** no ambiente de deploy (nunca no repositório):

| Variável              | Exemplo                                    |
| --------------------- | ------------------------------------------ |
| `S3_ENDPOINT`         | `https://s3.sa-east-1.amazonaws.com`       |
| `S3_REGION`           | `sa-east-1`                                |
| `S3_BUCKET`           | `missionapp-prod-public-assets`            |
| `S3_ACCESS_KEY`       | chave do usuário IAM                       |
| `S3_SECRET_KEY`       | segredo do usuário IAM                     |
| `S3_FORCE_PATH_STYLE` | `false`                                    |
| `S3_PUBLIC_URL`       | `https://cdn.missionapp.com.br` (opcional) |
| `DRIVE_DISK`          | `s3`                                       |

Os passos 1 a 3 podem ser aplicados com `node ace storage:setup --allow-production` usando
credenciais com permissão administrativa no bucket, mas o recomendado é gerenciá-los por
infraestrutura como código.

import env from '#start/env'
import { defineConfig, services } from '@adonisjs/drive'
import type { InferDriveDisks } from '@adonisjs/drive/types'
import string from '@adonisjs/core/helpers/string'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const driveConfig = defineConfig({
  default: env.get('DRIVE_DISK'),

  /**
   * Mesmo driver S3 em dev (MinIO) e produção (AWS S3) — só o endpoint e as
   * credenciais mudam (ADR-0008).
   */
  services: {
    s3: services.s3({
      credentials: {
        accessKeyId: env.get('S3_ACCESS_KEY'),
        secretAccessKey: env.get('S3_SECRET_KEY'),
      },
      region: env.get('S3_REGION'),
      endpoint: env.get('S3_ENDPOINT'),
      bucket: env.get('S3_BUCKET'),
      forcePathStyle: env.get('S3_FORCE_PATH_STYLE', false),
      cdnUrl: env.get('S3_PUBLIC_URL'),
      visibility: 'public',
      urlBuilder: {
        /**
         * Por padrão o presigner só assina o header `host` — sem incluir
         * `content-type` e `content-length` na assinatura, o cliente poderia
         * enviar qualquer tipo/tamanho de arquivo (ex: HTML num bucket
         * público). Assinados, o próprio storage rejeita o PUT divergente do
         * que foi declarado no pedido de upload.
         */
        async generateSignedUploadURL(_key, options, client, expiresIn) {
          return getSignedUrl(client, new PutObjectCommand(options), {
            expiresIn:
              typeof expiresIn === 'number' ? expiresIn : string.seconds.parse(expiresIn ?? '30m'),
            signableHeaders: new Set(['content-type', 'content-length']),
          })
        },
      },
    }),
  },
})

export default driveConfig

declare module '@adonisjs/drive/types' {
  export interface DriveDisks extends InferDriveDisks<typeof driveConfig> {}
}

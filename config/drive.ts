import env from '#start/env'
import { requireEnvWhen } from '#utils/storage'
import string from '@adonisjs/core/helpers/string'
import { defineConfig, services } from '@adonisjs/drive'
import type { InferDriveDisks } from '@adonisjs/drive/types'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import type { PutObjectCommandInput, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

type R2EnvKey =
  'R2_ENDPOINT' | 'R2_ACCESS_KEY' | 'R2_SECRET_KEY' | 'R2_PUBLIC_BUCKET' | 'R2_PRIVATE_BUCKET'

const usesR2ByDefault = env.get('DRIVE_DISK').startsWith('r2_')

const r2Env = (key: R2EnvKey) => requireEnvWhen(key, env.get(key), usesR2ByDefault)

/**
 * Conexão com o storage S3-compatível principal (MinIO em dev e no VPS).
 * Exportada para que comandos de infraestrutura (ex.: `storage:setup`) usem
 * exatamente a mesma conexão dos discos do Drive.
 */
export const s3ClientConfig = {
  credentials: {
    accessKeyId: env.get('S3_ACCESS_KEY'),
    secretAccessKey: env.get('S3_SECRET_KEY'),
  },
  endpoint: env.get('S3_ENDPOINT'),
  region: env.get('S3_REGION'),
  // NOTE: MinIO só resolve buckets via path-style (endpoint/bucket/key)
  forcePathStyle: true,
}

// NOTE: a visibilidade é definida pela policy do bucket (ADR-0013), não por ACL
// de objeto — R2 não implementa ACLs e o MinIO as ignora. Por isso
// `supportsACL: false` em todos os discos.
const r2ClientConfig = {
  credentials: {
    accessKeyId: r2Env('R2_ACCESS_KEY'),
    secretAccessKey: r2Env('R2_SECRET_KEY'),
  },
  endpoint: r2Env('R2_ENDPOINT'),
  region: 'auto',
}

/**
 * URL de upload direto (ADR-0040) que assina também `content-type` e
 * `content-length`. Por padrão o presigner só assina o `host`: sem isso o
 * cliente poderia enviar outro tipo ou tamanho de arquivo (ex.: HTML num
 * bucket público). Assinados, o próprio storage recusa o PUT divergente.
 */
const signedUploads = {
  urlBuilder: {
    async generateSignedUploadURL(
      _key: string,
      options: PutObjectCommandInput,
      client: S3Client,
      expiresIn?: number | string
    ) {
      return getSignedUrl(client, new PutObjectCommand(options), {
        expiresIn:
          typeof expiresIn === 'number' ? expiresIn : string.seconds.parse(expiresIn ?? '30m'),
        signableHeaders: new Set(['content-type', 'content-length']),
      })
    },
  },
}

const driveConfig = defineConfig({
  default: env.get('DRIVE_DISK'),

  services: {
    s3_public: services.s3({
      ...s3ClientConfig,
      supportsACL: false,
      bucket: env.get('S3_PUBLIC_BUCKET'),
      visibility: 'public',
      ...signedUploads,
    }),
    s3_private: services.s3({
      ...s3ClientConfig,
      supportsACL: false,
      bucket: env.get('S3_PRIVATE_BUCKET'),
      visibility: 'private',
    }),
    r2_public: services.s3({
      ...r2ClientConfig,
      supportsACL: false,
      bucket: r2Env('R2_PUBLIC_BUCKET'),
      visibility: 'public',
      ...signedUploads,
      // NOTE: o endpoint S3 do R2 não serve leitura pública; URLs públicas
      // precisam do domínio r2.dev ou de um domínio customizado.
      cdnUrl:
        env.get('DRIVE_DISK') === 'r2_public'
          ? requireEnvWhen('R2_PUBLIC_URL', env.get('R2_PUBLIC_URL'), true)
          : env.get('R2_PUBLIC_URL'),
    }),
    r2_private: services.s3({
      ...r2ClientConfig,
      supportsACL: false,
      bucket: r2Env('R2_PRIVATE_BUCKET'),
      visibility: 'private',
    }),
  },
})

export default driveConfig

declare module '@adonisjs/drive/types' {
  export interface DriveDisks extends InferDriveDisks<typeof driveConfig> {}
}

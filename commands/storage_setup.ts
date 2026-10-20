import env from '#start/env'
import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketCorsCommand,
  PutBucketPolicyCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3'

export default class StorageSetup extends BaseCommand {
  static commandName = 'storage:setup'
  static description =
    'Cria o bucket de assets (se ausente) e aplica leitura pública e CORS para upload direto'

  static options: CommandOptions = { loadApp: true }

  @flags.boolean({
    description: 'Permite rodar com NODE_ENV=production (altera política de um bucket real)',
  })
  declare allowProduction: boolean

  async run() {
    // WARNING: o comando torna o bucket publicamente legível — em produção a
    // infraestrutura deve ser gerida fora da aplicação, então exige opt-in explícito
    if (env.get('NODE_ENV') === 'production' && !this.allowProduction) {
      this.logger.error('NODE_ENV=production — use --allow-production para continuar')
      this.exitCode = 1
      return
    }

    const bucket = env.get('S3_BUCKET')
    const client = new S3Client({
      credentials: {
        accessKeyId: env.get('S3_ACCESS_KEY'),
        secretAccessKey: env.get('S3_SECRET_KEY'),
      },
      region: env.get('S3_REGION'),
      endpoint: env.get('S3_ENDPOINT'),
      forcePathStyle: env.get('S3_FORCE_PATH_STYLE', false),
    })

    await this.ensureBucket(client, bucket)
    await this.applyPublicReadPolicy(client, bucket)
    await this.applyCors(client, bucket)
  }

  private async ensureBucket(client: S3Client, bucket: string): Promise<void> {
    try {
      await client.send(new HeadBucketCommand({ Bucket: bucket }))
      this.logger.info(`bucket "${bucket}" já existe`)
    } catch (error) {
      if (!(error instanceof S3ServiceException) || error.$metadata.httpStatusCode !== 404) {
        throw error
      }

      await client.send(new CreateBucketCommand({ Bucket: bucket }))
      this.logger.success(`bucket "${bucket}" criado`)
    }
  }

  private async applyPublicReadPolicy(client: S3Client, bucket: string): Promise<void> {
    // NOTE: só leitura de objetos — listagem do bucket e escrita continuam privadas;
    // escrita acontece apenas via URL pré-assinada emitida pela API
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${bucket}/*`],
        },
      ],
    }

    await client.send(
      new PutBucketPolicyCommand({ Bucket: bucket, Policy: JSON.stringify(policy) })
    )
    this.logger.success('política de leitura pública aplicada')
  }

  private async applyCors(client: S3Client, bucket: string): Promise<void> {
    try {
      await client.send(
        new PutBucketCorsCommand({
          Bucket: bucket,
          CORSConfiguration: {
            CORSRules: [
              {
                AllowedOrigins: [env.get('FRONTEND_URL')],
                AllowedMethods: ['PUT', 'GET'],
                AllowedHeaders: ['Content-Type', 'Content-Length'],
                ExposeHeaders: ['ETag'],
                MaxAgeSeconds: 3600,
              },
            ],
          },
        })
      )
      this.logger.success(`CORS liberado para ${env.get('FRONTEND_URL')}`)
    } catch (error) {
      // NOTE: algumas versões do MinIO não implementam CORS por bucket e já
      // liberam qualquer origem globalmente — em dev isso não bloqueia o upload
      if (error instanceof S3ServiceException && error.name === 'NotImplemented') {
        this.logger.warning('storage não suporta CORS por bucket; mantendo CORS global')
        return
      }
      throw error
    }
  }
}

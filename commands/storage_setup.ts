import { s3ClientConfig } from '#config/drive'
import { EnsureBucketsService } from '#services/storage/ensure_buckets_service'
import env from '#start/env'
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { S3Client } from '@aws-sdk/client-s3'

export default class StorageSetup extends BaseCommand {
  static commandName = 'storage:setup'
  static description =
    'Cria os buckets S3_PUBLIC_BUCKET/S3_PRIVATE_BUCKET no storage S3-compatível e aplica a policy pública'

  static options: CommandOptions = { startApp: true }

  async run() {
    const client = new S3Client(s3ClientConfig)

    try {
      const created = await new EnsureBucketsService(client).execute({
        publicBucket: env.get('S3_PUBLIC_BUCKET'),
        privateBucket: env.get('S3_PRIVATE_BUCKET'),
      })

      this.logger.success(
        created.length > 0 ? `buckets criados: ${created.join(', ')}` : 'buckets já existiam'
      )
    } catch (error) {
      this.exitCode = 1
      this.logger.error(`falha ao provisionar buckets: ${(error as Error).message}`)
    } finally {
      client.destroy()
    }
  }
}

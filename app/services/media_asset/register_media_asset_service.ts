import { Provider } from '#enums/media_asset/provider'
import MediaAsset from '#models/media_asset'
import db from '@adonisjs/lucid/services/db'

type RegisterMediaAssetPayload = {
  provider?: Provider
  bucket: string
  fileKey: string
  mimeType: string
  fileSizeBytes: number
}

/**
 * Registra um arquivo já armazenado no provider e retorna o asset persistido.
 */
export class RegisterMediaAssetService {
  async execute(payload: RegisterMediaAssetPayload): Promise<MediaAsset> {
    return db.transaction(async (trx) => {
      const existing = await MediaAsset.query({ client: trx })
        .where('provider', payload.provider ?? Provider.S3)
        .where('bucket', payload.bucket)
        .where('fileKey', payload.fileKey)
        .first()

      if (existing) {
        existing.merge({
          mimeType: payload.mimeType,
          fileSizeBytes: payload.fileSizeBytes,
        })
        await existing.save()
        return existing
      }

      return MediaAsset.create(
        {
          provider: payload.provider ?? Provider.S3,
          bucket: payload.bucket,
          fileKey: payload.fileKey,
          mimeType: payload.mimeType,
          fileSizeBytes: payload.fileSizeBytes,
        },
        { client: trx }
      )
    })
  }
}

import { Provider } from '#enums/media_asset/provider'
import vine from '@vinejs/vine'

export const registerMediaAssetValidator = vine.create({
  provider: vine.enum(Object.values(Provider)).optional(),
  bucket: vine.string().trim().minLength(1).maxLength(255),
  fileKey: vine.string().trim().minLength(1).maxLength(1024),
  mimeType: vine.string().trim().minLength(3).maxLength(255),
  fileSizeBytes: vine.number().withoutDecimals().positive(),
})

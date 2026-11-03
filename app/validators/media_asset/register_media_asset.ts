import { Provider } from '#enums/media_asset/provider'
import vine from '@vinejs/vine'

/**
 * Limites das colunas de `media_assets` (migration 1761885935167): acima deles
 * o banco recusa a linha e a API responderia 500 em vez de 422.
 */
const FILE_KEY_MAX_LENGTH = 255 // file_key varchar(255)
const FILE_SIZE_BYTES_MAX = 2_147_483_647 // file_size_bytes integer

export const registerMediaAssetValidator = vine.create({
  provider: vine.enum(Object.values(Provider)).optional(),
  bucket: vine.string().trim().minLength(1).maxLength(255),
  fileKey: vine.string().trim().minLength(1).maxLength(FILE_KEY_MAX_LENGTH),
  mimeType: vine.string().trim().minLength(3).maxLength(255),
  fileSizeBytes: vine.number().withoutDecimals().positive().max(FILE_SIZE_BYTES_MAX),
})

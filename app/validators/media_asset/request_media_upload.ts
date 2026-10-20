import { MediaAssetPurpose } from '#enums/media_asset/media_asset_purpose'
import vine from '@vinejs/vine'

export const requestMediaUploadValidator = vine.create({
  purpose: vine.enum(Object.values(MediaAssetPurpose)),
  mimeType: vine.string().trim().toLowerCase().minLength(3).maxLength(255),
  fileSizeBytes: vine.number().withoutDecimals().positive(),
})

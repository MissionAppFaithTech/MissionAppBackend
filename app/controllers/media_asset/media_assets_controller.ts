import { MediaUploadService } from '#services/media_asset/media_upload_service'
import { RegisterMediaAssetService } from '#services/media_asset/register_media_asset_service'
import MediaAssetTransformer from '#transformers/media_asset_transformer'
import { mediaAssetIdValidator } from '#validators/media_asset/media_asset_id'
import { registerMediaAssetValidator } from '#validators/media_asset/register_media_asset'
import type { HttpContext } from '@adonisjs/core/http'

export default class MediaAssetsController {
  async show({ auth, request, serialize }: HttpContext) {
    const {
      params: { id },
    } = await request.validateUsing(mediaAssetIdValidator)

    const mediaAsset = await new MediaUploadService().show(auth.getUserOrFail(), id)

    return serialize({
      mediaAsset: MediaAssetTransformer.transform(mediaAsset),
    })
  }

  async store({ request, serialize }: HttpContext) {
    const payload = await request.validateUsing(registerMediaAssetValidator)
    const mediaAsset = await new RegisterMediaAssetService().execute(payload)

    return serialize({
      mediaAsset: MediaAssetTransformer.transform(mediaAsset),
    })
  }
}

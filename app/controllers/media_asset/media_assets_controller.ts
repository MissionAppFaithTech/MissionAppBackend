import { RegisterMediaAssetService } from '#services/media_asset/register_media_asset_service'
import MediaAssetTransformer from '#transformers/media_asset_transformer'
import { registerMediaAssetValidator } from '#validators/media_asset/register_media_asset'
import type { HttpContext } from '@adonisjs/core/http'

export default class MediaAssetsController {
  async store({ request, serialize }: HttpContext) {
    const payload = await request.validateUsing(registerMediaAssetValidator)
    const mediaAsset = await new RegisterMediaAssetService().execute(payload)

    return serialize({
      mediaAsset: MediaAssetTransformer.transform(mediaAsset),
    })
  }
}

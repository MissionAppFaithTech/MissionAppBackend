import { MediaUploadService } from '#services/media_asset/media_upload_service'
import MediaAssetTransformer from '#transformers/media_asset_transformer'
import { mediaAssetIdValidator } from '#validators/media_asset/media_asset_id'
import type { HttpContext } from '@adonisjs/core/http'

export default class MediaUploadCompletionsController {
  async store({ auth, request, response, serialize }: HttpContext) {
    const {
      params: { id },
    } = await request.validateUsing(mediaAssetIdValidator)

    const mediaAsset = await new MediaUploadService().complete(auth.getUserOrFail(), id)

    // NOTE: 202 — a compressão segue no worker; o cliente acompanha pelo status do asset
    response.status(202)
    return serialize({
      mediaAsset: MediaAssetTransformer.transform(mediaAsset),
    })
  }
}

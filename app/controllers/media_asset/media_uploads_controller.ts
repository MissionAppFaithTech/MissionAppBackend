import { MediaUploadService } from '#services/media_asset/media_upload_service'
import MediaAssetTransformer from '#transformers/media_asset_transformer'
import { requestMediaUploadValidator } from '#validators/media_asset/request_media_upload'
import type { HttpContext } from '@adonisjs/core/http'

export default class MediaUploadsController {
  async store({ auth, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(requestMediaUploadValidator)
    const { mediaAsset, upload } = await new MediaUploadService().request(
      auth.getUserOrFail(),
      payload
    )

    return serialize({
      mediaAsset: MediaAssetTransformer.transform(mediaAsset),
      upload,
    })
  }
}

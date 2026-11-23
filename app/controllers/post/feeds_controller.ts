import { FeedService } from '#services/post/feed_service'
import PostTransformer from '#transformers/post_transformer'
import { serializeCursorPage } from '#utils/cursor_pagination'
import { listFeedValidator } from '#validators/post/list_feed'
import type { HttpContext } from '@adonisjs/core/http'

export default class FeedsController {
  async index({ auth, request, serialize }: HttpContext) {
    const filters = await request.validateUsing(listFeedValidator)
    const page = await new FeedService().list(auth.getUserOrFail(), filters)

    return serializeCursorPage(serialize, 'posts', PostTransformer.transform(page.items), page)
  }
}

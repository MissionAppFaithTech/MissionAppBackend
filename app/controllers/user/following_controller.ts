import { FollowsService } from '#services/user/follows_service'
import FollowTransformer from '#transformers/follow_transformer'
import { serializeCursorPage } from '#utils/cursor_pagination'
import { listFollowsValidator } from '#validators/user/list_follows'
import type { HttpContext } from '@adonisjs/core/http'

export default class FollowingController {
  async index({ request, serialize }: HttpContext) {
    const { params, ...filters } = await request.validateUsing(listFollowsValidator)
    const page = await new FollowsService().listFollowing(params.id, filters)

    return serializeCursorPage(
      serialize,
      'following',
      FollowTransformer.transform(page.items, 'following'),
      page
    )
  }
}

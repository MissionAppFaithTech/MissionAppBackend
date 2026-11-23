import { FollowsService } from '#services/follower/follows_service'
import ConnectionTransformer from '#transformers/connection_transformer'
import { serializeCursorPage } from '#utils/cursor_pagination'
import { listConnectionsValidator } from '#validators/follower/list_connections'
import type { HttpContext } from '@adonisjs/core/http'

export default class FollowersController {
  async index({ auth, request, serialize }: HttpContext) {
    const filters = await request.validateUsing(listConnectionsValidator)
    const page = await new FollowsService().listFollowers(auth.getUserOrFail(), filters)

    return serializeCursorPage(
      serialize,
      'followers',
      ConnectionTransformer.transform(
        page.items.map((row) => ({ user: row.follower, followedAt: row.createdAt }))
      ),
      page
    )
  }
}

import { FollowsService } from '#services/follower/follows_service'
import ConnectionTransformer from '#transformers/connection_transformer'
import { serializeCursorPage } from '#utils/cursor_pagination'
import { followMissionaryValidator } from '#validators/follower/follow_missionary'
import { followedUsernameValidator } from '#validators/follower/followed_username'
import { listConnectionsValidator } from '#validators/follower/list_connections'
import type { HttpContext } from '@adonisjs/core/http'

export default class FollowingsController {
  async index({ auth, request, serialize }: HttpContext) {
    const filters = await request.validateUsing(listConnectionsValidator)
    const page = await new FollowsService().listFollowing(auth.getUserOrFail(), filters)

    return serializeCursorPage(
      serialize,
      'following',
      ConnectionTransformer.transform(
        page.items.map((row) => ({ user: row.following, followedAt: row.createdAt }))
      ),
      page
    )
  }

  async show({ auth, request, serialize }: HttpContext) {
    const {
      params: { username },
    } = await request.validateUsing(followedUsernameValidator)

    const following = await new FollowsService().isFollowing(auth.getUserOrFail(), username)

    return serialize({ following })
  }

  async store({ auth, request, serialize }: HttpContext) {
    const { username } = await request.validateUsing(followMissionaryValidator)

    await new FollowsService().follow(auth.getUserOrFail(), username)

    return serialize({ following: true })
  }

  async destroy({ auth, request, serialize }: HttpContext) {
    const {
      params: { username },
    } = await request.validateUsing(followedUsernameValidator)

    await new FollowsService().unfollow(auth.getUserOrFail(), username)

    return serialize({ following: false })
  }
}

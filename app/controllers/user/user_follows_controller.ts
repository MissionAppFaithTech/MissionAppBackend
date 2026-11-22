import { FollowsService } from '#services/user/follows_service'
import { userIdValidator } from '#validators/user/user_id'
import type { HttpContext } from '@adonisjs/core/http'

export default class UserFollowsController {
  async show({ auth, request, serialize }: HttpContext) {
    const {
      params: { id },
    } = await request.validateUsing(userIdValidator)

    const follow = await new FollowsService().state(auth.getUserOrFail(), id)

    return serialize({ follow })
  }

  async store({ auth, request, serialize }: HttpContext) {
    const {
      params: { id },
    } = await request.validateUsing(userIdValidator)

    const follow = await new FollowsService().follow(auth.getUserOrFail(), id)

    return serialize({ follow })
  }

  async destroy({ auth, request, serialize }: HttpContext) {
    const {
      params: { id },
    } = await request.validateUsing(userIdValidator)

    const follow = await new FollowsService().unfollow(auth.getUserOrFail(), id)

    return serialize({ follow })
  }
}

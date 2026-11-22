import { PostLikesService } from '#services/post/post_likes_service'
import { postIdValidator } from '#validators/post/post_id'
import type { HttpContext } from '@adonisjs/core/http'

export default class PostLikesController {
  async store({ auth, request, serialize }: HttpContext) {
    const {
      params: { id },
    } = await request.validateUsing(postIdValidator)

    const like = await new PostLikesService().like(auth.getUserOrFail(), id)

    return serialize({ like })
  }

  async destroy({ auth, request, serialize }: HttpContext) {
    const {
      params: { id },
    } = await request.validateUsing(postIdValidator)

    const like = await new PostLikesService().unlike(auth.getUserOrFail(), id)

    return serialize({ like })
  }
}

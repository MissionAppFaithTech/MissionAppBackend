import { PostLikesService } from '#services/post/post_likes_service'
import { PostsService } from '#services/post/posts_service'
import PostTransformer from '#transformers/post_transformer'
import { createPostValidator } from '#validators/post/create_post'
import { listPostsValidator } from '#validators/post/list_posts'
import { postIdValidator } from '#validators/post/post_id'
import { updatePostValidator } from '#validators/post/update_post'
import { serializeCursorPage } from '#utils/cursor_pagination'
import type { HttpContext } from '@adonisjs/core/http'

export default class PostsController {
  async index({ auth, request, serialize }: HttpContext) {
    const filters = await request.validateUsing(listPostsValidator)
    const page = await new PostsService().list(filters)
    const engagement = await new PostLikesService().viewerState(auth.getUserOrFail(), page.items)

    return serializeCursorPage(
      serialize,
      'posts',
      PostTransformer.transform(page.items, engagement),
      page
    )
  }

  async show({ auth, request, serialize }: HttpContext) {
    const {
      params: { id },
    } = await request.validateUsing(postIdValidator)

    const post = await new PostsService().show(id)
    const engagement = await new PostLikesService().viewerState(auth.getUserOrFail(), [post])

    return serialize({
      post: PostTransformer.transform(post, engagement),
    })
  }

  async store({ auth, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(createPostValidator)

    const post = await new PostsService().create(auth.getUserOrFail(), payload)

    return serialize({
      post: PostTransformer.transform(post),
    })
  }

  async update({ auth, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(updatePostValidator)
    const actor = auth.getUserOrFail()

    const post = await new PostsService().update(actor, payload.params.id, payload)
    const engagement = await new PostLikesService().viewerState(actor, [post])

    return serialize({
      post: PostTransformer.transform(post, engagement),
    })
  }

  async destroy({ auth, request }: HttpContext) {
    const {
      params: { id },
    } = await request.validateUsing(postIdValidator)

    await new PostsService().destroy(auth.getUserOrFail(), id)

    return {
      message: 'Postagem removida com sucesso',
    }
  }
}

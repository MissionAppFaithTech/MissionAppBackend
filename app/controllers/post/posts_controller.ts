import { PostsService } from '#services/post/posts_service'
import PostTransformer from '#transformers/post_transformer'
import { createPostValidator } from '#validators/post/create_post'
import { listPostsValidator } from '#validators/post/list_posts'
import { postIdValidator } from '#validators/post/post_id'
import { updatePostValidator } from '#validators/post/update_post'
import type { HttpContext } from '@adonisjs/core/http'

export default class PostsController {
  async index({ request, serialize }: HttpContext) {
    const filters = await request.validateUsing(listPostsValidator)
    const posts = await new PostsService().list(filters)

    return serialize(PostTransformer.paginate(posts.all(), posts.getMeta()))
  }

  async show({ request, serialize }: HttpContext) {
    const {
      params: { id },
    } = await request.validateUsing(postIdValidator)

    const post = await new PostsService().show(id)

    return serialize({
      post: PostTransformer.transform(post),
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

    const post = await new PostsService().update(auth.getUserOrFail(), payload.params.id, payload)

    return serialize({
      post: PostTransformer.transform(post),
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

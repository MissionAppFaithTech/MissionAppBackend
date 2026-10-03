import { FaithCommunitiesService } from '#services/missionary/faith_communities_service'
import FaithCommunityTransformer from '#transformers/faith_community_transformer'
import { createFaithCommunityValidator } from '#validators/missionary/create_faith_community'
import { faithCommunityIdValidator } from '#validators/missionary/faith_community_id'
import { listFaithCommunitiesValidator } from '#validators/missionary/list_faith_communities'
import { updateFaithCommunityValidator } from '#validators/missionary/update_faith_community'
import type { HttpContext } from '@adonisjs/core/http'

export default class FaithCommunitiesController {
  async index({ request, serialize }: HttpContext) {
    const filters = await request.validateUsing(listFaithCommunitiesValidator)
    const communities = await new FaithCommunitiesService().list(filters)

    return serialize({
      faithCommunities: FaithCommunityTransformer.transform(communities),
    })
  }

  async show({ request, serialize }: HttpContext) {
    const {
      params: { id },
    } = await request.validateUsing(faithCommunityIdValidator)

    const community = await new FaithCommunitiesService().show(id)

    return serialize({
      faithCommunity: FaithCommunityTransformer.transform(community),
    })
  }

  async store({ auth, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(createFaithCommunityValidator)

    const community = await new FaithCommunitiesService().create(auth.getUserOrFail(), payload)

    return serialize({
      faithCommunity: FaithCommunityTransformer.transform(community),
    })
  }

  async update({ auth, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(updateFaithCommunityValidator)

    const community = await new FaithCommunitiesService().update(
      auth.getUserOrFail(),
      payload.params.id,
      payload
    )

    return serialize({
      faithCommunity: FaithCommunityTransformer.transform(community),
    })
  }

  async destroy({ auth, request }: HttpContext) {
    const {
      params: { id },
    } = await request.validateUsing(faithCommunityIdValidator)

    await new FaithCommunitiesService().destroy(auth.getUserOrFail(), id)

    return {
      message: 'Comunidade de fé removida com sucesso',
    }
  }
}

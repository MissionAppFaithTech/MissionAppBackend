import FollowerTransformer from '#transformers/follower_transformer'
import { listFollowingValidator } from '#validators/follower/list_following'
import { missionaryTargetValidator } from '#validators/follower/missionary_target'
import { FollowMissionaryService } from '#services/follower/follow_missionary_service'
import { ListFollowingService } from '#services/follower/list_following_service'
import { UnfollowMissionaryService } from '#services/follower/unfollow_missionary_service'
import type { HttpContext } from '@adonisjs/core/http'

export default class FollowingController {
  async index({ auth, request, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const { page, perPage } = await request.validateUsing(listFollowingValidator)

    const following = await new ListFollowingService().execute(user.id, page, perPage)

    return serialize(FollowerTransformer.paginate(following.all(), following.getMeta()))
  }

  async store({ auth, request, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const {
      params: { missionaryId },
    } = await request.validateUsing(missionaryTargetValidator)

    const follower = await new FollowMissionaryService().execute(user, missionaryId)

    return serialize(FollowerTransformer.transform(follower))
  }

  async destroy({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const {
      params: { missionaryId },
    } = await request.validateUsing(missionaryTargetValidator)

    await new UnfollowMissionaryService().execute(user, missionaryId)

    return response.noContent()
  }
}

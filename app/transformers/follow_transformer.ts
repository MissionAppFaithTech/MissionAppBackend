import type Follower from '#models/follower'
import type { FollowSide } from '#types/services/user/follow'
import { mediaAssetUrl } from '#utils/media_asset_url'
import { BaseTransformer } from '@adonisjs/core/transformers'

/**
 * Item de uma lista de seguidores/seguindo: o usuário do lado `side` da
 * relação e quando o follow aconteceu. Só dados já públicos do perfil.
 */
export default class FollowTransformer extends BaseTransformer<Follower> {
  constructor(
    resource: Follower,
    private side: FollowSide
  ) {
    super(resource)
  }

  toObject() {
    const user = this.resource[this.side]

    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      profilePictureUrl: user.profilePicture ? mediaAssetUrl(user.profilePicture) : null,
      role: user.role,
      followedAt: this.resource.createdAt,
    }
  }
}

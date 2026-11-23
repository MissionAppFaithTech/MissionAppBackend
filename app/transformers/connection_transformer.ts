import type User from '#models/user'
import { mediaAssetUrl } from '#utils/media_asset_url'
import { BaseTransformer } from '@adonisjs/core/transformers'
import type { DateTime } from 'luxon'

/**
 * Card de um perfil na lista de seguidores ou de "seguindo": só dados
 * públicos, mais a data em que a conexão foi criada.
 */
export default class ConnectionTransformer extends BaseTransformer<{
  user: User
  followedAt: DateTime
}> {
  toObject() {
    const { user, followedAt } = this.resource

    return {
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      biography: user.biography ?? null,
      profilePictureUrl: user.profilePicture ? mediaAssetUrl(user.profilePicture) : null,
      followedAt,
    }
  }
}

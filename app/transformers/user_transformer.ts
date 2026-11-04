import type User from '#models/user'
import { mediaAssetUrl } from '#utils/media_asset_url'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class UserTransformer extends BaseTransformer<User> {
  toObject() {
    const picture = this.resource.profilePicture

    return {
      ...this.pick(this.resource, [
        'id',
        'fullName',
        'username',
        'email',
        'phoneNumber',
        'biography',
        'profilePictureId',
        'role',
        'createdAt',
        'updatedAt',
      ]),
      // NOTE: null também enquanto a foto está em processamento ou sem preload de
      // `profilePicture`
      profilePictureUrl: picture ? mediaAssetUrl(picture) : null,
    }
  }
}

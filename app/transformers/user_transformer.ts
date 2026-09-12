import type User from '#models/user'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class UserTransformer extends BaseTransformer<User> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'fullName',
      'username',
      'email',
      'phoneNumber',
      'biography',
      'profilePictureId',
      'faithCommunityId',
      'followersCount',
      'followingCount',
      'role',
      'createdAt',
      'updatedAt',
    ])
  }

  /**
   * Variante pública do perfil — mesmo cabeçalho exibido para visitantes
   * (RF 11.1/11.2), sem os campos privados (`email`, `phoneNumber`).
   */
  toPublic() {
    return this.pick(this.resource, [
      'id',
      'fullName',
      'username',
      'biography',
      'profilePictureId',
      'faithCommunityId',
      'followersCount',
      'followingCount',
      'role',
      'createdAt',
    ])
  }
}

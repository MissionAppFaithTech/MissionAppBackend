import type Follower from '#models/follower'
import UserTransformer from '#transformers/user_transformer'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class FollowerTransformer extends BaseTransformer<Follower> {
  toObject() {
    return {
      id: this.resource.id,
      createdAt: this.resource.createdAt,
      // NOTE: assume `following` sempre pré-carregado por quem constrói o paginator
      missionary: UserTransformer.transform(this.resource.following).useVariant('toPublic'),
    }
  }
}

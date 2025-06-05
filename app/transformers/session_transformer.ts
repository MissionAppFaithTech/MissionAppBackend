import type RefreshToken from '#models/refresh_token'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class SessionTransformer extends BaseTransformer<RefreshToken> {
  #currentFamilyId?: string

  constructor(resource: RefreshToken, currentFamilyId?: string) {
    super(resource)
    this.#currentFamilyId = currentFamilyId
  }

  toObject() {
    return {
      id: this.resource.familyId,
      ...this.pick(this.resource, [
        'deviceType',
        'deviceName',
        'ipAddress',
        'lastUsedAt',
        'createdAt',
      ]),
      current: this.resource.familyId === this.#currentFamilyId,
    }
  }
}

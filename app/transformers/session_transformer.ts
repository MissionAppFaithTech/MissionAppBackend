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
      deviceType: this.resource.deviceType,
      deviceName: this.resource.deviceName,
      ipAddress: this.resource.ipAddress,
      lastUsedAt: this.resource.lastUsedAt,
      createdAt: this.resource.createdAt,
      current: this.resource.familyId === this.#currentFamilyId,
    }
  }
}

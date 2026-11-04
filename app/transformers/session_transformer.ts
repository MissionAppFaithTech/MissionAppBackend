import type RefreshToken from '#models/refresh_token'
import { BaseTransformer } from '@adonisjs/core/transformers'
import type { DateTime } from 'luxon'

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
        'deviceKind',
        'ipAddress',
        'lastUsedAt',
        'createdAt',
      ]),
      // NOTE: `createdAt` é o da última rotação; o início da sessão vem da família (ADR-0038).
      startedAt:
        (this.resource.$extras.startedAt as DateTime | undefined) ?? this.resource.createdAt,
      current: this.resource.familyId === this.#currentFamilyId,
    }
  }
}

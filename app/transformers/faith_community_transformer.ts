import type FaithCommunity from '#models/faith_community'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class FaithCommunityTransformer extends BaseTransformer<FaithCommunity> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'name',
      'phoneNumber',
      'addressLine1',
      'addressLine2',
      'city',
      'state',
      'country',
      'postalCode',
      'website',
      'userId',
      'createdAt',
    ])
  }
}

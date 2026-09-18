import type MissionaryAgency from '#models/missionary_agency'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class MissionaryAgencyTransformer extends BaseTransformer<MissionaryAgency> {
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

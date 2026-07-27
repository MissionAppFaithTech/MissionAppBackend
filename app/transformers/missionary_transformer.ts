import type Missionary from '#models/missionary'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class MissionaryTransformer extends BaseTransformer<Missionary> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'status',
      'identityType',
      'identityDocument',
      'publicEmail',
      'publicPhone',
      'donationMessage',
      'aboutMe',
      'missionStorySummary',
      'originLocation',
      'faithCommunityId',
      'prayerRequest',
      'lifeVerse',
      'missionaryAgencyId',
      'userId',
      'createdAt',
    ])
  }
}

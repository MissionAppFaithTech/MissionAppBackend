import type MissionaryWorkAddress from '#models/missionary_work_address'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class MissionaryWorkAddressTransformer extends BaseTransformer<MissionaryWorkAddress> {
  toObject() {
    return this.pick(this.resource, ['id', 'missionaryId', 'zip', 'district', 'city', 'state', 'country'])
  }
}

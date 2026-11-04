import type FaithCommunity from '#models/faith_community'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class FaithCommunityTransformer extends BaseTransformer<FaithCommunity> {
  toObject() {
    // NOTE: o produto trata um pastor por comunidade; a tabela `pastors` admite
    // vários, então expõe o mais antigo (o preload ordena por `created_at`)
    const pastor = this.resource.pastors?.[0]

    return {
      ...this.pick(this.resource, [
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
        'createdAt',
      ]),
      pastorName: pastor?.fullName ?? null,
      pastorPhone: pastor?.phoneNumber ?? null,
    }
  }
}

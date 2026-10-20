import type ImpactProject from '#models/impact_project'
import MediaAssetTransformer from '#transformers/media_asset_transformer'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class ImpactProjectTransformer extends BaseTransformer<ImpactProject> {
  toObject() {
    return {
      ...this.pick(this.resource, [
        'id',
        'title',
        'description',
        'missionaryId',
        'coverImageAssetId',
        'videoAssetId',
        'createdAt',
        'updatedAt',
      ]),
      coverImage: MediaAssetTransformer.transform(this.whenLoaded(this.resource.coverImage)),
      video: MediaAssetTransformer.transform(this.whenLoaded(this.resource.video)),
    }
  }
}

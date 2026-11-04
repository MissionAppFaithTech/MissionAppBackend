import { DELETE_MEDIA_ASSETS_JOB_NAME } from '#constants/media_asset'
import type MediaAssetsDiscarded from '#events/media_asset/media_assets_discarded'
import { mediaProcessingQueue } from '#queues/media_processing_queue'

export default class DeleteDiscardedMediaAssetsListener {
  async handle(event: MediaAssetsDiscarded): Promise<void> {
    await mediaProcessingQueue.add(DELETE_MEDIA_ASSETS_JOB_NAME, { ...event })
  }
}

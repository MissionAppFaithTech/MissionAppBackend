import { PROCESS_MEDIA_ASSET_JOB_NAME } from '#constants/media_asset'
import type MediaAssetUploaded from '#events/media_asset/media_asset_uploaded'
import { mediaProcessingQueue } from '#queues/media_processing_queue'

export default class ProcessMediaAssetListener {
  async handle(event: MediaAssetUploaded): Promise<void> {
    await mediaProcessingQueue.add(PROCESS_MEDIA_ASSET_JOB_NAME, { ...event })
  }
}

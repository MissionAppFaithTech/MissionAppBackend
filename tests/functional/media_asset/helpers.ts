import { DELETE_MEDIA_ASSETS_JOB_NAME } from '#constants/media_asset'
import { MediaAssetPurpose } from '#enums/media_asset/media_asset_purpose'
import { MediaAssetStatus } from '#enums/media_asset/media_asset_status'
import { Provider } from '#enums/media_asset/provider'
import MediaAsset from '#models/media_asset'
import type Missionary from '#models/missionary'
import Post from '#models/post'
import PostImage from '#models/post_image'
import { mediaProcessingQueue } from '#queues/media_processing_queue'
import type User from '#models/user'
import router from '@adonisjs/core/services/router'
import type { ApiClient } from '@japa/api-client'
import { DateTime } from 'luxon'
import { v7 as uuidv7 } from 'uuid'

export type ApiBody = { data: Record<string, any>; meta?: Record<string, any> }

export async function createTestMediaAsset(
  owner: User,
  purpose: MediaAssetPurpose = MediaAssetPurpose.POST_IMAGE,
  status: MediaAssetStatus = MediaAssetStatus.READY
) {
  return MediaAsset.create({
    provider: Provider.S3,
    bucket: 'missionapp-test-public-assets',
    fileKey: `tests/${owner.id}/${uuidv7()}.webp`,
    mimeType: 'image/webp',
    fileSizeBytes: 1024,
    purpose,
    status,
    uploadedByUserId: owner.id,
  })
}

/** Imagens de post prontas (upload confirmado) do usuário. */
export async function createImageAssetIds(owner: User, count: number): Promise<string[]> {
  const ids: string[] = []
  for (let index = 0; index < count; index++) {
    const asset = await createTestMediaAsset(owner, MediaAssetPurpose.POST_IMAGE)
    ids.push(asset.id)
  }
  return ids
}

/** Faz login pela API e devolve o access token. */
export async function loginAs(client: ApiClient, user: User, password: string): Promise<string> {
  const response = await client
    .post(router.builder().make('v1.auth.access_tokens.store')!)
    .json({ login: user.email, password })

  return (response.body() as ApiBody).data.accessToken as string
}

/**
 * Vincula `count` imagens a posts do missionário direto no banco (3 por post,
 * como a API permite), das mais antigas para as mais novas. Devolve os ids na
 * ordem em que foram vinculados.
 */
export async function seedPostImages(
  owner: User,
  missionary: Missionary,
  count: number
): Promise<string[]> {
  const assetIds = await createImageAssetIds(owner, count)
  const start = DateTime.now().minus({ days: 1 })

  for (let offset = 0; offset < assetIds.length; offset += 3) {
    const batch = assetIds.slice(offset, offset + 3)
    const createdAt = start.plus({ minutes: offset })
    const post = await Post.create({
      missionaryId: missionary.id,
      content: `Post ${offset}`,
      slug: `post-${uuidv7()}`,
      createdAt,
    })
    await PostImage.createMany(
      batch.map((imageAssetId, order) => ({ postId: post.id, imageAssetId, order, createdAt }))
    )
  }

  return assetIds
}

/**
 * Ids de assets com descarte enfileirado (job `delete-media-assets` ainda não
 * processado — nos testes não há worker consumindo a fila).
 */
export async function queuedDiscardIds(): Promise<string[]> {
  const jobs = await mediaProcessingQueue.getJobs(['waiting', 'delayed', 'prioritized'])
  return jobs
    .filter((job) => job?.name === DELETE_MEDIA_ASSETS_JOB_NAME)
    .flatMap((job) => (job.data as { mediaAssetIds: string[] }).mediaAssetIds)
}

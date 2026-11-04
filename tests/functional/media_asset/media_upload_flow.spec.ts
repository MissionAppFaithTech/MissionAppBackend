import { MEDIA_ASSET_RULES, PROCESS_MEDIA_ASSET_JOB_NAME } from '#constants/media_asset'
import { MediaAssetPurpose } from '#enums/media_asset/media_asset_purpose'
import { MediaAssetStatus } from '#enums/media_asset/media_asset_status'
import { Provider } from '#enums/media_asset/provider'
import MediaAsset from '#models/media_asset'
import { mediaProcessingQueue } from '#queues/media_processing_queue'
import { MediaProcessingService } from '#services/media_asset/media_processing_service'
import env from '#start/env'
import { loginAs } from '#tests/functional/media_asset/helpers'
import type { ApiBody } from '#tests/functional/media_asset/helpers'
import { createMissionaryTestUser } from '#tests/functional/missionary/helpers'
import router from '@adonisjs/core/services/router'
import testUtils from '@adonisjs/core/services/test_utils'
import drive from '@adonisjs/drive/services/main'
import { test } from '@japa/runner'
import sharp from 'sharp'

/**
 * Fluxo real de upload direto (ADR-0040) contra o MinIO do ambiente: pedido da
 * URL pré-assinada, PUT do arquivo pelo "navegador", confirmação e compressão
 * no worker (o handler do job roda direto, sem a fila).
 */

const url = {
  request: () => router.builder().make('v1.media_uploads.store')!,
  complete: (id: string) =>
    router.builder().params({ id }).make('v1.media_upload_completions.store')!,
  show: (id: string) => router.builder().params({ id }).make('v1.media_assets.show')!,
}

async function jpeg(width: number, height: number) {
  return sharp({ create: { width, height, channels: 3, background: '#2d6a4f' } })
    .jpeg({ quality: 95 })
    .toBuffer()
}

type UploadInstructions = { url: string; method: 'PUT'; headers: Record<string, string> }

async function requestUpload(
  client: Parameters<typeof loginAs>[0],
  token: string,
  body: { purpose: MediaAssetPurpose; mimeType: string; fileSizeBytes: number }
) {
  const response = await client.post(url.request()).bearerToken(token).json(body)
  response.assertStatus(200)
  const data = (response.body() as ApiBody).data
  return { assetId: data.mediaAsset.id as string, upload: data.upload as UploadInstructions }
}

function put(upload: UploadInstructions, file: Buffer, headers = upload.headers) {
  return fetch(upload.url, { method: 'PUT', headers, body: new Uint8Array(file) })
}

test.group('Upload direto de mídia - fluxo completo (MinIO real)', (group) => {
  const uploadedKeys: string[] = []

  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  group.teardown(async () => {
    for (const key of uploadedKeys) {
      await drive.use('s3_public').delete(key)
    }
  })

  test('envia, confirma e comprime uma imagem de post em WebP', async ({ client, assert }) => {
    const { user, password } = await createMissionaryTestUser()
    const token = await loginAs(client, user, password)
    const file = await jpeg(3200, 2400)

    const { assetId, upload } = await requestUpload(client, token, {
      purpose: MediaAssetPurpose.POST_IMAGE,
      mimeType: 'image/jpeg',
      fileSizeBytes: file.byteLength,
    })
    const pending = await MediaAsset.findOrFail(assetId)
    assert.equal(pending.status, MediaAssetStatus.PENDING_UPLOAD)
    assert.equal(pending.provider, Provider.S3)
    assert.equal(pending.bucket, env.get('S3_PUBLIC_BUCKET'))
    // NOTE: comparação de texto, sem montar regex a partir de dados da resposta
    assert.isTrue(pending.fileKey.startsWith(`posts/images/${user.id}/`))
    assert.isTrue(pending.fileKey.endsWith('.jpg'))
    uploadedKeys.push(pending.fileKey)

    const stored = await put(upload, file)
    assert.equal(stored.status, 200)

    const completion = await client.post(url.complete(assetId)).bearerToken(token)
    completion.assertStatus(202)
    const jobs = await mediaProcessingQueue.getJobs(['waiting', 'delayed', 'prioritized'])
    assert.isTrue(
      jobs.some(
        (job) =>
          job?.name === PROCESS_MEDIA_ASSET_JOB_NAME &&
          (job.data as { mediaAssetId: string }).mediaAssetId === assetId
      )
    )

    await new MediaProcessingService().process(assetId)

    const ready = await MediaAsset.findOrFail(assetId)
    uploadedKeys.push(ready.fileKey)
    assert.equal(ready.status, MediaAssetStatus.READY)
    assert.equal(ready.mimeType, 'image/webp')
    assert.isTrue(ready.fileKey.endsWith('.webp'))
    assert.isBelow(ready.fileSizeBytes, file.byteLength)
    assert.isFalse(await drive.use('s3_public').exists(pending.fileKey))

    const show = await client.get(url.show(assetId)).bearerToken(token)
    const publicUrl = (show.body() as ApiBody).data.mediaAsset.url as string
    assert.equal(publicUrl, `${env.get('S3_ENDPOINT')}/${ready.bucket}/${ready.fileKey}`)

    // NOTE: o bucket público serve o arquivo sem assinatura (policy de leitura)
    const served = await fetch(publicUrl)
    assert.equal(served.status, 200)
    assert.equal(served.headers.get('content-type'), 'image/webp')
    const metadata = await sharp(Buffer.from(await served.arrayBuffer())).metadata()
    assert.equal(metadata.width, MEDIA_ASSET_RULES[MediaAssetPurpose.POST_IMAGE].maxDimensionPx)
  })

  test('o storage recusa um arquivo de tipo diferente do assinado', async ({ client, assert }) => {
    const { user, password } = await createMissionaryTestUser()
    const token = await loginAs(client, user, password)
    const file = await jpeg(64, 64)

    const { assetId, upload } = await requestUpload(client, token, {
      purpose: MediaAssetPurpose.IMPACT_PROJECT_COVER,
      mimeType: 'image/jpeg',
      fileSizeBytes: file.byteLength,
    })
    const reserved = await MediaAsset.findOrFail(assetId)
    uploadedKeys.push(reserved.fileKey)

    const response = await put(upload, file, { ...upload.headers, 'Content-Type': 'text/html' })

    assert.equal(response.status, 403)
  })

  test('o storage recusa um arquivo de tamanho diferente do assinado', async ({
    client,
    assert,
  }) => {
    const { user, password } = await createMissionaryTestUser()
    const token = await loginAs(client, user, password)
    const file = await jpeg(64, 64)

    const { assetId, upload } = await requestUpload(client, token, {
      purpose: MediaAssetPurpose.POST_IMAGE,
      mimeType: 'image/jpeg',
      fileSizeBytes: file.byteLength,
    })
    const reserved = await MediaAsset.findOrFail(assetId)
    uploadedKeys.push(reserved.fileKey)

    const bigger = Buffer.concat([file, Buffer.alloc(1024)])
    const response = await put(upload, bigger, {
      ...upload.headers,
      'Content-Length': String(bigger.byteLength),
    })

    assert.isAtLeast(response.status, 400)
  })

  test('confirmar sem ter enviado o arquivo deixa o asset como falho', async ({
    client,
    assert,
  }) => {
    const { user, password } = await createMissionaryTestUser()
    const token = await loginAs(client, user, password)

    const { assetId } = await requestUpload(client, token, {
      purpose: MediaAssetPurpose.POST_IMAGE,
      mimeType: 'image/png',
      fileSizeBytes: 2048,
    })
    const completion = await client.post(url.complete(assetId)).bearerToken(token)
    completion.assertStatus(202)

    await new MediaProcessingService().process(assetId)

    const failed = await MediaAsset.findOrFail(assetId)
    assert.equal(failed.status, MediaAssetStatus.FAILED)
  })

  test('vídeo não é mais aceito como upload (RF 9.2)', async ({ client }) => {
    const { user, password } = await createMissionaryTestUser()
    const token = await loginAs(client, user, password)

    const response = await client.post(url.request()).bearerToken(token).json({
      purpose: 'IMPACT_PROJECT_VIDEO',
      mimeType: 'video/mp4',
      fileSizeBytes: 1024,
    })

    response.assertStatus(422)
    response.assertBodyContains({ code: 'E_VALIDATION_ERROR' })
  })
})

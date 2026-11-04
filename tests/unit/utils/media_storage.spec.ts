import { MediaAssetStatus } from '#enums/media_asset/media_asset_status'
import { Provider } from '#enums/media_asset/provider'
import type MediaAsset from '#models/media_asset'
import env from '#start/env'
import { mediaAssetUrl } from '#utils/media_asset_url'
import { mediaDiskFor, mediaStorageTarget } from '#utils/media_storage'
import { publicMediaDisk } from '#utils/storage'
import { test } from '@japa/runner'

function asset(overrides: Partial<MediaAsset>): MediaAsset {
  return {
    provider: Provider.S3,
    bucket: 'missionapp-test-public-assets',
    fileKey: 'posts/images/u/a.webp',
    status: MediaAssetStatus.READY,
    ...overrides,
  } as MediaAsset
}

test.group('Storage de mídia', () => {
  test('mídia vai para o disco público do provedor de DRIVE_DISK ({driveDisk})')
    .with([
      { driveDisk: 's3_public', expected: 's3_public' },
      { driveDisk: 's3_private', expected: 's3_public' },
      { driveDisk: 'r2_public', expected: 'r2_public' },
      { driveDisk: 'r2_private', expected: 'r2_public' },
    ])
    .run(({ assert }, { driveDisk, expected }) => {
      assert.equal(publicMediaDisk(driveDisk), expected)
    })

  test('no ambiente de teste grava no bucket público do MinIO', ({ assert }) => {
    assert.deepEqual(mediaStorageTarget(), {
      disk: 's3_public',
      provider: Provider.S3,
      bucket: env.get('S3_PUBLIC_BUCKET'),
    })
  })

  test('cada asset é lido no disco do provedor em que foi gravado', ({ assert }) => {
    assert.equal(mediaDiskFor({ provider: Provider.S3 }), 's3_public')
    assert.equal(mediaDiskFor({ provider: Provider.R2 }), 'r2_public')
  })
})

test.group('mediaAssetUrl', () => {
  test('S3/MinIO: endpoint, bucket e chave (path-style)', ({ assert }) => {
    assert.equal(
      mediaAssetUrl(asset({})),
      `${env.get('S3_ENDPOINT')}/missionapp-test-public-assets/posts/images/u/a.webp`
    )
  })

  test('R2: domínio público, sem o bucket', ({ assert }) => {
    assert.equal(
      mediaAssetUrl(asset({ provider: Provider.R2 })),
      `${env.get('R2_PUBLIC_URL')!.replace(/\/+$/, '')}/posts/images/u/a.webp`
    )
  })

  test('sem URL enquanto o arquivo não está pronto ({status})')
    .with([
      { status: MediaAssetStatus.PENDING_UPLOAD },
      { status: MediaAssetStatus.PROCESSING },
      { status: MediaAssetStatus.FAILED },
    ])
    .run(({ assert }, { status }) => {
      assert.isNull(mediaAssetUrl(asset({ status })))
    })
})

import { s3ClientConfig } from '#config/drive'
import { EnsureBucketsService } from '#services/storage/ensure_buckets_service'
import env from '#start/env'
import drive from '@adonisjs/drive/services/main'
import { S3Client } from '@aws-sdk/client-s3'
import { test } from '@japa/runner'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { v7 as uuidv7 } from 'uuid'

test.group('config/drive — discos S3 contra o MinIO real', (group) => {
  group.setup(async () => {
    const client = new S3Client(s3ClientConfig)
    await new EnsureBucketsService(client).execute({
      publicBucket: env.get('S3_PUBLIC_BUCKET'),
      privateBucket: env.get('S3_PRIVATE_BUCKET'),
    })
    client.destroy()
  })

  test('o disco padrão é o definido em DRIVE_DISK', ({ assert }) => {
    assert.strictEqual(drive.use(), drive.use(env.get('DRIVE_DISK')))
  })

  test('s3_public grava, lê e serve o arquivo por URL pública', async ({ assert, cleanup }) => {
    const disk = drive.use('s3_public')
    const key = `tests/${uuidv7()}.txt`
    cleanup(() => disk.delete(key))

    await disk.put(key, 'conteúdo público')

    assert.equal(await disk.get(key), 'conteúdo público')
    const publicUrl = await disk.getUrl(key)
    const response = await fetch(publicUrl)
    assert.equal(response.status, 200)
    assert.equal(await response.text(), 'conteúdo público')
  })

  test('s3_private só serve o arquivo por URL assinada', async ({ assert, cleanup }) => {
    const disk = drive.use('s3_private')
    const key = `tests/${uuidv7()}.txt`
    cleanup(() => disk.delete(key))

    await disk.put(key, 'conteúdo privado')

    const signedUrl = await disk.getSignedUrl(key)
    const signed = await fetch(signedUrl)
    assert.equal(signed.status, 200)
    assert.equal(await signed.text(), 'conteúdo privado')

    const unsignedUrl = `${env.get('S3_ENDPOINT')}/${env.get('S3_PRIVATE_BUCKET')}/${key}`
    const unsigned = await fetch(unsignedUrl)
    assert.equal(unsigned.status, 403)
  })
})

test.group('config/drive — opções de cada disco', () => {
  // NOTE: `DriverContract` não expõe as opções; os discos aqui são todos S3Driver
  const optionsOf = (disk: 's3_public' | 's3_private' | 'r2_public' | 'r2_private') =>
    (drive.use(disk).driver as unknown as { options: Record<string, unknown> }).options

  test('discos s3_* usam a conexão S3_* em path-style, sem ACL', ({ assert }) => {
    for (const [disk, bucket, visibility] of [
      ['s3_public', env.get('S3_PUBLIC_BUCKET'), 'public'],
      ['s3_private', env.get('S3_PRIVATE_BUCKET'), 'private'],
    ] as const) {
      assert.containSubset(optionsOf(disk), {
        endpoint: env.get('S3_ENDPOINT'),
        region: env.get('S3_REGION'),
        forcePathStyle: true,
        supportsACL: false,
        credentials: {
          accessKeyId: env.get('S3_ACCESS_KEY'),
          secretAccessKey: env.get('S3_SECRET_KEY'),
        },
        bucket,
        visibility,
      })
    }
  })

  test('discos r2_* usam a conexão R2_* com região "auto", sem ACL', ({ assert }) => {
    for (const [disk, bucket, visibility] of [
      ['r2_public', env.get('R2_PUBLIC_BUCKET'), 'public'],
      ['r2_private', env.get('R2_PRIVATE_BUCKET'), 'private'],
    ] as const) {
      assert.containSubset(optionsOf(disk), {
        endpoint: env.get('R2_ENDPOINT'),
        region: 'auto',
        supportsACL: false,
        credentials: {
          accessKeyId: env.get('R2_ACCESS_KEY'),
          secretAccessKey: env.get('R2_SECRET_KEY'),
        },
        bucket,
        visibility,
      })
    }
  })

  test('r2_public gera URLs públicas pelo R2_PUBLIC_URL; r2_private não tem cdnUrl', ({
    assert,
  }) => {
    assert.equal(optionsOf('r2_public').cdnUrl, env.get('R2_PUBLIC_URL'))
    assert.isUndefined(optionsOf('r2_private').cdnUrl)
  })
})

test.group('config/drive — validação das variáveis R2 no boot', () => {
  const R2_KEYS = [
    'R2_ENDPOINT',
    'R2_ACCESS_KEY',
    'R2_SECRET_KEY',
    'R2_PUBLIC_BUCKET',
    'R2_PRIVATE_BUCKET',
  ] as const

  /**
   * Sobe `node ace list` em um processo separado — a config do Drive é avaliada
   * uma única vez por processo, então cenários de env diferentes exigem boot novo.
   */
  async function bootWith(overrides: Record<string, string>) {
    try {
      await promisify(execFile)('node', ['ace', 'list'], {
        env: { ...process.env, NO_COLOR: '1', ...overrides },
        timeout: 30_000,
        killSignal: 'SIGKILL',
      })
      return { failed: false, output: '' }
    } catch (error) {
      const { stdout, stderr } = error as { stdout: string; stderr: string }
      return { failed: true, output: `${stdout}${stderr}` }
    }
  }

  test('falha no boot quando DRIVE_DISK=r2_* e {$self} está ausente')
    .with([...R2_KEYS])
    .run(async ({ assert }, key) => {
      const result = await bootWith({ DRIVE_DISK: 'r2_public', [key]: '' })

      assert.isTrue(result.failed)
      assert.include(result.output, `Missing environment variable "${key}"`)
    })
    .timeout(30_000)

  test('sobe normalmente sem variáveis R2 quando DRIVE_DISK=s3_*', async ({ assert }) => {
    const blankR2 = Object.fromEntries(R2_KEYS.map((key) => [key, '']))

    const result = await bootWith({ DRIVE_DISK: 's3_public', ...blankR2 })

    assert.isFalse(result.failed, result.output)
  }).timeout(30_000)
})

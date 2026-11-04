import { s3ClientConfig } from '#config/drive'
import { EnsureBucketsService } from '#services/storage/ensure_buckets_service'
import { buildPublicReadBucketPolicy } from '#utils/storage'
import {
  DeleteBucketCommand,
  GetBucketPolicyCommand,
  HeadBucketCommand,
  PutBucketCorsCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3'
import { test } from '@japa/runner'
import { v7 as uuidv7 } from 'uuid'

function uniqueBuckets() {
  const suffix = uuidv7().slice(-12)
  return {
    publicBucket: `missionapp-test-public-${suffix}`,
    privateBucket: `missionapp-test-private-${suffix}`,
  }
}

test.group('EnsureBucketsService (MinIO real)', (group) => {
  const client = new S3Client(s3ClientConfig)
  const createdBuckets: string[] = []

  group.teardown(async () => {
    for (const bucket of createdBuckets) {
      await client.send(new DeleteBucketCommand({ Bucket: bucket }))
    }
    client.destroy()
  })

  test('cria os dois buckets quando não existem', async ({ assert }) => {
    const buckets = uniqueBuckets()
    createdBuckets.push(buckets.publicBucket, buckets.privateBucket)

    const created = await new EnsureBucketsService(client).execute(buckets)

    assert.deepEqual(created, [buckets.publicBucket, buckets.privateBucket])
    await client.send(new HeadBucketCommand({ Bucket: buckets.publicBucket }))
    await client.send(new HeadBucketCommand({ Bucket: buckets.privateBucket }))
  })

  test('é idempotente — segunda execução não cria nada', async ({ assert }) => {
    const buckets = uniqueBuckets()
    createdBuckets.push(buckets.publicBucket, buckets.privateBucket)
    const service = new EnsureBucketsService(client)

    await service.execute(buckets)
    const created = await service.execute(buckets)

    assert.deepEqual(created, [])
  })

  test('aplica leitura pública só no bucket público', async ({ assert }) => {
    const buckets = uniqueBuckets()
    createdBuckets.push(buckets.publicBucket, buckets.privateBucket)

    await new EnsureBucketsService(client).execute(buckets)

    const { Policy } = await client.send(
      new GetBucketPolicyCommand({ Bucket: buckets.publicBucket })
    )
    assert.deepEqual(
      JSON.parse(Policy!).Statement[0].Action,
      JSON.parse(buildPublicReadBucketPolicy(buckets.publicBucket)).Statement[0].Action
    )
    await assert.rejects(() =>
      client.send(new GetBucketPolicyCommand({ Bucket: buckets.privateBucket }))
    )
  })
})

test.group('EnsureBucketsService (erros)', () => {
  test('propaga erros do HeadBucket que não sejam "bucket inexistente"', async ({ assert }) => {
    const sent: string[] = []
    const client = {
      send: async (command: object) => {
        sent.push(command.constructor.name)
        if (command instanceof HeadBucketCommand) {
          throw new Error('AccessDenied')
        }
      },
    } as unknown as S3Client

    await assert.rejects(
      () => new EnsureBucketsService(client).execute({ publicBucket: 'a', privateBucket: 'b' }),
      'AccessDenied'
    )
    assert.deepEqual(sent, ['HeadBucketCommand'])
  })
})

test.group('EnsureBucketsService (CORS de upload, ADR-0040)', () => {
  /** Cliente falso: os buckets existem e o CORS responde como `onCors` mandar. */
  function fakeClient(onCors: (command: PutBucketCorsCommand) => void) {
    const sent: object[] = []
    const client = {
      send: async (command: object) => {
        sent.push(command)
        if (command instanceof PutBucketCorsCommand) onCors(command)
      },
    } as unknown as S3Client
    return { client, sent }
  }

  test('libera PUT e GET do site só no bucket público', async ({ assert }) => {
    const { client, sent } = fakeClient(() => {})

    await new EnsureBucketsService(client).execute({
      publicBucket: 'publico',
      privateBucket: 'privado',
      uploadOrigins: ['https://app.missionapp.test'],
    })

    const cors = sent.filter((command) => command instanceof PutBucketCorsCommand)
    assert.lengthOf(cors, 1)
    const input = (cors[0] as PutBucketCorsCommand).input
    assert.equal(input.Bucket, 'publico')
    assert.deepEqual(input.CORSConfiguration!.CORSRules![0], {
      AllowedOrigins: ['https://app.missionapp.test'],
      AllowedMethods: ['PUT', 'GET'],
      AllowedHeaders: ['Content-Type', 'Content-Length'],
      ExposeHeaders: ['ETag'],
      MaxAgeSeconds: 3600,
    })
  })

  test('sem origens não mexe no CORS', async ({ assert }) => {
    const { client, sent } = fakeClient(() => {})

    await new EnsureBucketsService(client).execute({ publicBucket: 'a', privateBucket: 'b' })
    await new EnsureBucketsService(client).execute({
      publicBucket: 'a',
      privateBucket: 'b',
      uploadOrigins: [],
    })

    assert.isFalse(sent.some((command) => command instanceof PutBucketCorsCommand))
  })

  test('storage sem CORS por bucket (MinIO) não é erro', async ({ assert }) => {
    const { client } = fakeClient(() => {
      throw new S3ServiceException({
        name: 'NotImplemented',
        $fault: 'server',
        $metadata: { httpStatusCode: 501 },
        message: 'A header you provided implies functionality that is not implemented',
      })
    })

    await assert.doesNotReject(() =>
      new EnsureBucketsService(client).execute({
        publicBucket: 'a',
        privateBucket: 'b',
        uploadOrigins: ['https://app.missionapp.test'],
      })
    )
  })

  test('propaga outras falhas ao aplicar o CORS', async ({ assert }) => {
    const { client } = fakeClient(() => {
      throw new Error('AccessDenied')
    })

    await assert.rejects(
      () =>
        new EnsureBucketsService(client).execute({
          publicBucket: 'a',
          privateBucket: 'b',
          uploadOrigins: ['https://app.missionapp.test'],
        }),
      'AccessDenied'
    )
  })
})

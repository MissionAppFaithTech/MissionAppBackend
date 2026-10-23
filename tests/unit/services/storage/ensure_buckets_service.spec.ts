import { s3ClientConfig } from '#config/drive'
import { EnsureBucketsService } from '#services/storage/ensure_buckets_service'
import { buildPublicReadBucketPolicy } from '#utils/storage'
import {
  DeleteBucketCommand,
  GetBucketPolicyCommand,
  HeadBucketCommand,
  S3Client,
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

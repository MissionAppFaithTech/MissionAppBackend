import { EnsureBucketsService } from '#services/storage/ensure_buckets_service'
import ace from '@adonisjs/core/services/ace'
import { S3Client } from '@aws-sdk/client-s3'
import { test } from '@japa/runner'
import StorageSetup from '../../../commands/storage_setup.ts'

test.group('storage:setup', (group) => {
  group.each.setup(() => {
    ace.ui.switchMode('raw')
    return () => ace.ui.switchMode('normal')
  })

  test('provisiona os buckets do .env e termina com sucesso', async () => {
    const command = await ace.create(StorageSetup, [])
    await command.exec()

    command.assertSucceeded()
  })

  test('inicia a aplicação (precisa de env e config/drive)', ({ assert }) => {
    assert.isTrue(StorageSetup.options.startApp)
  })

  test('informa quando os buckets já existiam', async ({ cleanup }) => {
    const original = EnsureBucketsService.prototype.execute
    EnsureBucketsService.prototype.execute = async () => []
    cleanup(() => {
      EnsureBucketsService.prototype.execute = original
    })

    const command = await ace.create(StorageSetup, [])
    await command.exec()

    command.assertSucceeded()
    command.assertLog('[ green(success) ] buckets já existiam')
  })

  test('encerra o client S3 mesmo quando o provisionamento falha', async ({ assert, cleanup }) => {
    const originalExecute = EnsureBucketsService.prototype.execute
    const originalDestroy = S3Client.prototype.destroy
    let destroyed = 0
    EnsureBucketsService.prototype.execute = async () => {
      throw new Error('boom')
    }
    S3Client.prototype.destroy = function () {
      destroyed++
    }
    cleanup(() => {
      EnsureBucketsService.prototype.execute = originalExecute
      S3Client.prototype.destroy = originalDestroy
    })

    const command = await ace.create(StorageSetup, [])
    await command.exec()

    assert.equal(destroyed, 1)
  })

  test('reporta os buckets criados', async ({ cleanup }) => {
    const original = EnsureBucketsService.prototype.execute
    EnsureBucketsService.prototype.execute = async () => ['bucket-a', 'bucket-b']
    cleanup(() => {
      EnsureBucketsService.prototype.execute = original
    })

    const command = await ace.create(StorageSetup, [])
    await command.exec()

    command.assertSucceeded()
    command.assertLog('[ green(success) ] buckets criados: bucket-a, bucket-b')
  })

  test('falha com exit code 1 quando o storage está indisponível', async ({ cleanup }) => {
    const original = EnsureBucketsService.prototype.execute
    EnsureBucketsService.prototype.execute = async () => {
      throw new Error('connect ECONNREFUSED')
    }
    cleanup(() => {
      EnsureBucketsService.prototype.execute = original
    })

    const command = await ace.create(StorageSetup, [])
    await command.exec()

    command.assertFailed()
    command.assertLog('[ red(error) ] falha ao provisionar buckets: connect ECONNREFUSED', 'stderr')
  })
})

import { buildPublicReadBucketPolicy, requireEnvWhen } from '#utils/storage'
import { test } from '@japa/runner'

test.group('requireEnvWhen', () => {
  test('retorna o valor quando presente e obrigatório', ({ assert }) => {
    assert.equal(requireEnvWhen('R2_BUCKET', 'bucket-x', true), 'bucket-x')
  })

  test('retorna o valor quando presente e opcional', ({ assert }) => {
    assert.equal(requireEnvWhen('R2_BUCKET', 'bucket-x', false), 'bucket-x')
  })

  test('retorna string vazia quando ausente e opcional', ({ assert }) => {
    assert.strictEqual(requireEnvWhen('R2_BUCKET', undefined, false), '')
  })

  test('lança erro com o nome da variável quando ausente e obrigatória', ({ assert }) => {
    assert.throws(
      () => requireEnvWhen('R2_BUCKET', undefined, true),
      'Missing environment variable "R2_BUCKET"'
    )
  })

  test('trata string vazia como ausente quando obrigatória', ({ assert }) => {
    assert.throws(() => requireEnvWhen('R2_BUCKET', '', true), /R2_BUCKET/)
  })
})

test.group('buildPublicReadBucketPolicy', () => {
  test('libera apenas s3:GetObject anônimo em todos os objetos do bucket', ({ assert }) => {
    const policy = JSON.parse(buildPublicReadBucketPolicy('missionapp-dev-public-assets'))

    assert.deepEqual(policy, {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: ['arn:aws:s3:::missionapp-dev-public-assets/*'],
        },
      ],
    })
  })
})

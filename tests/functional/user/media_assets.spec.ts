import { createTestUser } from '#tests/functional/auth/helpers'
import testUtils from '@adonisjs/core/services/test_utils'
import router from '@adonisjs/core/services/router'
import { test } from '@japa/runner'

type TokensBody = { data: { accessToken: string } }
type ErrorBody = { message: string; code: string; errors?: Array<{ field: string }> }

const validAsset = {
  bucket: 'missionapp-local',
  fileKey: 'avatars/test.png',
  mimeType: 'image/png',
  fileSizeBytes: 1234,
}

async function loginToken(client: any): Promise<string> {
  const { user, password } = await createTestUser()
  const login = await client
    .post(router.builder().make('v1.auth.access_tokens.store')!)
    .json({ login: user.email, password })
  return (login.body() as TokensBody).data.accessToken
}

test.group('Media assets', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  test('registra metadata de um arquivo autenticado', async ({ client }) => {
    const { user, password } = await createTestUser()

    const login = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ login: user.email, password })

    login.assertStatus(200)
    const accessToken = (login.body() as TokensBody).data.accessToken

    const response = await client
      .post(router.builder().make('v1.media_assets.store')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({
        bucket: 'missionapp-local',
        fileKey: 'avatars/test.png',
        mimeType: 'image/png',
        fileSizeBytes: 1234,
      })

    response.assertStatus(200)
  })

  test('aceita os maiores valores que as colunas guardam ({label})')
    .with([
      { label: 'fileKey com 255 caracteres', patch: { fileKey: 'k'.repeat(255) } },
      { label: 'fileSizeBytes igual ao maior integer', patch: { fileSizeBytes: 2_147_483_647 } },
    ])
    .run(async ({ client }, { patch }) => {
      const response = await client
        .post(router.builder().make('v1.media_assets.store')!)
        .header('Authorization', `Bearer ${await loginToken(client)}`)
        .json({ ...validAsset, ...patch })

      response.assertStatus(200)
    })

  test('responde 422 em vez de 500 acima do limite da coluna ({field})')
    .with([
      { field: 'fileKey', patch: { fileKey: 'k'.repeat(256) } },
      { field: 'fileSizeBytes', patch: { fileSizeBytes: 2_147_483_648 } },
    ])
    .run(async ({ client, assert }, { field, patch }) => {
      const response = await client
        .post(router.builder().make('v1.media_assets.store')!)
        .header('Authorization', `Bearer ${await loginToken(client)}`)
        .json({ ...validAsset, ...patch })

      response.assertStatus(422)
      const error = response.body() as ErrorBody
      assert.equal(error.code, 'E_VALIDATION_ERROR')
      assert.deepInclude(
        error.errors?.map((item) => item.field),
        field
      )
    })
})

import { UserRole } from '#enums/user/user_role'
import { createTestUser } from '#tests/functional/auth/helpers'
import testUtils from '@adonisjs/core/services/test_utils'
import router from '@adonisjs/core/services/router'
import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'
import { v7 as uuidv7 } from 'uuid'

type TokensBody = { data: { accessToken: string } }
type ErrorBody = { message: string; code: string; errors?: Array<{ field: string }> }

/** Valid bodies, so only the `:id` decides the answer. */
const ROUTES = [
  { name: 'v1.missionary.admin.about.update', body: { aboutMe: 'Sobre' } },
  { name: 'v1.missionary.admin.profile.update', body: { publicEmail: 'contato@missao.org' } },
  {
    name: 'v1.missionary.admin.identity.update',
    body: { identityType: 'CPF', identityDocument: '52998224725' },
  },
  {
    name: 'v1.missionary.admin.work_address.update',
    body: {
      zip: '48900-000',
      district: 'Centro',
      city: 'Juazeiro',
      state: 'BA',
      country: 'Brasil',
    },
  },
]

async function adminToken(client: ApiClient) {
  const { user, password } = await createTestUser()
  user.role = UserRole.ADMIN
  await user.save()

  const login = await client
    .post(router.builder().make('v1.auth.access_tokens.store')!)
    .json({ login: user.email, password })
  return (login.body() as TokensBody).data.accessToken
}

test.group('Missionary admin routes - :id do alvo', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  test('responde 422 em params.id quando o :id não é UUID ({name})')
    .with(ROUTES)
    .run(async ({ client, assert }, { name, body }) => {
      const token = await adminToken(client)

      const response = await client
        .patch(router.builder().params({ id: 'nao-e-um-uuid' }).make(name)!)
        .header('Authorization', `Bearer ${token}`)
        .json(body)

      response.assertStatus(422)
      const error = response.body() as ErrorBody
      assert.equal(error.code, 'E_VALIDATION_ERROR')
      assert.deepInclude(
        error.errors?.map(({ field }) => field),
        'params.id'
      )
    })

  test('responde 404 quando o :id é válido mas não existe ({name})')
    .with(ROUTES)
    .run(async ({ client, assert }, { name, body }) => {
      const token = await adminToken(client)

      const response = await client
        .patch(router.builder().params({ id: uuidv7() }).make(name)!)
        .header('Authorization', `Bearer ${token}`)
        .json(body)

      response.assertStatus(404)
      assert.equal((response.body() as ErrorBody).code, 'E_MISSIONARY_PROFILE_NOT_FOUND')
    })
})

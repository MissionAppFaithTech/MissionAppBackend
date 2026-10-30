import User from '#models/user'
import { createTestUser } from '#tests/functional/auth/helpers'
import testUtils from '@adonisjs/core/services/test_utils'
import router from '@adonisjs/core/services/router'
import { test } from '@japa/runner'

type TokensBody = { data: { accessToken: string } }
type UserBody = { data: { user: Record<string, unknown> } }

const clearValues = [
  { label: 'null', value: null },
  { label: 'string vazia', value: '' },
]

test.group('User - profile update', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  test('atualiza dados básicos do perfil autenticado', async ({ client }) => {
    const { user, password } = await createTestUser()

    const login = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ login: user.email, password })

    const accessToken = (login.body() as TokensBody).data.accessToken

    const response = await client
      .patch(router.builder().make('v1.profile.update')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({
        fullName: 'Novo Nome',
        username: 'novo_username',
        biography: 'Biografia atualizada',
      })

    response.assertStatus(200)
  })

  test('limpa a biografia ao enviar {label} e mantém os campos omitidos')
    .with(clearValues)
    .run(async ({ client, assert }, { value }) => {
      const { user, password } = await createTestUser()
      user.biography = 'Biografia original'
      await user.save()

      const login = await client
        .post(router.builder().make('v1.auth.access_tokens.store')!)
        .json({ login: user.email, password })

      const accessToken = (login.body() as TokensBody).data.accessToken

      const response = await client
        .patch(router.builder().make('v1.profile.update')!)
        .header('Authorization', `Bearer ${accessToken}`)
        .json({ biography: value })

      response.assertStatus(200)
      const body = (response.body() as UserBody).data.user
      const persisted = await User.findOrFail(user.id)

      assert.isNull(persisted.biography)
      assert.isNull(body.biography)
      assert.equal(persisted.fullName, user.fullName)
      assert.equal(persisted.username, user.username)
      assert.equal(body.fullName, user.fullName)
      assert.equal(body.username, user.username)
    })

  test('ignora null em {$self}, que não pode ser limpo')
    .with(['fullName', 'username'] as const)
    .run(async ({ client, assert }, field) => {
      const { user, password } = await createTestUser()

      const login = await client
        .post(router.builder().make('v1.auth.access_tokens.store')!)
        .json({ login: user.email, password })

      const accessToken = (login.body() as TokensBody).data.accessToken

      const response = await client
        .patch(router.builder().make('v1.profile.update')!)
        .header('Authorization', `Bearer ${accessToken}`)
        .json({ [field]: null })

      response.assertStatus(200)
      const body = (response.body() as UserBody).data.user
      const persisted = await User.findOrFail(user.id)
      assert.equal(persisted[field], user[field])
      assert.equal(body[field], user[field])
    })
})

import Missionary from '#models/missionary'
import MissionaryAgency from '#models/missionary_agency'
import User from '#models/user'
import { createTestUser } from '#tests/functional/auth/helpers'
import { UserRole } from '#enums/user/user_role'
import testUtils from '@adonisjs/core/services/test_utils'
import router from '@adonisjs/core/services/router'
import { test } from '@japa/runner'

type TokensBody = { data: { accessToken: string } }

test.group('Missionary - profile create', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  test('converte SUPPORTER para MISSIONARY e cria perfil', async ({ client, assert }) => {
    const { user, password } = await createTestUser()
    const { user: agencyOwner } = await createTestUser()

    const agency = await MissionaryAgency.create({
      name: 'Agência Conversão',
      phoneNumber: '+5511911111111',
      userId: agencyOwner.id,
    })

    const login = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ login: user.email, password })

    const accessToken = (login.body() as TokensBody).data.accessToken

    const response = await client
      .post(router.builder().make('v1.missionary.profile.store')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({ missionaryAgencyId: agency.id })

    response.assertStatus(200)

    const missionary = await Missionary.findBy('userId', user.id)
    assert.isNotNull(missionary)
    assert.equal(missionary?.missionaryAgencyId, agency.id)

    const updatedUser = await User.findOrFail(user.id)
    assert.equal(updatedUser.role, UserRole.MISSIONARY)
  })

  test('retorna 404 quando agência missionária não existe', async ({ client }) => {
    const { user, password } = await createTestUser()

    const login = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ login: user.email, password })

    const accessToken = (login.body() as TokensBody).data.accessToken

    const response = await client
      .post(router.builder().make('v1.missionary.profile.store')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({ missionaryAgencyId: '0197412f-4e70-7f96-b6eb-84f87554bf6d' })

    response.assertStatus(404)
  })

  test('retorna 409 quando usuário já possui perfil missionário', async ({ client }) => {
    const { user, password } = await createTestUser()
    const { user: agencyOwner } = await createTestUser()

    const agency = await MissionaryAgency.create({
      name: 'Agência Duplicada',
      phoneNumber: '+5511922222222',
      userId: agencyOwner.id,
    })

    await Missionary.create({
      userId: user.id,
      missionaryAgencyId: agency.id,
    })

    const login = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ login: user.email, password })

    const accessToken = (login.body() as TokensBody).data.accessToken

    const response = await client
      .post(router.builder().make('v1.missionary.profile.store')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({ missionaryAgencyId: agency.id })

    response.assertStatus(409)
  })
})
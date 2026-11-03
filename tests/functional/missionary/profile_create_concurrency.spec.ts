import { UserRole } from '#enums/user/user_role'
import Missionary from '#models/missionary'
import MissionaryAgency from '#models/missionary_agency'
import User from '#models/user'
import { createTestUser } from '#tests/functional/auth/helpers'
import router from '@adonisjs/core/services/router'
import { test } from '@japa/runner'

type TokensBody = { data: { accessToken: string } }

const PARALLEL_CONVERSIONS = 4

/**
 * Conversões simultâneas do mesmo apoiador em missionário: uma vence e as demais
 * recebem erro tratado, nunca 500, e só um perfil é criado.
 *
 * NOTE: sem `wrapInGlobalTransaction` de propósito — a transação global prende
 * uma única conexão e serializaria os pedidos, escondendo a corrida que o
 * `FOR UPDATE` resolve. Cada teste apaga o que criou.
 */
test.group('Missionary - conversão concorrente', (group) => {
  const createdUserIds: string[] = []
  const createdAgencyIds: string[] = []

  group.each.teardown(async () => {
    // NOTE: missionários caem em cascata com o usuário; a agência só depois (RESTRICT).
    const [supporters, owners] = [createdUserIds.splice(0, 1), createdUserIds.splice(0)]
    if (supporters.length > 0) await User.query().whereIn('id', supporters).delete()
    if (createdAgencyIds.length > 0) {
      await MissionaryAgency.query().whereIn('id', createdAgencyIds.splice(0)).delete()
    }
    if (owners.length > 0) await User.query().whereIn('id', owners).delete()
  })

  test('uma conversão vence e as simultâneas recebem 409 ou 401, nunca 500', async ({
    client,
    assert,
  }) => {
    const { user, password } = await createTestUser()
    const { user: agencyOwner } = await createTestUser()
    createdUserIds.push(user.id, agencyOwner.id)
    const agency = await MissionaryAgency.create({
      name: 'Agência Concorrência',
      phoneNumber: '+5511911112222',
      userId: agencyOwner.id,
    })
    createdAgencyIds.push(agency.id)

    const login = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ login: user.email, password })
    const accessToken = (login.body() as TokensBody).data.accessToken

    const responses = await Promise.all(
      Array.from({ length: PARALLEL_CONVERSIONS }, () =>
        client
          .post(router.builder().make('v1.missionary.profile.store')!)
          .header('Authorization', `Bearer ${accessToken}`)
          .json({ missionaryAgencyId: agency.id })
      )
    )
    const statuses = responses.map((response) => response.status())

    assert.lengthOf(
      statuses.filter((status) => status === 200),
      1,
      `uma conversão vence: ${statuses}`
    )
    // NOTE: 401 quando o pedido chega depois da revogação de sessões da conversão.
    for (const status of statuses.filter((value) => value !== 200)) {
      assert.include([409, 401], status, `resposta tratada: ${statuses}`)
    }
    assert.lengthOf(await Missionary.query().where('userId', user.id), 1)
    const converted = await User.findOrFail(user.id)
    assert.equal(converted.role, UserRole.MISSIONARY)
  })
})

import { MISSIONARY_INDEXING_JOB_NAME } from '#constants/missionary_search'
import { UserRole } from '#enums/user/user_role'
import FaithCommunity from '#models/faith_community'
import Missionary from '#models/missionary'
import MissionaryAgency from '#models/missionary_agency'
import Pastor from '#models/pastor'
import User from '#models/user'
import { searchIndexingQueue } from '#queues/search_indexing_queue'
import { createTestUser, randomPassword } from '#tests/functional/auth/helpers'
import { uniqueClientIp } from '#tests/functional/missionary/helpers'
import testUtils from '@adonisjs/core/services/test_utils'
import router from '@adonisjs/core/services/router'
import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'
import { v7 as uuidv7 } from 'uuid'

type ApiBody = { data: Record<string, any> }

const PASSWORD = randomPassword()
const signupUrl = () => router.builder().make('v1.missionary_accounts.store')!

function signupPayload(overrides: Record<string, unknown> = {}) {
  return {
    fullName: 'Missionária Teste',
    username: `m_${uuidv7().replaceAll('-', '').slice(-20)}`,
    phoneNumber: '+5511912345678',
    gender: 'FEMALE',
    email: `missionaria_${uuidv7()}@example.com`,
    password: PASSWORD,
    passwordConfirmation: PASSWORD,
    birthDate: '1990-05-17',
    ...overrides,
  }
}

function signup(client: ApiClient, body: Record<string, unknown>, ip = uniqueClientIp()) {
  return client.post(signupUrl()).header('X-Forwarded-For', ip).json(body)
}

async function createAgency() {
  const { user } = await createTestUser()
  return MissionaryAgency.create({ name: `Agência ${uuidv7()}`, userId: user.id })
}

test.group('Conta - cadastro de missionário', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  test('cria conta e perfil missionário com itens do catálogo', async ({ client, assert }) => {
    const agency = await createAgency()
    const community = await FaithCommunity.create({ name: `Igreja ${uuidv7()}` })
    const payload = signupPayload({
      missionaryAgencyId: agency.id,
      faithCommunityId: community.id,
      identityType: 'CPF',
      identityDocument: '12345678909',
      aboutMe: 'Atuo com crianças no sertão.',
    })

    const response = await signup(client, payload)

    response.assertStatus(200)
    const body = (response.body() as ApiBody).data
    assert.properties(body, ['accessToken', 'refreshToken'])
    assert.equal(body.user.role, UserRole.MISSIONARY)
    assert.equal(body.user.birthDate, '1990-05-17')
    assert.deepEqual(body.missionaryAgency, { id: agency.id, name: agency.name })
    assert.deepEqual(body.faithCommunity, { id: community.id, name: community.name })
    assert.equal(body.missionary.aboutMe, 'Atuo com crianças no sertão.')
    assert.equal(body.missionary.identityType, 'CPF')
    assert.isNull(body.workAddress)

    const user = await User.findByOrFail('email', payload.email)
    assert.equal(user.birthDate?.toISODate(), '1990-05-17')
    const missionary = await Missionary.findByOrFail('userId', user.id)
    assert.equal(missionary.missionaryAgencyId, agency.id)

    // NOTE: o token já sai com role MISSIONARY — dá para usar as rotas de missionário direto
    const about = await client
      .patch(router.builder().make('v1.missionary.about.update')!)
      .header('Authorization', `Bearer ${body.accessToken}`)
      .json({ lifeVerse: 'Isaías 6:8' })
    about.assertStatus(200)

    const jobs = await searchIndexingQueue.getJobs(['waiting', 'active', 'completed'])
    const indexing = jobs.filter(
      (job) => job.name === MISSIONARY_INDEXING_JOB_NAME && job.data.email === payload.email
    )
    assert.lengthOf(indexing, 1)
  })

  test('cadastra agência e comunidade novas em nome do missionário', async ({ client, assert }) => {
    const payload = signupPayload({
      missionaryAgency: { name: `Missão Nova ${uuidv7()}`, city: 'Belém', country: 'Brasil' },
      faithCommunity: {
        name: `Igreja Nova ${uuidv7()}`,
        city: 'Belém',
        pastorName: 'Pr. Paulo',
        pastorPhone: '+5591912345678',
      },
    })

    const response = await signup(client, payload)

    response.assertStatus(200)
    const body = (response.body() as ApiBody).data
    const agency = await MissionaryAgency.findOrFail(body.missionaryAgency.id)
    const community = await FaithCommunity.findOrFail(body.faithCommunity.id)
    assert.equal(agency.userId, body.user.id)
    assert.equal(community.userId, body.user.id)
    const pastors = await Pastor.query().where('faithCommunityId', community.id)
    assert.lengthOf(pastors, 1)
    assert.equal(pastors[0].fullName, 'Pr. Paulo')
  })

  test('reaproveita a agência com o mesmo nome e cidade', async ({ client, assert }) => {
    const { user } = await createTestUser()
    const existing = await MissionaryAgency.create({
      name: `Missão Única ${uuidv7()}`,
      city: 'Manaus',
      userId: user.id,
    })

    const response = await signup(
      client,
      signupPayload({ missionaryAgency: { name: existing.name.toUpperCase(), city: 'manaus' } })
    )

    response.assertStatus(200)
    assert.equal((response.body() as ApiBody).data.missionaryAgency.id, existing.id)
  })

  test('não deixa conta nem catálogo quando uma etapa falha', async ({ client, assert }) => {
    const communityName = `Igreja Órfã ${uuidv7()}`
    const payload = signupPayload({
      missionaryAgencyId: uuidv7(),
      faithCommunity: { name: communityName },
    })

    const response = await signup(client, payload)

    response.assertStatus(422)
    assert.equal((response.body() as any).errors[0].field, 'missionaryAgencyId')
    assert.isNull(await User.findBy('email', payload.email))
    assert.isNull(await FaithCommunity.findBy('name', communityName))
  })

  test('exige exatamente uma forma de informar a agência', async ({ client, assert }) => {
    const agency = await createAgency()

    for (const extra of [
      {},
      { missionaryAgencyId: agency.id, missionaryAgency: { name: 'Outra Missão' } },
    ]) {
      const response = await signup(client, signupPayload(extra))
      response.assertStatus(422)
      assert.equal((response.body() as any).errors[0].field, 'missionaryAgencyId')
    }
  })

  test('valida data de nascimento, documento e duplicidade de e-mail', async ({
    client,
    assert,
  }) => {
    const agency = await createAgency()
    const fieldsOf = (response: { body(): unknown }) =>
      ((response.body() as any).errors as { field: string }[]).map((error) => error.field)

    const future = await signup(
      client,
      signupPayload({ missionaryAgencyId: agency.id, birthDate: '2999-01-01' })
    )
    future.assertStatus(422)
    assert.include(fieldsOf(future), 'birthDate')

    const documentOnly = await signup(
      client,
      signupPayload({ missionaryAgencyId: agency.id, identityDocument: '123' })
    )
    documentOnly.assertStatus(422)
    assert.include(fieldsOf(documentOnly), 'identityType')

    const first = signupPayload({ missionaryAgencyId: agency.id })
    const created = await signup(client, first)
    created.assertStatus(200)
    const duplicate = await signup(
      client,
      signupPayload({ missionaryAgencyId: agency.id, email: first.email })
    )
    duplicate.assertStatus(422)
    assert.include(fieldsOf(duplicate), 'email')
  })

  test('limita os cadastros por IP', async ({ client, assert }) => {
    const ip = uniqueClientIp()
    const agency = await createAgency()

    for (let attempt = 0; attempt < 10; attempt++) {
      const response = await signup(client, { missionaryAgencyId: agency.id }, ip)
      response.assertStatus(422)
    }

    const blocked = await signup(client, signupPayload({ missionaryAgencyId: agency.id }), ip)
    blocked.assertStatus(429)
    assert.isDefined(blocked.header('retry-after'))
  })
})

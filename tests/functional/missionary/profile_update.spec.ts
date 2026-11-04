import FaithCommunity from '#models/faith_community'
import Missionary from '#models/missionary'
import MissionaryAgency from '#models/missionary_agency'
import MissionaryWorkAddress from '#models/missionary_work_address'
import testUtils from '@adonisjs/core/services/test_utils'
import router from '@adonisjs/core/services/router'
import { createMissionaryTestUser } from './helpers.ts'
import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'

type TokensBody = { data: { accessToken: string } }
type MissionaryBody = { data: { missionary: Record<string, unknown> } }

async function loginAndGetAccessToken(client: ApiClient, email: string, password: string) {
  const login = await client
    .post(router.builder().make('v1.auth.access_tokens.store')!)
    .json({ login: email, password })

  return (login.body() as TokensBody).data.accessToken
}

async function createFilledMissionary() {
  const { user, password, missionary } = await createMissionaryTestUser()
  const community = await FaithCommunity.create({
    name: 'Comunidade Teste',
    phoneNumber: '+5511933344455',
    userId: user.id,
  })

  missionary.merge({
    aboutMe: 'Sobre mim original',
    missionStorySummary: 'História original',
    originLocation: 'São Paulo',
    faithCommunityId: community.id,
    prayerRequest: 'Pedido original',
    lifeVerse: 'João 3:16',
    publicEmail: 'publico@example.com',
    publicPhone: '+5511912345678',
    donationMessage: 'Mensagem original',
  })
  await missionary.save()

  return { user, password, missionary, community }
}

const aboutFields = [
  'aboutMe',
  'missionStorySummary',
  'originLocation',
  'faithCommunityId',
  'prayerRequest',
  'lifeVerse',
] as const

const publicProfileFields = ['publicEmail', 'publicPhone', 'donationMessage'] as const

const clearValues = [
  { label: 'null', value: null },
  { label: 'string vazia', value: '' },
]

test.group('Missionary - profile update', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  test('atualiza a seção sobre do missionário autenticado', async ({ client }) => {
    const { user, password } = await createMissionaryTestUser()
    const accessToken = await loginAndGetAccessToken(client, user.email, password)

    const response = await client
      .patch(router.builder().make('v1.missionary.about.update')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({ aboutMe: 'Texto sobre mim' })

    response.assertStatus(200)
  })

  test('limpa os campos da seção sobre ao enviar {label}')
    .with(clearValues)
    .run(async ({ client, assert }, { value }) => {
      const { user, password, missionary } = await createFilledMissionary()
      const accessToken = await loginAndGetAccessToken(client, user.email, password)

      const payload = Object.fromEntries(aboutFields.map((field) => [field, value]))

      const response = await client
        .patch(router.builder().make('v1.missionary.about.update')!)
        .header('Authorization', `Bearer ${accessToken}`)
        .json(payload)

      response.assertStatus(200)
      const body = (response.body() as MissionaryBody).data.missionary
      const persisted = await Missionary.findOrFail(missionary.id)

      for (const field of aboutFields) {
        assert.isNull(body[field], `${field} deveria ser null na resposta`)
        assert.isNull(persisted[field], `${field} deveria ser NULL no banco`)
      }
      assert.equal(persisted.publicEmail, 'publico@example.com')
      assert.equal(persisted.donationMessage, 'Mensagem original')
    })

  test('mantém os campos da seção sobre omitidos no payload', async ({ client, assert }) => {
    const { user, password, missionary, community } = await createFilledMissionary()
    const accessToken = await loginAndGetAccessToken(client, user.email, password)

    const response = await client
      .patch(router.builder().make('v1.missionary.about.update')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({ aboutMe: null })

    response.assertStatus(200)
    const body = (response.body() as MissionaryBody).data.missionary
    const persisted = await Missionary.findOrFail(missionary.id)

    assert.isNull(persisted.aboutMe)
    assert.isNull(body.aboutMe)
    const expected = {
      missionStorySummary: 'História original',
      originLocation: 'São Paulo',
      faithCommunityId: community.id,
      prayerRequest: 'Pedido original',
      lifeVerse: 'João 3:16',
    }
    for (const [field, value] of Object.entries(expected)) {
      assert.equal(persisted[field as keyof typeof expected], value, `${field} no banco`)
      assert.equal(body[field], value, `${field} na resposta`)
    }
  })

  test('troca a agência e grava o local de atuação pela seção sobre', async ({
    client,
    assert,
  }) => {
    const { user, password, missionary } = await createFilledMissionary()
    const accessToken = await loginAndGetAccessToken(client, user.email, password)
    const newAgency = await MissionaryAgency.create({ name: 'Nova Agência', userId: user.id })
    const workAddress = {
      zip: '24020-000',
      district: 'Centro',
      city: 'Niterói',
      state: 'RJ',
      country: 'Brasil',
    }

    const response = await client
      .patch(router.builder().make('v1.missionary.about.update')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({ missionaryAgencyId: newAgency.id, workAddress })

    response.assertStatus(200)
    const body = (response.body() as { data: Record<string, any> }).data
    assert.equal(body.missionary.missionaryAgencyId, newAgency.id)
    assert.deepEqual(body.missionaryAgency, { id: newAgency.id, name: 'Nova Agência' })
    assert.containsSubset(body.workAddress, workAddress)
    assert.equal(body.faithCommunity.name, 'Comunidade Teste')
    assert.equal(body.missionary.aboutMe, 'Sobre mim original')

    const updated = await client
      .patch(router.builder().make('v1.missionary.about.update')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({ workAddress: { ...workAddress, city: 'Maricá' } })

    updated.assertStatus(200)
    const rows = await MissionaryWorkAddress.query().where('missionaryId', missionary.id)
    assert.lengthOf(rows, 1)
    assert.equal(rows[0].city, 'Maricá')
    const persisted = await Missionary.findOrFail(missionary.id)
    assert.equal(persisted.missionaryAgencyId, newAgency.id)
  })

  test('rejeita agência inexistente e local de atuação incompleto, e ignora agência nula', async ({
    client,
    assert,
  }) => {
    const { user, password, missionary } = await createFilledMissionary()
    const accessToken = await loginAndGetAccessToken(client, user.email, password)
    const patch = (body: Record<string, unknown>) =>
      client
        .patch(router.builder().make('v1.missionary.about.update')!)
        .header('Authorization', `Bearer ${accessToken}`)
        .json(body)

    const unknownAgency = await patch({
      missionaryAgencyId: '01a1a768-27e4-72e3-9ecb-cf5c7f5ccc01',
    })
    unknownAgency.assertStatus(422)
    assert.equal((unknownAgency.body() as any).errors[0].field, 'missionaryAgencyId')

    const nullAgency = await patch({ missionaryAgencyId: null })
    nullAgency.assertStatus(200)
    const persisted = await Missionary.findOrFail(missionary.id)
    assert.equal(persisted.missionaryAgencyId, missionary.missionaryAgencyId)

    const partialAddress = await patch({ workAddress: { city: 'Niterói' } })
    partialAddress.assertStatus(422)
    assert.lengthOf(await MissionaryWorkAddress.query().where('missionaryId', missionary.id), 0)
  })

  test('limpa os campos públicos do perfil ao enviar {label}')
    .with(clearValues)
    .run(async ({ client, assert }, { value }) => {
      const { user, password, missionary } = await createFilledMissionary()
      const accessToken = await loginAndGetAccessToken(client, user.email, password)

      const payload = Object.fromEntries(publicProfileFields.map((field) => [field, value]))

      const response = await client
        .patch(router.builder().make('v1.missionary.profile.update')!)
        .header('Authorization', `Bearer ${accessToken}`)
        .json(payload)

      response.assertStatus(200)
      const body = (response.body() as MissionaryBody).data.missionary
      const persisted = await Missionary.findOrFail(missionary.id)

      for (const field of publicProfileFields) {
        assert.isNull(body[field], `${field} deveria ser null na resposta`)
        assert.isNull(persisted[field], `${field} deveria ser NULL no banco`)
      }
      assert.equal(persisted.aboutMe, 'Sobre mim original')
    })

  test('mantém os campos públicos do perfil omitidos no payload', async ({ client, assert }) => {
    const { user, password, missionary } = await createFilledMissionary()
    const accessToken = await loginAndGetAccessToken(client, user.email, password)

    const response = await client
      .patch(router.builder().make('v1.missionary.profile.update')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({ donationMessage: null })

    response.assertStatus(200)
    const body = (response.body() as MissionaryBody).data.missionary
    const persisted = await Missionary.findOrFail(missionary.id)

    assert.isNull(persisted.donationMessage)
    assert.isNull(body.donationMessage)
    assert.equal(persisted.publicEmail, 'publico@example.com')
    assert.equal(body.publicEmail, 'publico@example.com')
    assert.equal(persisted.publicPhone, '+5511912345678')
    assert.equal(body.publicPhone, '+5511912345678')
  })

  test('marca e desmarca o telefone público como WhatsApp', async ({ client, assert }) => {
    const { user, password, missionary } = await createFilledMissionary()
    const accessToken = await loginAndGetAccessToken(client, user.email, password)
    const update = (publicPhoneIsWhatsapp: boolean) =>
      client
        .patch(router.builder().make('v1.missionary.profile.update')!)
        .header('Authorization', `Bearer ${accessToken}`)
        .json({ publicPhoneIsWhatsapp })

    const initial = await Missionary.findOrFail(missionary.id)
    assert.isFalse(initial.publicPhoneIsWhatsapp)

    const enabled = await update(true)
    enabled.assertStatus(200)
    assert.isTrue((enabled.body() as MissionaryBody).data.missionary.publicPhoneIsWhatsapp)
    const afterEnable = await Missionary.findOrFail(missionary.id)
    assert.isTrue(afterEnable.publicPhoneIsWhatsapp)

    const disabled = await update(false)
    disabled.assertStatus(200)
    assert.isFalse((disabled.body() as MissionaryBody).data.missionary.publicPhoneIsWhatsapp)
    const persisted = await Missionary.findOrFail(missionary.id)
    assert.isFalse(persisted.publicPhoneIsWhatsapp)
    assert.equal(persisted.publicPhone, '+5511912345678')
  })

  test('rejeita publicPhoneIsWhatsapp que não é booleano', async ({ client }) => {
    const { user, password } = await createFilledMissionary()
    const accessToken = await loginAndGetAccessToken(client, user.email, password)

    const response = await client
      .patch(router.builder().make('v1.missionary.profile.update')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({ publicPhoneIsWhatsapp: 'talvez' })

    response.assertStatus(422)
  })
})

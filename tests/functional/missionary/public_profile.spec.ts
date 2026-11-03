import { IdentityType } from '#enums/missionary/identity_type'
import { MissionaryStatus } from '#enums/missionary/missionary_status'
import { MembershipStatus } from '#enums/user/membership_status'
import { UserRole } from '#enums/user/user_role'
import FaithCommunity from '#models/faith_community'
import MissionaryWorkAddress from '#models/missionary_work_address'
import cache from '#services/shared/cache/cache'
import env from '#start/env'
import { createMissionaryTestUser, uniqueClientIp } from '#tests/functional/missionary/helpers'
import { BFF_SECRET_HEADER, CLIENT_IP_HEADER } from '#utils/client_ip'
import testUtils from '@adonisjs/core/services/test_utils'
import router from '@adonisjs/core/services/router'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { randomBytes } from 'node:crypto'
import { v7 as uuidv7 } from 'uuid'

type PublicProfileBody = { data: { missionary: Record<string, unknown> } }
type ErrorBody = { message: string; code: string; meta?: { retryAfterSeconds?: number } }

const PER_IP_LIMIT = 60
const BFF_SERVER_BUCKET = 'rate_limit:public_profile:bff_server'

const shortUsername = (prefix = 'm') => `${prefix}_${uuidv7().replaceAll('-', '').slice(-12)}`
const profileUrl = (username: string) =>
  router.builder().params({ username }).make('v1.public.missionaries.show')!

/** Missionário aprovado, ativo, com username curto e os dados públicos preenchidos. */
async function createPublicMissionary() {
  const { user, missionary, agency } = await createMissionaryTestUser()
  user.username = shortUsername()
  user.biography = 'Missionário no sertão'
  user.membershipStatus = MembershipStatus.ACTIVE
  await user.save()

  const community = await FaithCommunity.create({
    name: 'Igreja Teste',
    phoneNumber: '+5511988887777',
    userId: user.id,
  })
  missionary.merge({
    faithCommunityId: community.id,
    aboutMe: 'Sirvo comunidades rurais.',
    missionStorySummary: 'Comecei em 2015.',
    originLocation: 'Recife - Brasil',
    prayerRequest: 'Pela equipe.',
    lifeVerse: 'Filipenses 4:13',
    identityType: IdentityType.CPF,
    identityDocument: '12345678909',
    publicEmail: 'contato@missao.test',
    publicPhone: '+5521912345678',
    publicPhoneIsWhatsapp: true,
  })
  await missionary.save()
  await MissionaryWorkAddress.create({
    missionaryId: missionary.id,
    zip: '48900-000',
    district: 'Centro',
    city: 'Juazeiro',
    state: 'BA',
    country: 'Brasil',
  })

  return { user, missionary, agency, community }
}

test.group('Perfil público de missionário (ADR-0036)', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  test('devolve só os campos públicos aprovados', async ({ client, assert }) => {
    const { user, agency, community } = await createPublicMissionary()

    const response = await client
      .get(profileUrl(user.username))
      .header('X-Forwarded-For', uniqueClientIp())

    response.assertStatus(200)
    const profile = (response.body() as PublicProfileBody).data.missionary
    assert.deepEqual(profile, {
      username: user.username,
      fullName: user.fullName,
      biography: 'Missionário no sertão',
      role: 'MISSIONARY',
      missionaryAgency: { id: agency.id, name: agency.name },
      faithCommunity: { id: community.id, name: 'Igreja Teste' },
      about: {
        aboutMe: 'Sirvo comunidades rurais.',
        missionStorySummary: 'Comecei em 2015.',
        originLocation: 'Recife - Brasil',
        prayerRequest: 'Pela equipe.',
        lifeVerse: 'Filipenses 4:13',
      },
      workLocation: { city: 'Juazeiro', state: 'BA', country: 'Brasil' },
      followersCount: 0,
      followingCount: 0,
      contact: {
        publicEmail: 'contato@missao.test',
        publicPhone: '+5521912345678',
        publicPhoneIsWhatsapp: true,
      },
    })

    // NOTE: nenhuma PII nem dado interno, em qualquer nível
    const serialized = JSON.stringify(profile)
    for (const secret of [user.email, user.phoneNumber, '12345678909', '48900-000', 'Centro']) {
      assert.notInclude(serialized, secret)
    }
  })

  test('aceita o username com maiúsculas na URL', async ({ client }) => {
    const { user } = await createPublicMissionary()

    const response = await client
      .get(profileUrl(user.username.toUpperCase()))
      .header('X-Forwarded-For', uniqueClientIp())

    response.assertStatus(200)
  })

  test('sem comunidade e endereço, os campos vêm nulos', async ({ client, assert }) => {
    const { user } = await createMissionaryTestUser()
    user.username = shortUsername()
    user.membershipStatus = MembershipStatus.ACTIVE
    await user.save()

    const response = await client
      .get(profileUrl(user.username))
      .header('X-Forwarded-For', uniqueClientIp())

    response.assertStatus(200)
    const profile = (response.body() as PublicProfileBody).data.missionary
    assert.isNotNull(profile.missionaryAgency)
    assert.isNull(profile.faithCommunity)
    assert.isNull(profile.workLocation)
  })

  test('perfis não públicos respondem o mesmo 404 de um username inexistente', async ({
    client,
    assert,
  }) => {
    const pending = await createPublicMissionary()
    pending.missionary.status = MissionaryStatus.PENDING_APPROVAL
    await pending.missionary.save()

    const inactive = await createPublicMissionary()
    inactive.user.membershipStatus = MembershipStatus.INACTIVE
    await inactive.user.save()

    const pendingEmail = await createPublicMissionary()
    pendingEmail.user.membershipStatus = MembershipStatus.PENDING_EMAIL
    await pendingEmail.user.save()

    const deleted = await createPublicMissionary()
    deleted.user.deletedAt = DateTime.now()
    await deleted.user.save()

    const supporter = await createPublicMissionary()
    supporter.user.role = UserRole.SUPPORTER
    await supporter.user.save()

    const usernames = [
      pending.user.username,
      inactive.user.username,
      pendingEmail.user.username,
      deleted.user.username,
      supporter.user.username,
      shortUsername('nobody'),
    ]

    const bodies: ErrorBody[] = []
    for (const username of usernames) {
      const response = await client
        .get(profileUrl(username))
        .header('X-Forwarded-For', uniqueClientIp())
      response.assertStatus(404)
      bodies.push(response.body() as ErrorBody)
    }

    for (const body of bodies) {
      assert.deepEqual(body, {
        message: 'Perfil de missionário não encontrado',
        code: 'E_MISSIONARY_PROFILE_NOT_FOUND',
      })
    }
  })

  test('username com formato inválido responde 422', async ({ client, assert }) => {
    const response = await client.get(profileUrl('a!')).header('X-Forwarded-For', uniqueClientIp())

    response.assertStatus(422)
    assert.equal((response.body() as ErrorBody).code, 'E_VALIDATION_ERROR')
  })
})

test.group('Perfil público de missionário - rate limit (ADR-0036)', (group) => {
  let previousSecret: string | undefined
  const secret = randomBytes(32).toString('hex')

  group.each.setup(async () => {
    previousSecret = env.get('BFF_SHARED_SECRET')
    env.set('BFF_SHARED_SECRET', secret)
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return async () => {
      env.set('BFF_SHARED_SECRET', previousSecret ?? '')
      await rollback()
    }
  })

  test('limita a 60 consultas por minuto por IP, com envelope e Retry-After', async ({
    client,
    assert,
  }) => {
    const { user } = await createPublicMissionary()
    const clientIp = uniqueClientIp()

    for (let attempt = 1; attempt <= PER_IP_LIMIT; attempt++) {
      const ok = await client.get(profileUrl(user.username)).header('X-Forwarded-For', clientIp)
      ok.assertStatus(200)
    }

    const limited = await client.get(profileUrl(user.username)).header('X-Forwarded-For', clientIp)
    limited.assertStatus(429)
    assert.equal(limited.header('retry-after'), '60')
    assert.deepEqual(limited.body() as ErrorBody, {
      message: 'Muitas consultas a perfis públicos. Tente novamente em instantes.',
      code: 'E_TOO_MANY_REQUESTS',
      meta: { retryAfterSeconds: 60 },
    })
  })

  test('o servidor do BFF sem IP de usuário tem orçamento próprio', async ({ client }) => {
    const { user } = await createPublicMissionary()
    const connectionIp = uniqueClientIp()

    for (let attempt = 1; attempt <= PER_IP_LIMIT; attempt++) {
      await client.get(profileUrl(user.username)).header('X-Forwarded-For', connectionIp)
    }
    const exhausted = await client
      .get(profileUrl(user.username))
      .header('X-Forwarded-For', connectionIp)
    exhausted.assertStatus(429)

    // NOTE: mesmo IP de conexão, mas autenticado como BFF e sem IP de usuário
    // (renderização pública cacheada no Next) — não conta no limite por IP
    const fromBffServer = await client
      .get(profileUrl(user.username))
      .header('X-Forwarded-For', connectionIp)
      .header(BFF_SECRET_HEADER, secret)
    fromBffServer.assertStatus(200)

    // NOTE: com segredo falso, volta a contar pelo IP da conexão (já esgotado)
    const forged = await client
      .get(profileUrl(user.username))
      .header('X-Forwarded-For', connectionIp)
      .header(BFF_SECRET_HEADER, randomBytes(32).toString('hex'))
    forged.assertStatus(429)
  })

  test('o BFF com IP de usuário conta no limite daquele usuário (ADR-0032)', async ({ client }) => {
    const { user } = await createPublicMissionary()
    const bffIp = uniqueClientIp()
    const visitor = uniqueClientIp()

    for (let attempt = 1; attempt <= PER_IP_LIMIT; attempt++) {
      await client
        .get(profileUrl(user.username))
        .header('X-Forwarded-For', bffIp)
        .header(BFF_SECRET_HEADER, secret)
        .header(CLIENT_IP_HEADER, visitor)
    }

    const limited = await client
      .get(profileUrl(user.username))
      .header('X-Forwarded-For', bffIp)
      .header(BFF_SECRET_HEADER, secret)
      .header(CLIENT_IP_HEADER, visitor)
    limited.assertStatus(429)

    const otherVisitor = await client
      .get(profileUrl(user.username))
      .header('X-Forwarded-For', bffIp)
      .header(BFF_SECRET_HEADER, secret)
      .header(CLIENT_IP_HEADER, uniqueClientIp())
    otherVisitor.assertStatus(200)
  })

  test('o orçamento do servidor do BFF para em 600 por minuto', async ({ client, assert }) => {
    const { user } = await createPublicMissionary()

    // NOTE: pré-carrega o contador em vez de disparar 600 requisições; a chave é
    // devolvida a 0 (com TTL curto) no fim para não afetar outras execuções.
    await cache.set(BFF_SERVER_BUCKET, '600', 60)
    try {
      const response = await client
        .get(profileUrl(user.username))
        .header('X-Forwarded-For', uniqueClientIp())
        .header(BFF_SECRET_HEADER, secret)

      response.assertStatus(429)
      assert.equal((response.body() as ErrorBody).code, 'E_TOO_MANY_REQUESTS')
    } finally {
      await cache.set(BFF_SERVER_BUCKET, '0', 1)
    }
  })
})

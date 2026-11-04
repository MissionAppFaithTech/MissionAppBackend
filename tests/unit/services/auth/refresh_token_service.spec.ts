import { createTestUser } from '#tests/functional/auth/helpers'
import { DeviceType } from '#enums/refresh_token/device_type'
import RefreshUnavailableException from '#exceptions/auth/refresh_unavailable_exception'
import RefreshToken from '#models/refresh_token'
import { RefreshTokenService } from '#services/auth/refresh_token_service'
import type { DeviceMetadata } from '#types/services/auth/refresh_token'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { createHash } from 'node:crypto'

function hashOf(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

const WEB: DeviceMetadata = { deviceType: DeviceType.WEB, deviceName: 'Chrome no macOS' }
const MOBILE: DeviceMetadata = { deviceType: DeviceType.MOBILE, deviceName: 'iPhone 15' }

/** Records blocked families instead of touching Dragonfly. */
function fakeRevocation() {
  const blocked: string[] = []
  return {
    blocked,
    blockFamily: async (familyId: string) => {
      blocked.push(familyId)
    },
  }
}

/** Marks the token as revoked `seconds` ago, to step outside the tolerance window. */
async function revokedSecondsAgo(raw: string, seconds: number) {
  await RefreshToken.query()
    .where('tokenHash', hashOf(raw))
    .update({ revokedAt: DateTime.now().minus({ seconds }) })
}

/** In-memory replacement for the Dragonfly cache, exposing what was stored. */
function memoryCache() {
  const store = new Map<string, { value: string; ttl: number }>()
  return {
    store,
    get: async (key: string) => store.get(key)?.value ?? null,
    set: async (key: string, value: string, ttl: number) => {
      store.set(key, { value, ttl })
    },
  }
}

test.group('RefreshTokenService', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  test('create() nunca persiste o valor bruto do token', async ({ assert }) => {
    const { user } = await createTestUser()
    const service = new RefreshTokenService()

    const { raw } = await service.create(user.id, WEB)
    const stored = await RefreshToken.findByOrFail('userId', user.id)

    assert.notEqual(stored.tokenHash, raw)
    assert.equal(stored.tokenHash, hashOf(raw))
  })

  test('create() persiste os metadados do dispositivo', async ({ assert }) => {
    const { user } = await createTestUser()
    const service = new RefreshTokenService()

    await service.create(user.id, MOBILE)
    const stored = await RefreshToken.findByOrFail('userId', user.id)

    assert.equal(stored.deviceType, DeviceType.MOBILE)
    assert.equal(stored.deviceName, 'iPhone 15')
  })

  test('rotate() em token inexistente lança erro', async ({ assert }) => {
    const service = new RefreshTokenService()

    await assert.rejects(() => service.rotate('token-que-nao-existe', WEB, fakeRevocation()))
  })

  test('rotate() revoga o token atual e emite um novo na mesma família', async ({ assert }) => {
    const { user } = await createTestUser()
    const service = new RefreshTokenService()

    const { raw } = await service.create(user.id, WEB)
    const original = await RefreshToken.findByOrFail('tokenHash', hashOf(raw))

    const { newRaw, familyId } = await service.rotate(raw, WEB, fakeRevocation())

    await original.refresh()
    assert.isNotNull(original.revokedAt)
    assert.equal(familyId, original.familyId)

    const rotated = await RefreshToken.findByOrFail('tokenHash', hashOf(newRaw))
    assert.equal(rotated.familyId, original.familyId)
  })

  test('reuso fora da janela de tolerância invalida toda a família', async ({ assert }) => {
    const { user } = await createTestUser()
    const service = new RefreshTokenService()

    const { raw } = await service.create(user.id, WEB)
    const revocation = fakeRevocation()
    const { newRaw, familyId } = await service.rotate(raw, WEB, revocation)
    assert.deepEqual(revocation.blocked, [])
    await revokedSecondsAgo(raw, 60)

    // NOTE: raw foi rotacionado há mais de 30 s — reutilizá-lo é sinal de roubo
    await assert.rejects(() => service.rotate(raw, WEB, revocation))

    const rotated = await RefreshToken.findByOrFail('tokenHash', hashOf(newRaw))
    assert.isNotNull(rotated.revokedAt)
    // NOTE: os access tokens da família também são bloqueados na hora
    assert.deepEqual(revocation.blocked, [familyId])
  })

  test('rotate() registra replaced_by_id apontando para o sucessor', async ({ assert }) => {
    const { user } = await createTestUser()
    const service = new RefreshTokenService()

    const { raw } = await service.create(user.id, WEB)
    const { newRaw } = await service.rotate(raw, WEB, fakeRevocation())

    const original = await RefreshToken.findByOrFail('tokenHash', hashOf(raw))
    const successor = await RefreshToken.findByOrFail('tokenHash', hashOf(newRaw))
    assert.equal(original.replacedById, successor.id)
    assert.isNull(successor.replacedById)
  })

  test('replay dentro da janela, do mesmo dispositivo, devolve o token atual', async ({
    assert,
  }) => {
    const { user } = await createTestUser()
    const service = new RefreshTokenService()
    const revocation = fakeRevocation()

    const { raw } = await service.create(user.id, WEB)
    const first = await service.rotate(raw, WEB, revocation)
    const replay = await service.rotate(raw, WEB, revocation)

    assert.equal(replay.newRaw, first.newRaw)
    assert.equal(replay.familyId, first.familyId)
    assert.deepEqual(revocation.blocked, [])
    const successor = await RefreshToken.findByOrFail('tokenHash', hashOf(first.newRaw))
    assert.isNull(successor.revokedAt)
    assert.lengthOf(await RefreshToken.query().where('familyId', first.familyId), 2)
  })

  test('replay de RT0 após RT0→RT1→RT2 devolve RT2, nunca um token consumido', async ({
    assert,
  }) => {
    const { user } = await createTestUser()
    const service = new RefreshTokenService()
    const revocation = fakeRevocation()

    const { raw: rt0 } = await service.create(user.id, WEB)
    const { newRaw: rt1 } = await service.rotate(rt0, WEB, revocation)
    const { newRaw: rt2 } = await service.rotate(rt1, WEB, revocation)

    const replay = await service.rotate(rt0, WEB, revocation)

    assert.equal(replay.newRaw, rt2)
    assert.deepEqual(revocation.blocked, [])
  })

  test('replay de outro dispositivo dentro da janela é tratado como roubo', async ({ assert }) => {
    const { user } = await createTestUser()
    const service = new RefreshTokenService()
    const revocation = fakeRevocation()

    const { raw } = await service.create(user.id, WEB)
    const { familyId } = await service.rotate(raw, WEB, revocation)

    await assert.rejects(() => service.rotate(raw, MOBILE, revocation))
    assert.deepEqual(revocation.blocked, [familyId])
  })

  test('replay após logout responde inválido sem emitir nem bloquear de novo', async ({
    assert,
  }) => {
    const { user } = await createTestUser()
    const service = new RefreshTokenService()
    const revocation = fakeRevocation()

    const { raw } = await service.create(user.id, WEB)
    const { familyId } = await service.rotate(raw, WEB, revocation)
    await service.revokeFamily(familyId, user.id)

    await assert.rejects(() => service.rotate(raw, WEB, revocation))
    assert.deepEqual(revocation.blocked, [])
    assert.lengthOf(await RefreshToken.query().where('familyId', familyId), 2)
  })

  test('replay após "sair de todos" responde inválido sem emitir', async ({ assert }) => {
    const { user } = await createTestUser()
    const service = new RefreshTokenService()
    const revocation = fakeRevocation()

    const { raw } = await service.create(user.id, WEB)
    const { familyId } = await service.rotate(raw, WEB, revocation)
    await service.revokeAllForUser(user.id)

    await assert.rejects(() => service.rotate(raw, WEB, revocation))
    assert.deepEqual(revocation.blocked, [])
    assert.lengthOf(await RefreshToken.query().where('familyId', familyId), 2)
  })

  test('replay sem a entrada no cache é tratado como roubo', async ({ assert }) => {
    const { user } = await createTestUser()
    const memory = memoryCache()
    const service = new RefreshTokenService({ cache: memory })
    const revocation = fakeRevocation()

    const { raw } = await service.create(user.id, WEB)
    const { familyId } = await service.rotate(raw, WEB, revocation)
    memory.store.clear()

    await assert.rejects(() => service.rotate(raw, WEB, revocation))
    assert.deepEqual(revocation.blocked, [familyId])
  })

  test('o cache guarda o token emitido cifrado, com TTL igual à janela', async ({ assert }) => {
    const { user } = await createTestUser()
    const memory = memoryCache()
    const service = new RefreshTokenService({ cache: memory, reuseWindowSeconds: 45 })

    const { raw } = await service.create(user.id, WEB)
    const { newRaw } = await service.rotate(raw, WEB, fakeRevocation())

    const successor = await RefreshToken.findByOrFail('tokenHash', hashOf(newRaw))
    const entry = memory.store.get(`refresh:issued:${successor.id}`)
    assert.exists(entry)
    assert.notInclude(entry!.value, newRaw)
    assert.equal(entry!.ttl, 45)
  })

  test('falha ao gravar no cache desfaz a rotação e não revoga nada', async ({ assert }) => {
    const { user } = await createTestUser()
    const broken = {
      get: async () => null,
      set: async () => {
        throw new Error('dragonfly down')
      },
    }
    const service = new RefreshTokenService({ cache: broken })
    const revocation = fakeRevocation()

    const { raw, familyId } = await service.create(user.id, WEB)

    await assert.rejects(() => service.rotate(raw, WEB, revocation), RefreshUnavailableException)

    const original = await RefreshToken.findByOrFail('tokenHash', hashOf(raw))
    assert.isNull(original.revokedAt)
    assert.isNull(original.replacedById)
    assert.lengthOf(await RefreshToken.query().where('familyId', familyId), 1)
    assert.deepEqual(revocation.blocked, [])
  })

  test('token expirado (nunca revogado) é rejeitado sem invalidar a família', async ({
    assert,
  }) => {
    const { user } = await createTestUser()
    const service = new RefreshTokenService()
    const revocation = fakeRevocation()

    const { raw } = await service.create(user.id, WEB)
    await RefreshToken.query()
      .where('tokenHash', hashOf(raw))
      .update({ expiresAt: DateTime.now().minus({ minutes: 1 }) })

    await assert.rejects(() => service.rotate(raw, WEB, revocation))
    assert.deepEqual(revocation.blocked, [])
  })

  test('revokeAllForUser() revoga todos os tokens ativos do usuário, de todas as famílias', async ({
    assert,
  }) => {
    const { user } = await createTestUser()
    const service = new RefreshTokenService()

    await service.create(user.id, WEB)
    await service.create(user.id, MOBILE)

    await service.revokeAllForUser(user.id)

    const tokens = await RefreshToken.query().where('userId', user.id)
    assert.isTrue(tokens.every((token) => token.revokedAt !== null))
  })

  test('revokeFamily() revoga apenas a família alvo, preservando outras sessões do usuário', async ({
    assert,
  }) => {
    const { user } = await createTestUser()
    const service = new RefreshTokenService()

    const web = await service.create(user.id, WEB)
    const mobile = await service.create(user.id, MOBILE)

    await service.revokeFamily(web.familyId, user.id)

    const webToken = await RefreshToken.findByOrFail('tokenHash', hashOf(web.raw))
    const mobileToken = await RefreshToken.findByOrFail('tokenHash', hashOf(mobile.raw))

    assert.isNotNull(webToken.revokedAt)
    assert.isNull(mobileToken.revokedAt)
  })

  test('revokeFamily() não revoga família de outro usuário', async ({ assert }) => {
    const { user: userA } = await createTestUser()
    const { user: userB } = await createTestUser()
    const service = new RefreshTokenService()

    const sessionA = await service.create(userA.id, WEB)

    await service.revokeFamily(sessionA.familyId, userB.id)

    const tokenA = await RefreshToken.findByOrFail('tokenHash', hashOf(sessionA.raw))
    assert.isNull(tokenA.revokedAt)
  })

  test('listActiveSessions() retorna uma sessão por família ativa', async ({ assert }) => {
    const { user } = await createTestUser()
    const service = new RefreshTokenService()

    const web = await service.create(user.id, WEB)
    await service.create(user.id, MOBILE)
    await service.rotate(web.raw, WEB, fakeRevocation()) // NOTE: rotaciona — família web continua ativa, com token novo

    const sessions = await service.listActiveSessions(user.id)

    assert.lengthOf(sessions, 2)
    assert.sameMembers(
      sessions.map((s) => s.deviceType),
      [DeviceType.WEB, DeviceType.MOBILE]
    )
  })
})

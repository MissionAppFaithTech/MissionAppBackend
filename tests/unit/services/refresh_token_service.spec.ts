import { createTestUser } from '#tests/functional/auth/helpers'
import { DeviceType } from '#enums/refresh_token/device_type'
import RefreshToken from '#models/refresh_token'
import { RefreshTokenService, type DeviceMetadata } from '#services/refresh_token_service'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'
import { createHash } from 'node:crypto'

function hashOf(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

const WEB: DeviceMetadata = { deviceType: DeviceType.WEB, deviceName: 'Chrome no macOS' }
const MOBILE: DeviceMetadata = { deviceType: DeviceType.MOBILE, deviceName: 'iPhone 15' }

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

    await assert.rejects(() => service.rotate('token-que-nao-existe', WEB))
  })

  test('rotate() revoga o token atual e emite um novo na mesma família', async ({ assert }) => {
    const { user } = await createTestUser()
    const service = new RefreshTokenService()

    const { raw } = await service.create(user.id, WEB)
    const original = await RefreshToken.findByOrFail('tokenHash', hashOf(raw))

    const { newRaw, familyId } = await service.rotate(raw, WEB)

    await original.refresh()
    assert.isNotNull(original.revokedAt)
    assert.equal(familyId, original.familyId)

    const rotated = await RefreshToken.findByOrFail('tokenHash', hashOf(newRaw))
    assert.equal(rotated.familyId, original.familyId)
  })

  test('reuso de token já revogado invalida toda a família', async ({ assert }) => {
    const { user } = await createTestUser()
    const service = new RefreshTokenService()

    const { raw } = await service.create(user.id, WEB)
    const { newRaw } = await service.rotate(raw, WEB)

    // NOTE: raw já foi revogado pela rotação acima — reutilizá-lo é sinal de roubo
    await assert.rejects(() => service.rotate(raw, WEB))

    const rotated = await RefreshToken.findByOrFail('tokenHash', hashOf(newRaw))
    assert.isNotNull(rotated.revokedAt)
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
    await service.rotate(web.raw, WEB) // NOTE: rotaciona — família web continua ativa, com token novo

    const sessions = await service.listActiveSessions(user.id)

    assert.lengthOf(sessions, 2)
    assert.sameMembers(
      sessions.map((s) => s.deviceType),
      [DeviceType.WEB, DeviceType.MOBILE]
    )
  })
})

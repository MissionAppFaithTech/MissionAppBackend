import { AuthRevocationService } from '#services/auth/auth_revocation_service'
import { v7 as uuidv7 } from 'uuid'
import { test } from '@japa/runner'

test.group('AuthRevocationService', () => {
  test('getAuthVersion() retorna 0 para usuário sem chave no Dragonfly', async ({ assert }) => {
    const service = new AuthRevocationService()
    const userId = uuidv7()

    assert.equal(await service.getAuthVersion(userId), 0)
  })

  test('bumpAuthVersion() incrementa e reflete na leitura seguinte', async ({ assert }) => {
    const service = new AuthRevocationService()
    const userId = uuidv7()

    await service.bumpAuthVersion(userId)
    await service.bumpAuthVersion(userId)

    assert.equal(await service.getAuthVersion(userId), 2)
  })

  test('blockJti() + isJtiBlocked() round-trip', async ({ assert }) => {
    const service = new AuthRevocationService()
    const jti = uuidv7()

    assert.isFalse(await service.isJtiBlocked(jti))

    await service.blockJti(jti, 60)

    assert.isTrue(await service.isJtiBlocked(jti))
  })

  test('blockJti() com ttl <= 0 é no-op', async ({ assert }) => {
    const service = new AuthRevocationService()
    const jti = uuidv7()

    await service.blockJti(jti, 0)

    assert.isFalse(await service.isJtiBlocked(jti))
  })
})

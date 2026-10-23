import { bullMQConnection, redisConnection } from '#config/redis'
import { test } from '@japa/runner'

test.group('config/redis — isolamento dos testes', () => {
  test('cache e filas dos testes usam um banco do Dragonfly diferente do de desenvolvimento', ({
    assert,
  }) => {
    // NOTE: o .env.test define REDIS_DB=1; o banco 0 é o de desenvolvimento,
    // onde um `queue:workers` local consumiria os jobs inspecionados nos testes
    assert.equal(redisConnection.db, 1)
    assert.equal(bullMQConnection.db, 1)
  })
})

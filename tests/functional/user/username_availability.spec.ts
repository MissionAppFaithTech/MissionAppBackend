import User from '#models/user'
import { Gender } from '#enums/user/gender'
import testUtils from '@adonisjs/core/services/test_utils'
import router from '@adonisjs/core/services/router'
import { test } from '@japa/runner'
import { v7 as uuidv7 } from 'uuid'

test.group('Conta - disponibilidade de username', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return async () => {
      await rollback()
    }
  })

  test('retorna disponível para username livre', async ({ client }) => {
    const username = `livre_${uuidv7().replaceAll('-', '').slice(0, 20)}`

    const response = await client.get(router.builder().make('v1.username_availability.show')!).qs({
      username,
    })

    response.assertStatus(200)
    response.assertBodyContains({ data: { available: true, username, suggestions: [] } })
  })

  test('retorna indisponível com sugestões livres para username em uso', async ({
    client,
    assert,
  }) => {
    const username = `usado_${uuidv7().replaceAll('-', '').slice(0, 18)}`

    await User.create({
      fullName: 'Usuário Existente',
      username,
      phoneNumber: '+5511912345678',
      gender: Gender.MALE,
      email: `test_${uuidv7()}@example.com`,
      passwordHash: 'password123',
    })

    const response = await client.get(router.builder().make('v1.username_availability.show')!).qs({
      username,
    })

    response.assertStatus(200)
    const body = response.body() as unknown as {
      data: { available: boolean; suggestions: string[] }
    }
    assert.isFalse(body.data.available)
    assert.isNotEmpty(body.data.suggestions)
    for (const suggestion of body.data.suggestions) {
      assert.notEqual(suggestion, username)
    }
  })

  test('rejeita username fora do formato', async ({ client }) => {
    const response = await client
      .get(router.builder().make('v1.username_availability.show')!)
      .qs({ username: 'ab' })

    response.assertStatus(422)
  })
})

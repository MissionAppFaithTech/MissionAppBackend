import MissionaryAgency from '#models/missionary_agency'
import Follower from '#models/follower'
import User from '#models/user'
import { loginAs } from '#tests/functional/media_asset/helpers'
import {
  createActiveUser,
  createFollowableMissionary,
  followUrl,
  pendingDelta,
} from '#tests/functional/user/follow_helpers'
import { test } from '@japa/runner'

const PARALLEL_REQUESTS = 5

/**
 * Cliques simultâneos no mesmo follow: uma linha só e delta só de quem mudou
 * de fato o estado.
 *
 * NOTE: sem `wrapInGlobalTransaction` de propósito — a transação global prende
 * uma única conexão e serializaria os pedidos, escondendo a corrida que o
 * unique + `ON CONFLICT DO NOTHING` resolve. Cada teste apaga o que criou.
 */
test.group('Follows - concorrência', (group) => {
  const userIds: string[] = []
  const agencyIds: string[] = []
  const agencyOwnerIds: string[] = []

  group.each.teardown(async () => {
    // NOTE: follows e missionário caem em cascata com o usuário; a agência
    // (RESTRICT) só depois, e por último quem a cadastrou
    await User.query().whereIn('id', userIds.splice(0)).delete()
    await MissionaryAgency.query().whereIn('id', agencyIds.splice(0)).delete()
    await User.query().whereIn('id', agencyOwnerIds.splice(0)).delete()
  })

  test('follows e unfollows paralelos geram uma linha e delta líquido correto', async ({
    client,
    assert,
  }) => {
    const target = await createFollowableMissionary()
    const { user, password } = await createActiveUser()
    userIds.push(target.user.id, user.id)
    agencyIds.push(target.agency.id)
    if (target.agency.userId) agencyOwnerIds.push(target.agency.userId)

    const token = await loginAs(client, user, password)

    const follows = await Promise.all(
      Array.from({ length: PARALLEL_REQUESTS }, () =>
        client.post(followUrl.store(target.user.id)).bearerToken(token)
      )
    )
    follows.forEach((response) => response.assertStatus(200))

    const rows = await Follower.query().where('followerId', user.id)
    assert.lengthOf(rows, 1)
    assert.equal(await pendingDelta('userFollowers', target.user.id), 1)

    const unfollows = await Promise.all(
      Array.from({ length: PARALLEL_REQUESTS }, () =>
        client.delete(followUrl.destroy(target.user.id)).bearerToken(token)
      )
    )
    unfollows.forEach((response) => response.assertStatus(200))

    assert.lengthOf(await Follower.query().where('followerId', user.id), 0)
    assert.equal(await pendingDelta('userFollowers', target.user.id), 0)
  })
})

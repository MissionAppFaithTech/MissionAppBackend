import { MediaAssetPurpose } from '#enums/media_asset/media_asset_purpose'
import { MediaAssetStatus } from '#enums/media_asset/media_asset_status'
import User from '#models/user'
import { createTestUser } from '#tests/functional/auth/helpers'
import {
  createTestMediaAsset,
  loginAs,
  queuedDiscardIds,
} from '#tests/functional/media_asset/helpers'
import type { ApiBody } from '#tests/functional/media_asset/helpers'
import testUtils from '@adonisjs/core/services/test_utils'
import router from '@adonisjs/core/services/router'
import { test } from '@japa/runner'

const PROFILE_PICTURE = MediaAssetPurpose.PROFILE_PICTURE

test.group('User - profile picture', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  test('define a foto de perfil e expõe a URL quando o arquivo está pronto', async ({
    client,
    assert,
  }) => {
    const { user, password } = await createTestUser()
    const accessToken = await loginAs(client, user, password)
    const picture = await createTestMediaAsset(user, PROFILE_PICTURE)

    const update = await client
      .patch(router.builder().make('v1.profile.update')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({ profilePictureId: picture.id })

    update.assertStatus(200)
    const updatedUser = (update.body() as ApiBody).data.user
    assert.equal(updatedUser.profilePictureId, picture.id)
    assert.include(updatedUser.profilePictureUrl, picture.fileKey)

    const show = await client
      .get(router.builder().make('v1.profile.show')!)
      .header('Authorization', `Bearer ${accessToken}`)

    show.assertStatus(200)
    assert.include((show.body() as ApiBody).data.user.profilePictureUrl, picture.fileKey)

    const login = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ login: user.email, password })

    assert.include((login.body() as ApiBody).data.user.profilePictureUrl, picture.fileKey)
  })

  test('aceita foto em processamento, mas sem URL até ficar pronta', async ({ client, assert }) => {
    const { user, password } = await createTestUser()
    const accessToken = await loginAs(client, user, password)
    const picture = await createTestMediaAsset(user, PROFILE_PICTURE, MediaAssetStatus.PROCESSING)

    const update = await client
      .patch(router.builder().make('v1.profile.update')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({ profilePictureId: picture.id })

    update.assertStatus(200)
    assert.equal((update.body() as ApiBody).data.user.profilePictureId, picture.id)
    assert.isNull((update.body() as ApiBody).data.user.profilePictureUrl)
  })

  test('recusa foto de outro usuário, com outra finalidade ou com upload pendente', async ({
    client,
    assert,
  }) => {
    const { user, password } = await createTestUser()
    const { user: other } = await createTestUser()
    const accessToken = await loginAs(client, user, password)
    const invalid = [
      await createTestMediaAsset(other, PROFILE_PICTURE),
      await createTestMediaAsset(user, MediaAssetPurpose.POST_IMAGE),
      await createTestMediaAsset(user, PROFILE_PICTURE, MediaAssetStatus.PENDING_UPLOAD),
    ]

    for (const asset of invalid) {
      const response = await client
        .patch(router.builder().make('v1.profile.update')!)
        .header('Authorization', `Bearer ${accessToken}`)
        .json({ profilePictureId: asset.id })

      response.assertStatus(422)
      assert.equal((response.body() as any).errors[0].field, 'profilePictureId')
    }

    const persisted = await User.findOrFail(user.id)
    assert.isNull(persisted.profilePictureId)
  })

  test('descarta a foto anterior ao trocar e ao remover', async ({ client, assert }) => {
    const { user, password } = await createTestUser()
    const accessToken = await loginAs(client, user, password)
    const first = await createTestMediaAsset(user, PROFILE_PICTURE)
    const second = await createTestMediaAsset(user, PROFILE_PICTURE)
    const patch = (profilePictureId: string | null) =>
      client
        .patch(router.builder().make('v1.profile.update')!)
        .header('Authorization', `Bearer ${accessToken}`)
        .json({ profilePictureId })

    const setFirst = await patch(first.id)
    setFirst.assertStatus(200)
    assert.notInclude(await queuedDiscardIds(), first.id)

    const sameAgain = await patch(first.id)
    sameAgain.assertStatus(200)
    assert.notInclude(await queuedDiscardIds(), first.id)

    const swapped = await patch(second.id)
    swapped.assertStatus(200)
    assert.include(await queuedDiscardIds(), first.id)

    const removed = await patch(null)
    removed.assertStatus(200)
    assert.isNull((removed.body() as ApiBody).data.user.profilePictureId)
    assert.include(await queuedDiscardIds(), second.id)
  })
})

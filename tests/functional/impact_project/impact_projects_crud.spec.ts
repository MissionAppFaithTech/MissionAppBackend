import { MediaAssetPurpose } from '#enums/media_asset/media_asset_purpose'
import { MediaAssetStatus } from '#enums/media_asset/media_asset_status'
import { UserRole } from '#enums/user/user_role'
import ImpactProject from '#models/impact_project'
import { createTestUser } from '#tests/functional/auth/helpers'
import { createTestMediaAsset } from '#tests/functional/media_asset/helpers'
import { createMissionaryTestUser } from '#tests/functional/missionary/helpers'
import testUtils from '@adonisjs/core/services/test_utils'
import router from '@adonisjs/core/services/router'
import { test } from '@japa/runner'

type TokensBody = { data: { accessToken: string } }
type ApiBody = { data: Record<string, any> }

async function loginAndGetAccessToken(login: string, password: string, client: any) {
  const response = await client
    .post(router.builder().make('v1.auth.access_tokens.store')!)
    .json({ login, password })

  return (response.body() as TokensBody).data.accessToken as string
}

test.group('Impact projects - CRUD', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  test('cria, lista, detalha, atualiza e remove projeto de impacto', async ({ client, assert }) => {
    const { user, password, missionary } = await createMissionaryTestUser()
    const accessToken = await loginAndGetAccessToken(user.email, password, client)
    const cover = await createTestMediaAsset(user, MediaAssetPurpose.IMPACT_PROJECT_COVER)

    const store = await client
      .post(router.builder().make('v1.impact_projects.store')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({
        title: 'Escola na Comunidade',
        description: 'Construção de uma escola comunitária',
        coverImageAssetId: cover.id,
      })

    store.assertStatus(200)
    const stored = (store.body() as ApiBody).data.impactProject
    assert.equal(stored.missionaryId, missionary.id)
    assert.equal(stored.coverImage.id, cover.id)
    assert.isString(stored.coverImage.url)

    const index = await client
      .get(router.builder().make('v1.impact_projects.index')!)
      .qs({ search: 'escola' })
      .header('Authorization', `Bearer ${accessToken}`)

    index.assertStatus(200)
    assert.lengthOf((index.body() as any).data, 1)

    const show = await client
      .get(router.builder().params({ id: stored.id }).make('v1.impact_projects.show')!)
      .header('Authorization', `Bearer ${accessToken}`)

    show.assertStatus(200)

    const newCover = await createTestMediaAsset(user, MediaAssetPurpose.IMPACT_PROJECT_COVER)
    const update = await client
      .patch(router.builder().params({ id: stored.id }).make('v1.impact_projects.update')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({ title: 'Escola Esperança', coverImageAssetId: newCover.id })

    update.assertStatus(200)
    const updated = (update.body() as ApiBody).data.impactProject
    assert.equal(updated.title, 'Escola Esperança')
    assert.equal(updated.coverImageAssetId, newCover.id)

    const destroy = await client
      .delete(router.builder().params({ id: stored.id }).make('v1.impact_projects.destroy')!)
      .header('Authorization', `Bearer ${accessToken}`)

    destroy.assertStatus(200)
    assert.isNull(await ImpactProject.find(stored.id))
  })

  test('retorna 409 ao criar um segundo projeto para o mesmo missionário', async ({ client }) => {
    const { user, password } = await createMissionaryTestUser()
    const accessToken = await loginAndGetAccessToken(user.email, password, client)

    for (const expectedStatus of [200, 409]) {
      const cover = await createTestMediaAsset(user, MediaAssetPurpose.IMPACT_PROJECT_COVER)
      const response = await client
        .post(router.builder().make('v1.impact_projects.store')!)
        .header('Authorization', `Bearer ${accessToken}`)
        .json({ title: 'Projeto', description: 'Descrição', coverImageAssetId: cover.id })

      response.assertStatus(expectedStatus)
    }
  })

  test('retorna 422 quando a capa pertence a outro usuário, tem outra finalidade ou não foi enviada', async ({
    client,
  }) => {
    const { user, password } = await createMissionaryTestUser()
    const accessToken = await loginAndGetAccessToken(user.email, password, client)
    const { user: stranger } = await createTestUser()

    const invalidCovers = [
      await createTestMediaAsset(stranger, MediaAssetPurpose.IMPACT_PROJECT_COVER),
      await createTestMediaAsset(user, MediaAssetPurpose.POST_IMAGE),
      await createTestMediaAsset(
        user,
        MediaAssetPurpose.IMPACT_PROJECT_COVER,
        MediaAssetStatus.PENDING_UPLOAD
      ),
    ]

    for (const cover of invalidCovers) {
      const response = await client
        .post(router.builder().make('v1.impact_projects.store')!)
        .header('Authorization', `Bearer ${accessToken}`)
        .json({ title: 'Projeto', description: 'Descrição', coverImageAssetId: cover.id })

      response.assertStatus(422)
    }
  })

  test('retorna 403 quando outro missionário tenta alterar o projeto', async ({ client }) => {
    const { user, password } = await createMissionaryTestUser()
    const ownerToken = await loginAndGetAccessToken(user.email, password, client)
    const cover = await createTestMediaAsset(user, MediaAssetPurpose.IMPACT_PROJECT_COVER)

    const store = await client
      .post(router.builder().make('v1.impact_projects.store')!)
      .header('Authorization', `Bearer ${ownerToken}`)
      .json({ title: 'Projeto', description: 'Descrição', coverImageAssetId: cover.id })

    const projectId = (store.body() as ApiBody).data.impactProject.id as string

    const { user: other, password: otherPassword } = await createMissionaryTestUser()
    const otherToken = await loginAndGetAccessToken(other.email, otherPassword, client)

    const update = await client
      .patch(router.builder().params({ id: projectId }).make('v1.impact_projects.update')!)
      .header('Authorization', `Bearer ${otherToken}`)
      .json({ title: 'Tentativa Indevida' })

    update.assertStatus(403)
  })

  test('permite que ADMIN crie projeto informando o missionário alvo', async ({ client }) => {
    const { missionary } = await createMissionaryTestUser()
    const { user: admin, password } = await createTestUser()
    admin.role = UserRole.ADMIN
    await admin.save()

    const adminToken = await loginAndGetAccessToken(admin.email, password, client)
    const cover = await createTestMediaAsset(admin, MediaAssetPurpose.IMPACT_PROJECT_COVER)

    const response = await client
      .post(router.builder().make('v1.impact_projects.store')!)
      .header('Authorization', `Bearer ${adminToken}`)
      .json({
        missionaryId: missionary.id,
        title: 'Projeto do Admin',
        description: 'Descrição',
        coverImageAssetId: cover.id,
      })

    response.assertStatus(200)
  })
})

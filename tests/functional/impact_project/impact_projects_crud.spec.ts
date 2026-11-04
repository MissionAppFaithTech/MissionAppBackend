import { MediaAssetPurpose } from '#enums/media_asset/media_asset_purpose'
import { MediaAssetStatus } from '#enums/media_asset/media_asset_status'
import { UserRole } from '#enums/user/user_role'
import ImpactProject from '#models/impact_project'
import { createTestUser } from '#tests/functional/auth/helpers'
import {
  createTestMediaAsset,
  loginAs,
  queuedDiscardIds,
} from '#tests/functional/media_asset/helpers'
import type { ApiBody } from '#tests/functional/media_asset/helpers'
import { createMissionaryTestUser } from '#tests/functional/missionary/helpers'
import router from '@adonisjs/core/services/router'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'

const url = {
  index: () => router.builder().make('v1.impact_projects.index')!,
  store: () => router.builder().make('v1.impact_projects.store')!,
  show: (id: string) => router.builder().params({ id }).make('v1.impact_projects.show')!,
  update: (id: string) => router.builder().params({ id }).make('v1.impact_projects.update')!,
  destroy: (id: string) => router.builder().params({ id }).make('v1.impact_projects.destroy')!,
}

const YOUTUBE_EMBED = 'https://www.youtube.com/embed/dQw4w9WgXcQ'

async function coverOf(user: Parameters<typeof createTestMediaAsset>[0]) {
  return createTestMediaAsset(user, MediaAssetPurpose.IMPACT_PROJECT_COVER)
}

async function coverIdOf(user: Parameters<typeof createTestMediaAsset>[0]) {
  const cover = await coverOf(user)
  return cover.id
}

test.group('Impact projects - CRUD', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  test('cria, lista, detalha, atualiza e remove projeto de impacto', async ({ client, assert }) => {
    const { user, password, missionary } = await createMissionaryTestUser()
    const token = await loginAs(client, user, password)
    const cover = await coverOf(user)

    const store = await client.post(url.store()).bearerToken(token).json({
      title: 'Escola na Comunidade',
      description: 'Construção de uma escola comunitária',
      coverImageAssetId: cover.id,
      videoUrl: 'https://youtu.be/dQw4w9WgXcQ',
    })

    store.assertStatus(200)
    const stored = (store.body() as ApiBody).data.impactProject
    assert.equal(stored.missionaryId, missionary.id)
    assert.equal(stored.coverImage.id, cover.id)
    assert.isString(stored.coverImage.url)
    // NOTE: o link colado vira o endereço de embed (RF 9.2)
    assert.equal(stored.videoUrl, YOUTUBE_EMBED)
    assert.notProperty(stored, 'videoAssetId')

    const index = await client.get(url.index()).qs({ search: 'escola' }).bearerToken(token)
    index.assertStatus(200)
    const indexBody = index.body() as ApiBody
    assert.lengthOf(indexBody.data.impactProjects, 1)
    assert.deepEqual(indexBody.meta, { nextCursor: null, hasMore: false })

    const show = await client.get(url.show(stored.id)).bearerToken(token)
    show.assertStatus(200)
    assert.equal((show.body() as ApiBody).data.impactProject.title, 'Escola na Comunidade')

    const newCover = await coverOf(user)
    const update = await client.patch(url.update(stored.id)).bearerToken(token).json({
      title: 'Escola Comunitária',
      coverImageAssetId: newCover.id,
      videoUrl: 'https://vimeo.com/76979871',
    })

    update.assertStatus(200)
    const updated = (update.body() as ApiBody).data.impactProject
    assert.equal(updated.title, 'Escola Comunitária')
    assert.equal(updated.coverImage.id, newCover.id)
    assert.equal(updated.videoUrl, 'https://player.vimeo.com/video/76979871')
    // NOTE: a capa trocada é descartada depois do commit
    assert.include(await queuedDiscardIds(), cover.id)

    const removeVideo = await client
      .patch(url.update(stored.id))
      .bearerToken(token)
      .json({ videoUrl: null })
    removeVideo.assertStatus(200)
    assert.isNull((removeVideo.body() as ApiBody).data.impactProject.videoUrl)

    const destroy = await client.delete(url.destroy(stored.id)).bearerToken(token)
    destroy.assertStatus(200)
    assert.isNull(await ImpactProject.find(stored.id))
    assert.include(await queuedDiscardIds(), newCover.id)
  })

  test('permite um único projeto por missionário', async ({ client }) => {
    const { user, password } = await createMissionaryTestUser()
    const token = await loginAs(client, user, password)

    for (const expectedStatus of [200, 409]) {
      const response = await client
        .post(url.store())
        .bearerToken(token)
        .json({
          title: 'Projeto',
          description: 'Descrição',
          coverImageAssetId: await coverIdOf(user),
        })

      response.assertStatus(expectedStatus)
      if (expectedStatus === 409) {
        response.assertBodyContains({ code: 'E_IMPACT_PROJECT_ALREADY_EXISTS' })
      }
    }
  })

  test('valida os campos (RF 9.2): {label}')
    .with([
      { label: 'sem título', body: { description: 'D' } },
      { label: 'sem descrição', body: { title: 'T' } },
      { label: 'sem capa', body: { title: 'T', description: 'D' }, noCover: true },
      {
        label: 'vídeo de outro site',
        body: { title: 'T', description: 'D', videoUrl: 'https://tiktok.com/@a/video/1' },
      },
      {
        label: 'vídeo que não é link',
        body: { title: 'T', description: 'D', videoUrl: 'meu vídeo' },
      },
      { label: 'título longo demais', body: { title: 'x'.repeat(256), description: 'D' } },
    ])
    .run(async ({ client, assert }, row) => {
      const { user, password, missionary } = await createMissionaryTestUser()
      const token = await loginAs(client, user, password)
      const cover = await coverOf(user)
      const body = row.noCover ? row.body : { coverImageAssetId: cover.id, ...row.body }

      const response = await client.post(url.store()).bearerToken(token).json(body)

      response.assertStatus(422)
      response.assertBodyContains({ code: 'E_VALIDATION_ERROR' })
      assert.isNull(await ImpactProject.findBy('missionaryId', missionary.id))
    })

  test('recusa capa que não pode ser anexada: {label}')
    .with([
      { label: 'de outro usuário', otherOwner: true },
      { label: 'upload pendente', status: MediaAssetStatus.PENDING_UPLOAD },
      { label: 'imagem de post', purpose: MediaAssetPurpose.POST_IMAGE },
    ])
    .run(async ({ client }, row) => {
      const { user, password } = await createMissionaryTestUser()
      const { user: other } = await createTestUser()
      const token = await loginAs(client, user, password)
      const cover = await createTestMediaAsset(
        row.otherOwner ? other : user,
        row.purpose ?? MediaAssetPurpose.IMPACT_PROJECT_COVER,
        row.status ?? MediaAssetStatus.READY
      )

      const response = await client
        .post(url.store())
        .bearerToken(token)
        .json({ title: 'T', description: 'D', coverImageAssetId: cover.id })

      response.assertStatus(422)
      response.assertBodyContains({ code: 'E_MEDIA_ASSET_NOT_ATTACHABLE' })
    })

  test('recusa capa já usada por outro projeto', async ({ client }) => {
    const { user, password } = await createMissionaryTestUser()
    const token = await loginAs(client, user, password)
    const store = await client
      .post(url.store())
      .bearerToken(token)
      .json({ title: 'T', description: 'D', coverImageAssetId: await coverIdOf(user) })
    const projectId = (store.body() as ApiBody).data.impactProject.id as string
    const project = await ImpactProject.findOrFail(projectId)
    const used = project.coverImageAssetId

    const { user: admin, password: adminPassword } = await createTestUser()
    admin.role = UserRole.ADMIN
    await admin.save()
    const { missionary: other } = await createMissionaryTestUser()
    const adminToken = await loginAs(client, admin, adminPassword)

    const response = await client
      .post(url.store())
      .bearerToken(adminToken)
      .json({ title: 'T', description: 'D', coverImageAssetId: used, missionaryId: other.id })

    response.assertStatus(422)
  })
})

test.group('Impact projects - listagem por cursor (ADR-0033)', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  test('pagina do mais recente ao mais antigo e filtra por missionário', async ({
    client,
    assert,
  }) => {
    const tokens: string[] = []
    const missionaries: string[] = []
    for (const title of ['Projeto A', 'Projeto B', 'Projeto C']) {
      const { user, password, missionary } = await createMissionaryTestUser()
      const token = await loginAs(client, user, password)
      await client
        .post(url.store())
        .bearerToken(token)
        .json({ title, description: 'D', coverImageAssetId: await coverIdOf(user) })
      tokens.push(token)
      missionaries.push(missionary.id)
    }

    const first = await client
      .get(url.index())
      .qs({ search: 'Projeto', limit: 2 })
      .bearerToken(tokens[0])
    const firstBody = first.body() as ApiBody
    assert.deepEqual(
      firstBody.data.impactProjects.map((project: any) => project.title),
      ['Projeto C', 'Projeto B']
    )
    assert.isTrue(firstBody.meta!.hasMore)

    const second = await client
      .get(url.index())
      .qs({ search: 'Projeto', limit: 2, cursor: firstBody.meta!.nextCursor })
      .bearerToken(tokens[0])
    assert.deepEqual(
      (second.body() as ApiBody).data.impactProjects.map((project: any) => project.title),
      ['Projeto A']
    )

    const filtered = await client
      .get(url.index())
      .qs({ missionaryId: missionaries[1] })
      .bearerToken(tokens[0])
    assert.deepEqual(
      (filtered.body() as ApiBody).data.impactProjects.map((project: any) => project.title),
      ['Projeto B']
    )
  })
})

test.group('Impact projects - permissões', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  test('outro missionário não edita nem remove o projeto', async ({ client, assert }) => {
    const { user, password } = await createMissionaryTestUser()
    const token = await loginAs(client, user, password)
    const store = await client
      .post(url.store())
      .bearerToken(token)
      .json({ title: 'Meu', description: 'D', coverImageAssetId: await coverIdOf(user) })
    const projectId = (store.body() as ApiBody).data.impactProject.id as string

    const { user: other, password: otherPassword } = await createMissionaryTestUser()
    const otherToken = await loginAs(client, other, otherPassword)

    const update = await client
      .patch(url.update(projectId))
      .bearerToken(otherToken)
      .json({ title: 'Invadido' })
    update.assertStatus(403)
    update.assertBodyContains({ code: 'E_IMPACT_PROJECT_FORBIDDEN' })

    const destroy = await client.delete(url.destroy(projectId)).bearerToken(otherToken)
    destroy.assertStatus(403)
    const unchanged = await ImpactProject.findOrFail(projectId)
    assert.equal(unchanged.title, 'Meu')
  })

  test('apoiador não cria projeto', async ({ client }) => {
    const { user, password } = await createTestUser()
    const token = await loginAs(client, user, password)

    const response = await client
      .post(url.store())
      .bearerToken(token)
      .json({ title: 'T', description: 'D', coverImageAssetId: await coverIdOf(user) })

    response.assertStatus(403)
    response.assertBodyContains({ code: 'E_MISSIONARY_PROFILE_FORBIDDEN' })
  })

  test('admin edita e remove o projeto de um missionário', async ({ client, assert }) => {
    const { user, password } = await createMissionaryTestUser()
    const token = await loginAs(client, user, password)
    const store = await client
      .post(url.store())
      .bearerToken(token)
      .json({ title: 'Projeto', description: 'D', coverImageAssetId: await coverIdOf(user) })
    const projectId = (store.body() as ApiBody).data.impactProject.id as string

    const { user: admin, password: adminPassword } = await createTestUser()
    admin.role = UserRole.ADMIN
    await admin.save()
    const adminToken = await loginAs(client, admin, adminPassword)

    const update = await client
      .patch(url.update(projectId))
      .bearerToken(adminToken)
      .json({ title: 'Revisado' })
    update.assertStatus(200)

    const destroy = await client.delete(url.destroy(projectId)).bearerToken(adminToken)
    destroy.assertStatus(200)
    assert.isNull(await ImpactProject.find(projectId))
  })

  test('responde 404 para projeto inexistente', async ({ client }) => {
    const { user, password } = await createMissionaryTestUser()
    const token = await loginAs(client, user, password)
    const missingId = '01900000-0000-7000-8000-000000000000'

    const show = await client.get(url.show(missingId)).bearerToken(token)
    const update = await client.patch(url.update(missingId)).bearerToken(token).json({ title: 'X' })
    const destroy = await client.delete(url.destroy(missingId)).bearerToken(token)

    for (const response of [show, update, destroy]) {
      response.assertStatus(404)
      response.assertBodyContains({ code: 'E_IMPACT_PROJECT_NOT_FOUND' })
    }
  })

  test('exige login', async ({ client }) => {
    const response = await client.get(url.index())

    response.assertStatus(401)
  })
})

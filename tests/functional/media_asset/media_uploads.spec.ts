import { MediaAssetPurpose } from '#enums/media_asset/media_asset_purpose'
import { MediaAssetStatus } from '#enums/media_asset/media_asset_status'
import MediaAsset from '#models/media_asset'
import { createTestUser } from '#tests/functional/auth/helpers'
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

test.group('Media uploads', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  test('reserva o asset e devolve URL pré-assinada com chave gerada pelo servidor', async ({
    client,
    assert,
  }) => {
    const { user, password } = await createTestUser()
    const accessToken = await loginAndGetAccessToken(user.email, password, client)

    const response = await client
      .post(router.builder().make('v1.media_uploads.store')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({
        purpose: MediaAssetPurpose.POST_IMAGE,
        mimeType: 'image/jpeg',
        fileSizeBytes: 2048,
      })

    response.assertStatus(200)
    const { mediaAsset, upload } = (response.body() as ApiBody).data

    assert.equal(mediaAsset.status, MediaAssetStatus.PENDING_UPLOAD)
    assert.isNull(mediaAsset.url)
    assert.match(mediaAsset.fileKey, new RegExp(`^posts/images/${user.id}/.+\\.jpg$`))
    assert.equal(upload.method, 'PUT')
    assert.include(upload.url, mediaAsset.fileKey)

    // NOTE: regressão de segurança — sem estes headers assinados o cliente
    // poderia enviar qualquer tipo/tamanho de arquivo para o bucket público
    const signedHeaders = new URL(upload.url).searchParams.get('X-Amz-SignedHeaders') ?? ''
    assert.includeMembers(signedHeaders.split(';'), ['content-type', 'content-length'])
    assert.equal(upload.headers['Content-Length'], '2048')
  })

  test('rejeita mime type não permitido para a finalidade', async ({ client }) => {
    const { user, password } = await createTestUser()
    const accessToken = await loginAndGetAccessToken(user.email, password, client)

    const response = await client
      .post(router.builder().make('v1.media_uploads.store')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({
        purpose: MediaAssetPurpose.IMPACT_PROJECT_COVER,
        mimeType: 'application/pdf',
        fileSizeBytes: 2048,
      })

    response.assertStatus(422)
  })

  test('rejeita arquivo acima do tamanho máximo', async ({ client }) => {
    const { user, password } = await createTestUser()
    const accessToken = await loginAndGetAccessToken(user.email, password, client)

    const response = await client
      .post(router.builder().make('v1.media_uploads.store')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({
        purpose: MediaAssetPurpose.POST_IMAGE,
        mimeType: 'image/png',
        fileSizeBytes: 50 * 1024 * 1024,
      })

    response.assertStatus(422)
  })

  test('confirma o upload uma única vez e só pelo autor', async ({ client, assert }) => {
    const { user, password } = await createTestUser()
    const accessToken = await loginAndGetAccessToken(user.email, password, client)

    const reserve = await client
      .post(router.builder().make('v1.media_uploads.store')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({ purpose: MediaAssetPurpose.POST_IMAGE, mimeType: 'image/png', fileSizeBytes: 10 })

    const mediaAssetId = (reserve.body() as ApiBody).data.mediaAsset.id as string
    const completionUrl = router
      .builder()
      .params({ id: mediaAssetId })
      .make('v1.media_upload_completions.store')!

    const { user: intruder, password: intruderPassword } = await createTestUser()
    const intruderToken = await loginAndGetAccessToken(intruder.email, intruderPassword, client)

    const forbidden = await client
      .post(completionUrl)
      .header('Authorization', `Bearer ${intruderToken}`)
    forbidden.assertStatus(403)

    const completion = await client
      .post(completionUrl)
      .header('Authorization', `Bearer ${accessToken}`)
    completion.assertStatus(202)

    const asset = await MediaAsset.findOrFail(mediaAssetId)
    assert.equal(asset.status, MediaAssetStatus.PROCESSING)

    const repeated = await client
      .post(completionUrl)
      .header('Authorization', `Bearer ${accessToken}`)
    repeated.assertStatus(409)
  })

  test('detalha o asset apenas para o autor', async ({ client }) => {
    const { user, password } = await createTestUser()
    const accessToken = await loginAndGetAccessToken(user.email, password, client)

    const reserve = await client
      .post(router.builder().make('v1.media_uploads.store')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({ purpose: MediaAssetPurpose.POST_IMAGE, mimeType: 'image/png', fileSizeBytes: 10 })

    const showUrl = router
      .builder()
      .params({ id: (reserve.body() as ApiBody).data.mediaAsset.id })
      .make('v1.media_assets.show')!

    const own = await client.get(showUrl).header('Authorization', `Bearer ${accessToken}`)
    own.assertStatus(200)

    const { user: other, password: otherPassword } = await createTestUser()
    const otherToken = await loginAndGetAccessToken(other.email, otherPassword, client)

    const foreign = await client.get(showUrl).header('Authorization', `Bearer ${otherToken}`)
    foreign.assertStatus(403)
  })
})

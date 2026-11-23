import { UserRole } from '#enums/user/user_role'
import FinancialConfig from '#models/financial_config'
import { createActiveMissionary, createActiveSupporter } from '#tests/functional/follower/helpers'
import { loginAs } from '#tests/functional/media_asset/helpers'
import type { ApiBody } from '#tests/functional/media_asset/helpers'
import { uniqueClientIp } from '#tests/functional/missionary/helpers'
import router from '@adonisjs/core/services/router'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'

const url = {
  own: () => router.builder().make('v1.missionary.donation_settings.show')!,
  ownUpdate: () => router.builder().make('v1.missionary.donation_settings.update')!,
  admin: (id: string) =>
    router.builder().params({ id }).make('v1.missionary.admin.donation_settings.show')!,
  adminUpdate: (id: string) =>
    router.builder().params({ id }).make('v1.missionary.admin.donation_settings.update')!,
  public: (username: string) =>
    router.builder().params({ username }).make('v1.public.missionaries.donation')!,
}

const bankTransfer = {
  bankName: 'Banco do Brasil',
  bankNumber: '001',
  agency: '1234-5',
  accountNumber: '12345-6',
  accountType: 'CHECKING',
  holderName: 'Samuel Missionário',
  holderDocument: '123.456.789-09',
}

test.group('Área de doação', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  test('começa com os dois métodos pendentes', async ({ client, assert }) => {
    const { user, password } = await createActiveMissionary()
    const token = await loginAs(client, user, password)

    const response = await client.get(url.own()).bearerToken(token)

    response.assertStatus(200)
    const settings = (response.body() as ApiBody).data.donationSettings
    assert.equal(settings.pix.status, 'PENDING')
    assert.isNull(settings.pix.key)
    assert.equal(settings.bankTransfer.status, 'PENDING')
    assert.isNull(settings.bankTransfer.agency)
  })

  test('configura Pix e transferência; grava cifrado e devolve em claro', async ({
    client,
    assert,
  }) => {
    const { user, password, missionary } = await createActiveMissionary()
    const token = await loginAs(client, user, password)

    const response = await client
      .patch(url.ownUpdate())
      .bearerToken(token)
      .json({
        donationMessage: 'Obrigado por apoiar!',
        pix: { keyType: 'CPF', key: '123.456.789-09' },
        bankTransfer,
      })

    response.assertStatus(200)
    const settings = (response.body() as ApiBody).data.donationSettings
    assert.equal(settings.donationMessage, 'Obrigado por apoiar!')
    assert.deepEqual(settings.pix, { status: 'ACTIVE', keyType: 'CPF', key: '12345678909' })
    assert.deepInclude(settings.bankTransfer, {
      status: 'ACTIVE',
      agency: '1234-5',
      accountNumber: '12345-6',
      holderDocument: '12345678909',
    })

    const row = await FinancialConfig.findByOrFail('missionaryId', missionary.id)
    for (const column of ['pixKey', 'agency', 'accountNumber', 'holderName', 'holderDocument']) {
      const stored = row[column as keyof FinancialConfig] as string
      assert.match(stored, /^financial\./, `${column} deveria estar cifrado`)
    }
    assert.notInclude(row.holderDocument, '12345678909')
    assert.equal(row.bankNumber, '001')

    const again = await client.get(url.own()).bearerToken(token)
    assert.deepEqual((again.body() as ApiBody).data.donationSettings, settings)
  })

  test('atualização parcial preserva o outro método e null volta a pendente', async ({
    client,
    assert,
  }) => {
    const { user, password } = await createActiveMissionary()
    const token = await loginAs(client, user, password)
    await client
      .patch(url.ownUpdate())
      .bearerToken(token)
      .json({ pix: { keyType: 'EMAIL', key: 'Doe@Missao.org' }, bankTransfer })

    const clearPix = await client.patch(url.ownUpdate()).bearerToken(token).json({ pix: null })

    const settings = (clearPix.body() as ApiBody).data.donationSettings
    assert.equal(settings.pix.status, 'PENDING')
    assert.isNull(settings.pix.keyType)
    assert.equal(settings.bankTransfer.status, 'ACTIVE')
  })

  test('valida a chave Pix pelo tipo: {label}')
    .with([
      { label: 'CPF curto', pix: { keyType: 'CPF', key: '123' }, ok: false },
      { label: 'CNPJ', pix: { keyType: 'CNPJ', key: '12.345.678/0001-95' }, ok: true },
      { label: 'e-mail inválido', pix: { keyType: 'EMAIL', key: 'sem-arroba' }, ok: false },
      { label: 'telefone sem DDI', pix: { keyType: 'PHONE', key: '11912345678' }, ok: false },
      { label: 'telefone E.164', pix: { keyType: 'PHONE', key: '+5511912345678' }, ok: true },
      {
        label: 'chave aleatória',
        pix: { keyType: 'RANDOM', key: '0195A1B2-C3D4-7E5F-8A9B-0C1D2E3F4A5B' },
        ok: true,
      },
      { label: 'tipo desconhecido', pix: { keyType: 'BOLETO', key: 'x' }, ok: false },
    ])
    .run(async ({ client }, row) => {
      const { user, password } = await createActiveMissionary()
      const token = await loginAs(client, user, password)

      const response = await client.patch(url.ownUpdate()).bearerToken(token).json({ pix: row.pix })

      if (row.ok) {
        response.assertStatus(200)
      } else {
        response.assertStatus(422)
        response.assertBodyContains({ code: 'E_VALIDATION_ERROR' })
      }
    })

  test('transferência exige todos os campos e documento válido: {label}')
    .with([
      { label: 'sem titular', patch: { holderName: undefined } },
      { label: 'documento com 10 dígitos', patch: { holderDocument: '1234567890' } },
      { label: 'código do banco com letras', patch: { bankNumber: 'BB1' } },
      { label: 'tipo de conta desconhecido', patch: { accountType: 'INVESTMENT' } },
    ])
    .run(async ({ client }, row) => {
      const { user, password } = await createActiveMissionary()
      const token = await loginAs(client, user, password)

      const response = await client
        .patch(url.ownUpdate())
        .bearerToken(token)
        .json({ bankTransfer: { ...bankTransfer, ...row.patch } })

      response.assertStatus(422)
      response.assertBodyContains({ code: 'E_VALIDATION_ERROR' })
    })

  test('apoiador não tem área de doação', async ({ client }) => {
    const { user, password } = await createActiveSupporter()
    const token = await loginAs(client, user, password)

    const response = await client.get(url.own()).bearerToken(token)

    response.assertStatus(403)
    response.assertBodyContains({ code: 'E_MISSIONARY_PROFILE_FORBIDDEN' })
  })

  test('administrador configura a área de outro missionário pelo id', async ({
    client,
    assert,
  }) => {
    const { missionary } = await createActiveMissionary()
    const { user: admin, password } = await createActiveSupporter()
    admin.role = UserRole.ADMIN
    await admin.save()
    const token = await loginAs(client, admin, password)

    const update = await client
      .patch(url.adminUpdate(missionary.id))
      .bearerToken(token)
      .json({ pix: { keyType: 'PHONE', key: '+5511912345678' } })
    update.assertStatus(200)

    const show = await client.get(url.admin(missionary.id)).bearerToken(token)
    assert.equal((show.body() as ApiBody).data.donationSettings.missionaryId, missionary.id)
    assert.equal((show.body() as ApiBody).data.donationSettings.pix.key, '+5511912345678')
  })

  test('leitura pública mostra só métodos ativos e mascara o CPF do titular', async ({
    client,
    assert,
  }) => {
    const { user, password } = await createActiveMissionary()
    const token = await loginAs(client, user, password)
    await client
      .patch(url.ownUpdate())
      .bearerToken(token)
      .json({ donationMessage: 'Ore por nós', bankTransfer })

    const response = await client
      .get(url.public(user.username!.toUpperCase()))
      .header('X-Forwarded-For', uniqueClientIp())

    response.assertStatus(200)
    const donation = (response.body() as ApiBody).data.donation
    assert.equal(donation.donationMessage, 'Ore por nós')
    assert.isNull(donation.pix)
    assert.equal(donation.bankTransfer.holderDocument, '***.456.789-**')
    assert.equal(donation.bankTransfer.accountNumber, '12345-6')
    assert.notProperty(donation, 'missionaryId')
  })

  test('leitura pública de username inexistente responde 404', async ({ client }) => {
    const response = await client
      .get(url.public('nao_existe_123'))
      .header('X-Forwarded-For', uniqueClientIp())

    response.assertStatus(404)
    response.assertBodyContains({ code: 'E_MISSIONARY_PROFILE_NOT_FOUND' })
  })

  test('texto cifrado copiado de outro missionário não descriptografa', async ({
    client,
    assert,
  }) => {
    const owner = await createActiveMissionary()
    const attacker = await createActiveMissionary()
    const ownerToken = await loginAs(client, owner.user, owner.password)
    const attackerToken = await loginAs(client, attacker.user, attacker.password)
    await client
      .patch(url.ownUpdate())
      .bearerToken(ownerToken)
      .json({ pix: { keyType: 'EMAIL', key: 'dono@missao.org' } })
    await client
      .patch(url.ownUpdate())
      .bearerToken(attackerToken)
      .json({ pix: { keyType: 'EMAIL', key: 'outro@missao.org' } })

    // NOTE: simula quem só tem acesso ao banco trocando a chave Pix de linha
    const ownerRow = await FinancialConfig.findByOrFail('missionaryId', owner.missionary.id)
    const attackerRow = await FinancialConfig.findByOrFail('missionaryId', attacker.missionary.id)
    attackerRow.pixKey = ownerRow.pixKey
    await attackerRow.save()

    const response = await client.get(url.own()).bearerToken(attackerToken)

    // NOTE: erro interno sai no envelope genérico de 500 (ADR-0034); o detalhe fica no log
    response.assertStatus(500)
    response.assertBodyContains({ code: 'E_INTERNAL_SERVER_ERROR' })
    assert.notInclude(JSON.stringify(response.body()), 'dono@missao.org')
  })
})

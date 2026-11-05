import Missionary from '#models/missionary'
import MissionaryAgency from '#models/missionary_agency'
import User from '#models/user'
import { createTestUser, randomPassword } from '#tests/functional/auth/helpers'
import {
  createMissionaryTestUser,
  uniqueClientIp,
  uniqueCpf,
} from '#tests/functional/missionary/helpers'
import testUtils from '@adonisjs/core/services/test_utils'
import router from '@adonisjs/core/services/router'
import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'
import { v7 as uuidv7 } from 'uuid'

type ErrorBody = { message: string; code: string; errors: { field: string; message: string }[] }
type TokensBody = { data: { accessToken: string } }

const PASSWORD = randomPassword()

function signupPayload(agencyId: string, overrides: Record<string, unknown> = {}) {
  return {
    fullName: 'Missionária Teste',
    username: `m_${uuidv7().replaceAll('-', '').slice(-20)}`,
    phoneNumber: '+5511912345678',
    gender: 'FEMALE',
    email: `missionaria_${uuidv7()}@example.com`,
    password: PASSWORD,
    passwordConfirmation: PASSWORD,
    birthDate: '1990-05-17',
    missionaryAgencyId: agencyId,
    ...overrides,
  }
}

function signup(client: ApiClient, body: Record<string, unknown>) {
  return client
    .post(router.builder().make('v1.missionary_accounts.store')!)
    .header('X-Forwarded-For', uniqueClientIp())
    .json(body)
}

async function createAgency() {
  const { user } = await createTestUser()
  return MissionaryAgency.create({ name: `Agência ${uuidv7()}`, userId: user.id })
}

function assertDocumentError(
  assert: { equal: (a: unknown, b: unknown) => void },
  body: ErrorBody,
  message: string
) {
  assert.equal(body.code, 'E_VALIDATION_ERROR')
  assert.equal(body.errors[0].field, 'identityDocument')
  assert.equal(body.errors[0].message, message)
}

const formatCpf = (cpf: string) =>
  `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`

test.group('Documento de identidade único', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  test('salva o CPF normalizado e recusa o mesmo CPF com ou sem pontuação', async ({
    client,
    assert,
  }) => {
    const agency = await createAgency()
    const cpf = uniqueCpf()

    const first = await signup(
      client,
      signupPayload(agency.id, { identityType: 'CPF', identityDocument: formatCpf(cpf) })
    )
    first.assertStatus(200)
    const saved = await Missionary.query().where('identity_document', cpf).firstOrFail()
    assert.equal(saved.identityDocument, cpf)

    const duplicate = await signup(
      client,
      signupPayload(agency.id, { identityType: 'CPF', identityDocument: cpf })
    )
    duplicate.assertStatus(422)
    assertDocumentError(assert, duplicate.body() as ErrorBody, 'Este CPF já está cadastrado.')
  })

  test('recusa o mesmo passaporte com outra caixa e pontuação', async ({ client, assert }) => {
    const agency = await createAgency()
    const passport = `FX${uuidv7().replaceAll('-', '').slice(-8).toUpperCase()}`

    const response1 = await signup(
      client,
      signupPayload(agency.id, { identityType: 'PASSPORT', identityDocument: passport })
    )
    response1.assertStatus(200)

    const duplicate = await signup(
      client,
      signupPayload(agency.id, {
        identityType: 'PASSPORT',
        identityDocument: `${passport.slice(0, 4).toLowerCase()}-${passport.slice(4)}`,
      })
    )
    duplicate.assertStatus(422)
    assertDocumentError(
      assert,
      duplicate.body() as ErrorBody,
      'Este passaporte já está cadastrado.'
    )
  })

  test('aceita passaporte de 11 dígitos e o mesmo número como CPF de outra pessoa', async ({
    client,
  }) => {
    const agency = await createAgency()
    const digits = uniqueCpf()

    const response2 = await signup(
      client,
      signupPayload(agency.id, { identityType: 'PASSPORT', identityDocument: digits })
    )
    response2.assertStatus(200)
    // NOTE: a unicidade é por tipo: passaporte estrangeiro de 11 dígitos não é CPF
    const response3 = await signup(
      client,
      signupPayload(agency.id, { identityType: 'CPF', identityDocument: digits })
    )
    response3.assertStatus(200)
  })

  test('recusa CPF que não tem 11 dígitos e documento só com pontuação', async ({
    client,
    assert,
  }) => {
    const agency = await createAgency()

    const short = await signup(
      client,
      signupPayload(agency.id, { identityType: 'CPF', identityDocument: '123.456.789' })
    )
    short.assertStatus(422)
    assertDocumentError(assert, short.body() as ErrorBody, 'Informe os 11 dígitos do CPF.')

    const empty = await signup(
      client,
      signupPayload(agency.id, { identityType: 'PASSPORT', identityDocument: '---' })
    )
    empty.assertStatus(422)
    assertDocumentError(
      assert,
      empty.body() as ErrorBody,
      'Informe o número do passaporte com letras e números.'
    )
  })

  test('não deixa trocar o documento para o de outro missionário', async ({ client, assert }) => {
    const other = await createMissionaryTestUser()
    const cpf = uniqueCpf()
    other.missionary.merge({ identityType: 'CPF' as never, identityDocument: cpf })
    await other.missionary.save()

    const { user, password } = await createMissionaryTestUser()
    const login = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ login: user.email, password })
    const accessToken = (login.body() as TokensBody).data.accessToken
    const update = (identityDocument: string) =>
      client
        .patch(router.builder().make('v1.missionary.identity.update')!)
        .header('Authorization', `Bearer ${accessToken}`)
        .json({ identityType: 'CPF', identityDocument })

    const taken = await update(formatCpf(cpf))
    taken.assertStatus(422)
    assertDocumentError(assert, taken.body() as ErrorBody, 'Este CPF já está cadastrado.')

    // O próprio documento pode ser salvo de novo.
    const own = uniqueCpf()
    const response4 = await update(own)
    response4.assertStatus(200)
    const response5 = await update(formatCpf(own))
    response5.assertStatus(200)
  })
})

/**
 * Dois cadastros simultâneos com o mesmo CPF passam pela pré-checagem; o índice
 * `uq_missionaries_identity` decide e a perdedora recebe o erro no campo.
 *
 * NOTE: sem `wrapInGlobalTransaction` — a transação global prende uma conexão e
 * serializaria os pedidos. Cada teste apaga o que criou.
 */
test.group('Documento de identidade único - concorrência', (group) => {
  const emails: string[] = []
  const agencyIds: string[] = []
  const ownerIds: string[] = []

  group.each.teardown(async () => {
    if (emails.length > 0) await User.query().whereIn('email', emails.splice(0)).delete()
    if (agencyIds.length > 0) {
      await MissionaryAgency.query().whereIn('id', agencyIds.splice(0)).delete()
    }
    if (ownerIds.length > 0) await User.query().whereIn('id', ownerIds.splice(0)).delete()
  })

  test('um cadastro vence e o outro recebe 422 no campo, nunca 500', async ({ client, assert }) => {
    const { user: owner } = await createTestUser()
    ownerIds.push(owner.id)
    const agency = await MissionaryAgency.create({ name: `Agência ${uuidv7()}`, userId: owner.id })
    agencyIds.push(agency.id)
    const cpf = uniqueCpf()
    const payloads = [1, 2, 3].map(() =>
      signupPayload(agency.id, { identityType: 'CPF', identityDocument: cpf })
    )
    emails.push(...payloads.map((payload) => payload.email))

    const responses = await Promise.all(payloads.map((payload) => signup(client, payload)))
    const statuses = responses.map((response) => response.status())

    assert.equal(statuses.filter((status) => status === 200).length, 1)
    assert.equal(statuses.filter((status) => status === 422).length, 2)
    for (const response of responses.filter((r) => r.status() === 422)) {
      assert.equal((response.body() as ErrorBody).errors[0].field, 'identityDocument')
    }
    assert.lengthOf(await Missionary.query().where('identity_document', cpf), 1)
  })
})

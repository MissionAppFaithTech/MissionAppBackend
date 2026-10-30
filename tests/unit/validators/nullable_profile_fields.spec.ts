import { updateAboutValidator } from '#validators/missionary/update_about'
import { updateProfileValidator as updateMissionaryProfileValidator } from '#validators/missionary/update_profile'
import { updateProfileValidator as updateUserProfileValidator } from '#validators/user/update_profile'
import { test } from '@japa/runner'

const aboutFields = [
  'aboutMe',
  'missionStorySummary',
  'originLocation',
  'faithCommunityId',
  'prayerRequest',
  'lifeVerse',
]
const missionaryProfileFields = ['publicEmail', 'publicPhone', 'donationMessage']

const clearValues = [
  { label: 'null', value: null },
  { label: 'string vazia', value: '' },
  { label: 'string só com espaços', value: '   ' },
]

test.group('Validators - campos opcionais anuláveis do perfil', () => {
  test('updateAboutValidator normaliza {label} para null em todos os campos')
    .with(clearValues)
    .run(async ({ assert }, { value }) => {
      const payload = Object.fromEntries(aboutFields.map((field) => [field, value]))
      const output = await updateAboutValidator.validate(payload)

      assert.deepEqual(output, Object.fromEntries(aboutFields.map((field) => [field, null])))
    })

  test('updateMissionaryProfileValidator normaliza {label} para null em todos os campos')
    .with(clearValues)
    .run(async ({ assert }, { value }) => {
      const payload = Object.fromEntries(missionaryProfileFields.map((field) => [field, value]))
      const output = await updateMissionaryProfileValidator.validate(payload)

      assert.deepEqual(
        output,
        Object.fromEntries(missionaryProfileFields.map((field) => [field, null]))
      )
    })

  test('validators omitem do output os campos ausentes no payload', async ({ assert }) => {
    assert.deepEqual(await updateAboutValidator.validate({}), {})
    assert.deepEqual(await updateMissionaryProfileValidator.validate({}), {})
    assert.deepEqual(await updateUserProfileValidator.validate({}), {})
  })

  test('updateUserProfileValidator aceita null em biography', async ({ assert }) => {
    const output = await updateUserProfileValidator.validate({ biography: null })

    assert.deepEqual(output, { biography: null })
  })

  test('updateUserProfileValidator descarta null em {$self}')
    .with(['fullName', 'username', 'profilePictureId'])
    .run(async ({ assert }, field) => {
      const output = await updateUserProfileValidator.validate({ [field]: null })

      assert.notProperty(output, field)
    })

  test('validators continuam validando valores preenchidos', async ({ assert }) => {
    await assert.rejects(() =>
      updateMissionaryProfileValidator.validate({ publicEmail: 'invalido' })
    )
    await assert.rejects(() => updateMissionaryProfileValidator.validate({ publicPhone: '123' }))
    await assert.rejects(() => updateAboutValidator.validate({ faithCommunityId: 'nao-uuid' }))
    await assert.rejects(() => updateUserProfileValidator.validate({ biography: 'a'.repeat(201) }))
  })
})

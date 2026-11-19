import { changeEmailValidator } from '#validators/user/change_email'
import { test } from '@japa/runner'
import { randomBytes } from 'node:crypto'

test.group('Validators - changeEmailValidator', () => {
  test('normaliza o novo e-mail (trim, minúsculas, gmail) e preserva a senha atual', async ({
    assert,
  }) => {
    const currentPassword = randomBytes(12).toString('base64url')
    const output = await changeEmailValidator.validate({
      email: '  Samuel.Mendonca@Googlemail.com  ',
      currentPassword,
    })

    assert.equal(output.email, 'samuel.mendonca@gmail.com')
    assert.equal(output.currentPassword, currentPassword)
  })

  test('recusa e-mail inválido ou com mais de 254 caracteres', async ({ assert }) => {
    const currentPassword = randomBytes(12).toString('base64url')

    await assert.rejects(() =>
      changeEmailValidator.validate({
        email: 'invalido-sem-dominio',
        currentPassword,
      })
    )

    const longEmail = `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(58)}.com`
    assert.lengthOf(longEmail, 255)
    await assert.rejects(() =>
      changeEmailValidator.validate({
        email: longEmail,
        currentPassword,
      })
    )
  })

  test('recusa quando currentPassword está ausente ou vazio', async ({ assert }) => {
    await assert.rejects(() =>
      changeEmailValidator.validate({
        email: 'novo@missao.org',
      })
    )

    await assert.rejects(() =>
      changeEmailValidator.validate({
        email: 'novo@missao.org',
        currentPassword: '',
      })
    )
  })
})

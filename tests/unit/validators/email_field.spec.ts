import { email } from '#validators/shared/fields/email'
import { loginValidator } from '#validators/user/login'
import { test } from '@japa/runner'
import vine from '@vinejs/vine'

const emailValidator = vine.create({ email: email() })

test.group('Validators - campo email', () => {
  test('mantém os pontos de um e-mail do Gmail ({value})')
    .with([
      { value: 'pedro.amaro.fe@gmail.com', expected: 'pedro.amaro.fe@gmail.com' },
      { value: 'Pedro.Amaro.Fe@Gmail.com', expected: 'pedro.amaro.fe@gmail.com' },
      // googlemail.com é o mesmo serviço: continua virando gmail.com, com os pontos.
      { value: '  maria.silva@googlemail.com ', expected: 'maria.silva@gmail.com' },
    ])
    .run(async ({ assert }, { value, expected }) => {
      const output = await emailValidator.validate({ email: value })
      assert.equal(output.email, expected)
    })

  test('normaliza o login com a mesma regra do cadastro', async ({ assert }) => {
    const output = await loginValidator.validate({
      login: 'Pedro.Amaro.Fe@gmail.com',
      password: 'qualquer-senha',
    })
    assert.equal(output.login, 'pedro.amaro.fe@gmail.com')
  })

  test('recusa e-mail sem @', async ({ assert }) => {
    await assert.rejects(() => emailValidator.validate({ email: 'sem-arroba' }))
  })

  test('aceita até 254 caracteres e recusa 255', async ({ assert }) => {
    // Partes do domínio com no máximo 63 caracteres: só o tamanho total muda.
    const address = (lastLabel: number) =>
      `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(lastLabel)}.com`

    assert.lengthOf(address(57), 254)
    const output = await emailValidator.validate({ email: address(57) })
    assert.equal(output.email, address(57))

    assert.lengthOf(address(58), 255)
    await assert.rejects(() => emailValidator.validate({ email: address(58) }))
  })
})

import { randomBytes } from 'node:crypto'
import { Gender } from '#enums/user/gender'
import User from '#models/user'
import { v7 as uuidv7 } from 'uuid'

/**
 * Senha aleatória gerada na execução (16 caracteres, dentro do limite de 8 a 32):
 * os testes nunca carregam senhas fixas no código.
 */
export function randomPassword(): string {
  return randomBytes(12).toString('base64url')
}

export async function createTestUser(overrides: Partial<{ email: string; password: string }> = {}) {
  const uniqueSuffix = uuidv7()
  const password = overrides.password ?? randomPassword()

  const user = await User.create({
    fullName: 'Test User',
    username: `test_${uniqueSuffix}`,
    phoneNumber: '+5511912345678',
    gender: Gender.MALE,
    email: overrides.email ?? `test_${uniqueSuffix}@example.com`,
    passwordHash: password,
  })

  return { user, password }
}

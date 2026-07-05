import { Gender } from '#enums/user/gender'
import User from '#models/user'
import { v7 as uuidv7 } from 'uuid'

export async function createTestUser(overrides: Partial<{ email: string; password: string }> = {}) {
  const uniqueSuffix = uuidv7()
  const password = overrides.password ?? 'password123'

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

import { MembershipStatus } from '#enums/user/membership_status'
import { UserRole } from '#enums/user/user_role'
import type User from '#models/user'
import { createTestUser } from '#tests/functional/auth/helpers'
import { createMissionaryTestUser } from '#tests/functional/missionary/helpers'
import { v7 as uuidv7 } from 'uuid'

/** Username dentro do limite de 32 caracteres e único por chamada. */
function shortUsername(prefix = 'u'): string {
  return `${prefix}_${uuidv7().replaceAll('-', '').slice(-12)}`
}

async function activate(user: User): Promise<void> {
  user.username = shortUsername(user.role === UserRole.MISSIONARY ? 'm' : 's')
  user.membershipStatus = MembershipStatus.ACTIVE
  await user.save()
}

/** Apoiador com conta ativa e username curto, apto a aparecer em listas. */
export async function createActiveSupporter() {
  const created = await createTestUser()
  await activate(created.user)
  return created
}

/** Missionário aprovado, com conta ativa e username curto — perfil seguível. */
export async function createActiveMissionary() {
  const created = await createMissionaryTestUser()
  await activate(created.user)
  return created
}

import { MembershipStatus } from '#enums/user/membership_status'
import { UserRole } from '#enums/user/user_role'
import type User from '#models/user'
import { CounterBufferService } from '#services/shared/counter/counter_buffer_service'
import type { CounterTargetName } from '#types/services/shared/counter_buffer'
import { createTestUser } from '#tests/functional/auth/helpers'
import { createMissionaryTestUser } from '#tests/functional/missionary/helpers'
import router from '@adonisjs/core/services/router'

export const followUrl = {
  show: (id: string) => router.builder().params({ id }).make('v1.user_follows.show')!,
  store: (id: string) => router.builder().params({ id }).make('v1.user_follows.store')!,
  destroy: (id: string) => router.builder().params({ id }).make('v1.user_follows.destroy')!,
  followers: (id: string) => router.builder().params({ id }).make('v1.followers.index')!,
  following: (id: string) => router.builder().params({ id }).make('v1.following.index')!,
}

async function activate<T extends { user: User }>(created: T): Promise<T> {
  created.user.membershipStatus = MembershipStatus.ACTIVE
  await created.user.save()
  return created
}

/** Missionário aprovado e ativo — pode ser seguido. */
export async function createFollowableMissionary() {
  return activate(await createMissionaryTestUser())
}

/** Usuário ativo com o papel pedido (apoiador por padrão). */
export async function createActiveUser(role: UserRole = UserRole.SUPPORTER) {
  const created = await createTestUser()
  created.user.role = role
  return activate(created)
}

/** Delta ainda não aplicado no banco para a entidade (0 se não houver). */
export async function pendingDelta(target: CounterTargetName, id: string): Promise<number> {
  const overlay = await new CounterBufferService().pending(target, [id])
  return overlay.get(id) ?? 0
}

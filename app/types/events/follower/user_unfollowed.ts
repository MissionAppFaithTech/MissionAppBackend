import type UserUnfollowed from '#events/follower/user_unfollowed'

/**
 * Formato do payload carregado pelo evento `UserUnfollowed` — derivado da
 * classe para evitar drift entre evento e consumidores.
 */
export type UserUnfollowedPayload = InstanceType<typeof UserUnfollowed>

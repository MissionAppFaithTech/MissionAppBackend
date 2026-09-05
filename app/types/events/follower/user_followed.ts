import type UserFollowed from '#events/follower/user_followed'

/**
 * Formato do payload carregado pelo evento `UserFollowed` — derivado da
 * classe para evitar drift entre evento e consumidores.
 */
export type UserFollowedPayload = InstanceType<typeof UserFollowed>

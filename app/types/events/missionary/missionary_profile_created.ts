import type MissionaryProfileCreated from '#events/missionary/missionary_profile_created'

/**
 * Formato do payload carregado pelo evento `MissionaryProfileCreated` —
 * derivado da classe para evitar drift entre evento e consumidores.
 */
export type MissionaryProfileCreatedPayload = InstanceType<typeof MissionaryProfileCreated>

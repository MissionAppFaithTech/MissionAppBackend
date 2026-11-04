import type MediaAssetsDiscarded from '#events/media_asset/media_assets_discarded'

/**
 * Formato do payload carregado pelo evento `MediaAssetsDiscarded` — derivado
 * da classe para evitar drift entre evento e consumidores.
 */
export type MediaAssetsDiscardedPayload = InstanceType<typeof MediaAssetsDiscarded>

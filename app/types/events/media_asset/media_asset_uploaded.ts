import type MediaAssetUploaded from '#events/media_asset/media_asset_uploaded'

/**
 * Formato do payload carregado pelo evento `MediaAssetUploaded` — derivado
 * da classe para evitar drift entre evento e consumidores.
 */
export type MediaAssetUploadedPayload = InstanceType<typeof MediaAssetUploaded>

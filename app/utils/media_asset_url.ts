import { MediaAssetStatus } from '#enums/media_asset/media_asset_status'
import type MediaAsset from '#models/media_asset'
import env from '#start/env'

/**
 * Monta a URL pública de leitura de um arquivo do storage. Calculada de
 * forma síncrona (sem passar pelo driver) para poder ser usada dentro de
 * transformers; segue o mesmo formato path-style do driver S3 configurado
 * em `config/drive.ts`.
 *
 * @param asset Asset cujo arquivo será exposto.
 * @returns URL absoluta do arquivo, ou `null` enquanto o arquivo não estiver
 * pronto (upload pendente, em compressão ou com falha).
 * @example
 * mediaAssetUrl(asset) // 'http://127.0.0.1:9000/missionapp-dev-public-assets/posts/images/…webp'
 */
export function mediaAssetUrl(asset: MediaAsset): string | null {
  if (asset.status !== MediaAssetStatus.READY) {
    return null
  }

  const base = env.get('S3_PUBLIC_URL') ?? `${env.get('S3_ENDPOINT')}/${asset.bucket}`

  return `${base.replace(/\/+$/, '')}/${asset.fileKey}`
}

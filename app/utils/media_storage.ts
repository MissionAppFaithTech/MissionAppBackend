import { Provider } from '#enums/media_asset/provider'
import type MediaAsset from '#models/media_asset'
import env from '#start/env'
import { publicMediaDisk } from '#utils/storage'
import type { PublicMediaDisk } from '#utils/storage'

/** Onde uma mídia nova é gravada: disco do Drive, provedor e bucket. */
export type MediaStorageTarget = {
  disk: PublicMediaDisk
  provider: Provider.S3 | Provider.R2
  bucket: string
}

/**
 * Destino das mídias novas: o disco público do provedor de `DRIVE_DISK`
 * (MinIO em dev e no VPS, R2 em produção).
 *
 * @returns Disco, provedor e bucket públicos em uso.
 * @example
 * mediaStorageTarget() // { disk: 's3_public', provider: 'S3', bucket: 'missionapp-dev-public-assets' }
 */
export function mediaStorageTarget(): MediaStorageTarget {
  const disk = publicMediaDisk(env.get('DRIVE_DISK'))

  return disk === 'r2_public'
    ? { disk, provider: Provider.R2, bucket: env.get('R2_PUBLIC_BUCKET') ?? '' }
    : { disk, provider: Provider.S3, bucket: env.get('S3_PUBLIC_BUCKET') }
}

/**
 * Disco do Drive onde está o arquivo de um asset, pelo provedor gravado nele.
 * Assets antigos continuam no provedor em que foram criados mesmo que
 * `DRIVE_DISK` mude.
 *
 * @param asset Asset com o provedor do arquivo.
 * @returns Disco público do provedor.
 * @example
 * mediaDiskFor(asset) // 's3_public'
 */
export function mediaDiskFor(asset: Pick<MediaAsset, 'provider'>): PublicMediaDisk {
  return asset.provider === Provider.R2 ? 'r2_public' : 's3_public'
}

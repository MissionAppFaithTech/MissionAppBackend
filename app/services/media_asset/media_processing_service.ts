import {
  COMPRESSED_IMAGE_FORMAT,
  COMPRESSED_IMAGE_QUALITY,
  MEDIA_ASSET_RULES,
} from '#constants/media_asset'
import { MediaAssetStatus } from '#enums/media_asset/media_asset_status'
import MediaAsset from '#models/media_asset'
import drive from '@adonisjs/drive/services/main'
import logger from '@adonisjs/core/services/logger'
import db from '@adonisjs/lucid/services/db'
import sharp from 'sharp'

/**
 * Executa no worker o trabalho pesado sobre arquivos já enviados ao storage:
 * validação do conteúdo real, compressão de imagens e remoção de arquivos
 * descartados. Todas as operações são idempotentes, pois o BullMQ pode
 * reentregar o mesmo job após falha.
 */
export class MediaProcessingService {
  async process(mediaAssetId: string): Promise<void> {
    const asset = await MediaAsset.find(mediaAssetId)
    if (!asset || asset.status !== MediaAssetStatus.PROCESSING || !asset.purpose) {
      return
    }

    const rules = MEDIA_ASSET_RULES[asset.purpose]
    const contentLength = await this.inspectUploadedObject(asset, rules)
    if (contentLength === null) {
      return
    }

    if (!rules.maxDimensionPx) {
      asset.merge({ fileSizeBytes: contentLength, status: MediaAssetStatus.READY })
      await asset.save()
      return
    }

    await this.compressImage(asset, rules.maxDimensionPx)
  }

  /**
   * Confere o objeto realmente gravado contra as regras da finalidade —
   * devolve o tamanho real, ou `null` quando o asset foi marcado como FAILED.
   */
  private async inspectUploadedObject(
    asset: MediaAsset,
    rules: (typeof MEDIA_ASSET_RULES)[keyof typeof MEDIA_ASSET_RULES]
  ): Promise<number | null> {
    const disk = drive.use()

    if (!(await disk.exists(asset.fileKey))) {
      await this.fail(asset, 'arquivo não encontrado no storage após confirmação do upload')
      return null
    }

    // NOTE: a assinatura da URL já prende o tamanho declarado; a conferência
    // sobre o objeto gravado é a defesa em profundidade caso ela seja contornada
    const metadata = await disk.getMetaData(asset.fileKey)
    if (metadata.contentLength > rules.maxSizeBytes) {
      await this.fail(asset, `arquivo excede ${rules.maxSizeBytes} bytes`, true)
      return null
    }

    // WARNING: arquivos sem re-encode (vídeo) são servidos como foram enviados —
    // o content-type gravado é a única barreira contra conteúdo ativo no bucket
    const contentTypeAllowed =
      !!metadata.contentType && rules.mimeTypes.includes(metadata.contentType)
    if (!rules.maxDimensionPx && !contentTypeAllowed) {
      await this.fail(asset, `content-type não permitido: ${metadata.contentType}`, true)
      return null
    }

    return metadata.contentLength
  }

  private async compressImage(asset: MediaAsset, maxDimensionPx: number): Promise<void> {
    const disk = drive.use()

    let compressed: Buffer
    try {
      // NOTE: `rotate()` aplica a orientação EXIF antes de descartá-la; o sharp
      // remove todos os metadados (inclusive GPS) por padrão na saída
      compressed = await sharp(await disk.getBytes(asset.fileKey), { failOn: 'error' })
        .rotate()
        .resize({
          width: maxDimensionPx,
          height: maxDimensionPx,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: COMPRESSED_IMAGE_QUALITY })
        .toBuffer()
    } catch {
      await this.fail(asset, 'conteúdo não é uma imagem válida', true)
      return
    }

    const originalKey = asset.fileKey
    const compressedKey = originalKey.replace(/\.[^./]+$/, `.${COMPRESSED_IMAGE_FORMAT.extension}`)

    await disk.put(compressedKey, compressed, { contentType: COMPRESSED_IMAGE_FORMAT.mimeType })

    // NOTE: o banco só aponta para a chave nova depois que ela existe no storage,
    // e o original só é apagado depois — nenhum leitor vê uma chave inexistente
    asset.merge({
      fileKey: compressedKey,
      mimeType: COMPRESSED_IMAGE_FORMAT.mimeType,
      fileSizeBytes: compressed.byteLength,
      status: MediaAssetStatus.READY,
    })
    await asset.save()

    if (compressedKey !== originalKey) {
      await disk.delete(originalKey)
    }
  }

  async deleteMany(mediaAssetIds: string[]): Promise<void> {
    const assets = await MediaAsset.query().whereIn('id', mediaAssetIds)
    const disk = drive.use()

    for (const asset of assets) {
      const trx = await db.transaction()

      try {
        asset.useTransaction(trx)
        await asset.delete()
      } catch (error) {
        await trx.rollback()
        // WARNING: FK RESTRICT — o asset voltou a ser referenciado entre o
        // descarte e a execução do job; apagar o objeto aqui quebraria o recurso
        logger.warn({ err: error, mediaAssetId: asset.id }, 'asset descartado ainda referenciado')
        continue
      }

      // NOTE: o registro só é removido de fato se o objeto também for — falha no
      // storage desfaz o delete e o retry do job encontra o asset de novo
      try {
        await disk.delete(asset.fileKey)
        await trx.commit()
      } catch (error) {
        await trx.rollback()
        throw error
      }
    }
  }

  private async fail(asset: MediaAsset, reason: string, deleteObject = false): Promise<void> {
    logger.warn({ mediaAssetId: asset.id, reason }, 'processamento de arquivo falhou')

    asset.status = MediaAssetStatus.FAILED
    await asset.save()

    if (deleteObject) {
      await drive.use().delete(asset.fileKey)
    }
  }
}

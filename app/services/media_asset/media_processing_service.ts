import {
  COMPRESSED_IMAGE_FORMAT,
  COMPRESSED_IMAGE_QUALITY,
  MEDIA_ASSET_RULES,
} from '#constants/media_asset'
import { MediaAssetStatus } from '#enums/media_asset/media_asset_status'
import MediaAsset from '#models/media_asset'
import { mediaDiskFor } from '#utils/media_storage'
import { isForeignKeyViolation } from '#utils/postgres_errors'
import drive from '@adonisjs/drive/services/main'
import logger from '@adonisjs/core/services/logger'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import sharp from 'sharp'

/**
 * Chave da imagem comprimida. É sempre diferente da chave autorizada no upload
 * (mesmo para WebP): enquanto a URL pré-assinada valer, o cliente pode repetir o
 * PUT na chave original, e isso nunca pode sobrescrever a imagem já sanitizada.
 *
 * @param originalKey Chave do arquivo enviado pelo cliente.
 * @returns Chave do WebP gerado pelo worker.
 * @example
 * optimizedKeyFor('posts/images/u/a.webp') // 'posts/images/u/a.optimized.webp'
 */
export function optimizedKeyFor(originalKey: string): string {
  return `${originalKey.replace(/\.[^./]+$/, '')}.optimized.${COMPRESSED_IMAGE_FORMAT.extension}`
}

/**
 * Executa no worker o trabalho pesado sobre arquivos já enviados ao storage:
 * validação do conteúdo real, compressão de imagens e remoção de arquivos
 * descartados. Todas as operações são idempotentes, pois o BullMQ pode
 * reentregar o mesmo job após falha.
 *
 * Processamento e descarte de um asset são serializados pelo bloqueio da linha
 * (`FOR UPDATE`): o descarte espera a compressão terminar e relê a chave final,
 * e uma compressão que chega depois do descarte não encontra mais o asset.
 */
export class MediaProcessingService {
  async process(mediaAssetId: string): Promise<void> {
    await db.transaction(async (trx) => {
      const asset = await this.#lock(mediaAssetId, trx)
      if (!asset || asset.status !== MediaAssetStatus.PROCESSING || !asset.purpose) {
        return
      }

      const rules = MEDIA_ASSET_RULES[asset.purpose]
      const disk = drive.use(mediaDiskFor(asset))
      const optimizedKey = optimizedKeyFor(asset.fileKey)

      if (!(await disk.exists(asset.fileKey))) {
        // NOTE: retomada — uma execução anterior gravou o WebP e apagou o
        // original, mas caiu antes de salvar o asset; basta concluir o registro
        if (await disk.exists(optimizedKey)) {
          await this.#markReady(asset, optimizedKey)
          return
        }
        await this.#fail(asset, 'arquivo não encontrado no storage após confirmação do upload')
        return
      }

      // NOTE: a assinatura da URL já prende o tamanho declarado; a conferência
      // sobre o objeto gravado é a defesa em profundidade caso ela seja contornada
      const metadata = await disk.getMetaData(asset.fileKey)
      if (metadata.contentLength > rules.maxSizeBytes) {
        await this.#fail(asset, `arquivo excede ${rules.maxSizeBytes} bytes`, true)
        return
      }

      // NOTE: fora do try — erro de leitura no storage é transitório e precisa do
      // retry do BullMQ, não pode virar FAILED como um arquivo inválido
      const original = await disk.getBytes(asset.fileKey)

      let compressed: Buffer
      try {
        // NOTE: `rotate()` aplica a orientação EXIF antes de descartá-la; o sharp
        // remove todos os metadados (inclusive GPS) por padrão na saída
        compressed = await sharp(original, { failOn: 'error' })
          .rotate()
          .resize({
            width: rules.maxDimensionPx,
            height: rules.maxDimensionPx,
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp({ quality: COMPRESSED_IMAGE_QUALITY })
          .toBuffer()
      } catch {
        await this.#fail(asset, 'conteúdo não é uma imagem válida', true)
        return
      }

      await disk.put(optimizedKey, compressed, {
        contentType: COMPRESSED_IMAGE_FORMAT.mimeType,
      })
      // NOTE: o original (com EXIF/GPS) sai antes de o asset ficar READY. Se a
      // remoção falhar, o job falha com o asset ainda PROCESSING e o retry
      // refaz tudo; se cair depois dela, a retomada acima conclui o registro.
      await disk.delete(asset.fileKey)
      await this.#markReady(asset, optimizedKey, compressed.byteLength)
    })
  }

  async deleteMany(mediaAssetIds: string[]): Promise<void> {
    for (const mediaAssetId of mediaAssetIds) {
      const trx = await db.transaction()

      try {
        // NOTE: a chave é relida sob o bloqueio — se a compressão terminou antes,
        // o descarte apaga o WebP final, não o original já removido
        const asset = await this.#lock(mediaAssetId, trx)
        if (!asset) {
          await trx.rollback()
          continue
        }

        try {
          await asset.delete()
        } catch (error) {
          await trx.rollback()
          if (!isForeignKeyViolation(error)) throw error
          // WARNING: FK RESTRICT — o asset voltou a ser referenciado entre o
          // descarte e a execução do job; apagar o objeto quebraria o recurso
          logger.warn({ err: error, mediaAssetId }, 'asset descartado ainda referenciado')
          continue
        }

        // NOTE: o registro só é removido de fato se os objetos também forem —
        // falha no storage desfaz o delete e o retry do job reencontra o asset
        const disk = drive.use(mediaDiskFor(asset))
        await disk.delete(asset.fileKey)
        if (asset.status !== MediaAssetStatus.READY) {
          // NOTE: descartado no meio do processamento: pode haver o WebP gerado
          await disk.delete(optimizedKeyFor(asset.fileKey))
        }
        await trx.commit()
      } catch (error) {
        if (!trx.isCompleted) await trx.rollback()
        throw error
      }
    }
  }

  async #lock(mediaAssetId: string, trx: TransactionClientContract) {
    return MediaAsset.query({ client: trx }).where('id', mediaAssetId).forUpdate().first()
  }

  async #markReady(asset: MediaAsset, optimizedKey: string, fileSizeBytes?: number) {
    asset.merge({
      fileKey: optimizedKey,
      mimeType: COMPRESSED_IMAGE_FORMAT.mimeType,
      status: MediaAssetStatus.READY,
      ...(fileSizeBytes === undefined ? {} : { fileSizeBytes }),
    })
    await asset.save()
  }

  /**
   * Marca o asset como FAILED. Quando o objeto rejeitado deve sair do storage,
   * ele é apagado antes: se a remoção falhar, o asset continua PROCESSING e o
   * retry tenta de novo, em vez de ficar FAILED com o conteúdo no bucket.
   */
  async #fail(asset: MediaAsset, reason: string, deleteObject = false): Promise<void> {
    logger.warn({ mediaAssetId: asset.id, reason }, 'processamento de arquivo falhou')

    if (deleteObject) {
      await drive.use(mediaDiskFor(asset)).delete(asset.fileKey)
    }

    asset.status = MediaAssetStatus.FAILED
    await asset.save()
  }
}

import {
  MEDIA_ASSET_RULES,
  MEDIA_UPLOAD_URL_TTL_SECONDS,
  MIME_TYPE_EXTENSIONS,
} from '#constants/media_asset'
import type { MediaAssetPurpose } from '#enums/media_asset/media_asset_purpose'
import { MediaAssetStatus } from '#enums/media_asset/media_asset_status'
import { Provider } from '#enums/media_asset/provider'
import MediaAssetUploaded from '#events/media_asset/media_asset_uploaded'
import MediaAssetForbiddenException from '#exceptions/media_asset/media_asset_forbidden_exception'
import MediaAssetInvalidStatusException from '#exceptions/media_asset/media_asset_invalid_status_exception'
import MediaAssetNotFoundException from '#exceptions/media_asset/media_asset_not_found_exception'
import MediaUploadNotAllowedException from '#exceptions/media_asset/media_upload_not_allowed_exception'
import MediaAsset from '#models/media_asset'
import type User from '#models/user'
import env from '#start/env'
import drive from '@adonisjs/drive/services/main'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { v7 as randomUUID } from 'uuid'

type RequestMediaUploadPayload = {
  purpose: MediaAssetPurpose
  mimeType: string
  fileSizeBytes: number
}

/** Instruções devolvidas ao cliente para enviar o arquivo direto ao storage. */
export type MediaUploadInstructions = {
  url: string
  method: 'PUT'
  headers: Record<string, string>
  expiresAt: DateTime
}

/**
 * Orquestra o upload direto ao storage via URL pré-assinada: reserva o
 * asset, entrega a URL ao cliente e, na confirmação, delega a validação do
 * conteúdo real e a compressão ao worker.
 */
export class MediaUploadService {
  async request(
    actor: User,
    payload: RequestMediaUploadPayload
  ): Promise<{ mediaAsset: MediaAsset; upload: MediaUploadInstructions }> {
    const rules = MEDIA_ASSET_RULES[payload.purpose]

    if (!rules.mimeTypes.includes(payload.mimeType)) {
      throw new MediaUploadNotAllowedException(
        `Tipo de arquivo não permitido para ${payload.purpose}; aceitos: ${rules.mimeTypes.join(', ')}`
      )
    }

    if (payload.fileSizeBytes > rules.maxSizeBytes) {
      throw new MediaUploadNotAllowedException(
        `Arquivo excede o tamanho máximo de ${rules.maxSizeBytes} bytes para ${payload.purpose}`
      )
    }

    // NOTE: a chave é sempre gerada pelo servidor — o cliente nunca escolhe onde
    // grava no bucket, o que impede sobrescrever arquivos de outros usuários
    const fileKey = `${rules.storagePrefix}/${actor.id}/${randomUUID()}.${MIME_TYPE_EXTENSIONS[payload.mimeType]}`

    const mediaAsset = await db.transaction(async (trx) => {
      return MediaAsset.create(
        {
          provider: Provider.S3,
          bucket: env.get('S3_BUCKET'),
          fileKey,
          mimeType: payload.mimeType,
          fileSizeBytes: payload.fileSizeBytes,
          purpose: payload.purpose,
          status: MediaAssetStatus.PENDING_UPLOAD,
          uploadedByUserId: actor.id,
        },
        { client: trx }
      )
    })

    // NOTE: assinar a URL é cálculo local (HMAC sobre a requisição), sem I/O
    // no storage — por isso fica no request path e não no pipeline de jobs.
    // Tipo e tamanho entram na assinatura (ver `config/drive.ts`)
    const url = await drive.use().getSignedUploadUrl(fileKey, {
      contentType: payload.mimeType,
      expiresIn: MEDIA_UPLOAD_URL_TTL_SECONDS,
      ContentLength: payload.fileSizeBytes,
    })

    return {
      mediaAsset,
      upload: {
        url,
        method: 'PUT',
        headers: {
          'Content-Type': payload.mimeType,
          'Content-Length': String(payload.fileSizeBytes),
        },
        expiresAt: DateTime.now().plus({ seconds: MEDIA_UPLOAD_URL_TTL_SECONDS }),
      },
    }
  }

  async show(actor: User, id: string): Promise<MediaAsset> {
    const mediaAsset = await MediaAsset.find(id)
    if (!mediaAsset) {
      throw new MediaAssetNotFoundException('Arquivo não encontrado')
    }

    if (mediaAsset.uploadedByUserId !== actor.id) {
      throw new MediaAssetForbiddenException('Você não tem permissão para acessar este arquivo')
    }

    return mediaAsset
  }

  async complete(actor: User, id: string): Promise<MediaAsset> {
    const mediaAsset = await db.transaction(async (trx) => {
      const asset = await MediaAsset.query({ client: trx }).where('id', id).forUpdate().first()
      if (!asset) {
        throw new MediaAssetNotFoundException('Arquivo não encontrado')
      }

      if (asset.uploadedByUserId !== actor.id) {
        throw new MediaAssetForbiddenException('Você não tem permissão para alterar este arquivo')
      }

      if (asset.status !== MediaAssetStatus.PENDING_UPLOAD) {
        throw new MediaAssetInvalidStatusException(
          'O upload deste arquivo já foi confirmado anteriormente'
        )
      }

      asset.status = MediaAssetStatus.PROCESSING
      await asset.save()
      return asset
    })

    await MediaAssetUploaded.dispatch(mediaAsset.id)

    return mediaAsset
  }
}

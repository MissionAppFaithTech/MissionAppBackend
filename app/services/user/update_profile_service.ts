import { MediaAssetPurpose } from '#enums/media_asset/media_asset_purpose'
import MediaAssetsDiscarded from '#events/media_asset/media_assets_discarded'
import MediaAssetNotAttachableException from '#exceptions/media_asset/media_asset_not_attachable_exception'
import User from '#models/user'
import { MediaAttachmentService } from '#services/media_asset/media_attachment_service'
import { fieldValidationError } from '#utils/field_validation_error'
import { omitUndefined } from '#utils/omit_undefined'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

type UpdateAccountProfilePayload = {
  fullName?: string
  username?: string
  biography?: string | null
  profilePictureId?: string | null
}

/**
 * Atualiza os dados de perfil da conta autenticada, incluindo a troca ou a
 * remoção da foto de perfil.
 *
 * @returns O usuário com a relação `profilePicture` carregada.
 */
export class UpdateProfileService {
  async execute(actor: User, payload: UpdateAccountProfilePayload): Promise<User> {
    if (payload.username && payload.username !== actor.username) {
      const userWithSameUsername = await User.query()
        .where('username', payload.username)
        .whereNot('id', actor.id)
        .first()

      if (userWithSameUsername) {
        throw fieldValidationError('username', 'database.unique', 'Nome de usuário já está em uso')
      }
    }

    const discarded = await db.transaction(async (trx) => {
      // NOTE: lock da linha para que duas trocas simultâneas não descartem a
      // mesma foto anterior nem deixem uma foto órfã no storage
      const current = await User.query({ client: trx })
        .where('id', actor.id)
        .forUpdate()
        .firstOrFail()
      const previousPicture = current.profilePictureId
      const pictureChanged =
        payload.profilePictureId !== undefined && payload.profilePictureId !== previousPicture

      if (pictureChanged && payload.profilePictureId) {
        await this.assertPictureAttachable(actor, payload.profilePictureId, trx)
      }

      actor.useTransaction(trx)
      actor.merge(
        omitUndefined({
          fullName: payload.fullName,
          username: payload.username,
          biography: payload.biography,
          profilePictureId: payload.profilePictureId,
        })
      )
      await actor.save()

      // NOTE: a foto anterior só é descartada depois do commit — o FK é SET NULL,
      // então apagá-la antes anularia a coluna em silêncio
      return pictureChanged && previousPicture ? [previousPicture] : []
    })

    if (discarded.length > 0) {
      await MediaAssetsDiscarded.dispatch(discarded)
    }

    await actor.load('profilePicture')
    return actor
  }

  private async assertPictureAttachable(
    actor: User,
    profilePictureId: string,
    trx: TransactionClientContract
  ): Promise<void> {
    try {
      await new MediaAttachmentService().assertAttachable(
        actor,
        [profilePictureId],
        MediaAssetPurpose.PROFILE_PICTURE,
        trx
      )
    } catch (error) {
      if (error instanceof MediaAssetNotAttachableException) {
        throw fieldValidationError(
          'profilePictureId',
          'database.exists',
          'Imagem de perfil informada não existe'
        )
      }
      throw error
    }
  }
}

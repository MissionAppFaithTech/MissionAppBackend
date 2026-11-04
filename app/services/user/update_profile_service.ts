import MediaAsset from '#models/media_asset'
import User from '#models/user'
import { fieldValidationError } from '#utils/field_validation_error'
import { omitUndefined } from '#utils/omit_undefined'
import db from '@adonisjs/lucid/services/db'

type UpdateAccountProfilePayload = {
  fullName?: string
  username?: string
  biography?: string | null
  profilePictureId?: string | null
}

/**
 * Atualiza os dados de perfil da conta autenticada.
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

    if (payload.profilePictureId) {
      const mediaAsset = await MediaAsset.find(payload.profilePictureId)
      if (!mediaAsset) {
        throw fieldValidationError(
          'profilePictureId',
          'database.exists',
          'Imagem de perfil informada não existe'
        )
      }
    }

    return db.transaction(async (trx) => {
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
      return actor
    })
  }
}

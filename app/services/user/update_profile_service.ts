import MediaAsset from '#models/media_asset'
import User from '#models/user'
import { omitUndefined } from '#utils/omit_undefined'
import db from '@adonisjs/lucid/services/db'
import { Exception } from '@adonisjs/core/exceptions'

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
        throw new Exception('Nome de usuário já está em uso', {
          status: 422,
          code: 'E_VALIDATION_ERROR',
        })
      }
    }

    if (payload.profilePictureId) {
      const mediaAsset = await MediaAsset.find(payload.profilePictureId)
      if (!mediaAsset) {
        throw new Exception('Imagem de perfil informada não existe', {
          status: 422,
          code: 'E_VALIDATION_ERROR',
        })
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

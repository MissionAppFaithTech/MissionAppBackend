import FaithCommunity from '#models/faith_community'
import MediaAsset from '#models/media_asset'
import User from '#models/user'
import db from '@adonisjs/lucid/services/db'
import { Exception } from '@adonisjs/core/exceptions'

type UpdateAccountProfilePayload = {
  fullName?: string
  username?: string
  biography?: string | null
  profilePictureId?: string | null
  faithCommunityId?: string | null
}

/**
 * Atualiza os dados de perfil da conta autenticada.
 */
export class UpdateProfileService {
  /**
   * @param actor Usuário autenticado dono do perfil.
   * @param payload Campos a atualizar — campos omitidos preservam o valor atual.
   * @returns O usuário com os novos dados persistidos.
   * @throws {Exception} `username` já pertence a outro usuário, ou
   *         `profilePictureId`/`faithCommunityId` não correspondem a
   *         registros existentes (`422 E_VALIDATION_ERROR`).
   * @example
   * const user = await new UpdateProfileService().execute(actor, { biography: 'Nova bio' })
   */
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

    if (payload.faithCommunityId) {
      const faithCommunity = await FaithCommunity.find(payload.faithCommunityId)
      if (!faithCommunity) {
        throw new Exception('Comunidade de fé informada não existe', {
          status: 422,
          code: 'E_VALIDATION_ERROR',
        })
      }
    }

    return db.transaction(async (trx) => {
      actor.useTransaction(trx)
      actor.merge({
        fullName: payload.fullName,
        username: payload.username,
        biography: payload.biography,
        profilePictureId: payload.profilePictureId,
        faithCommunityId: payload.faithCommunityId,
      })
      await actor.save()
      return actor
    })
  }
}

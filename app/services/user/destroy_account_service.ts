import { UserRole } from '#enums/user/user_role'
import type User from '#models/user'
import { AuthRevocationService } from '#services/auth/auth_revocation_service'
import { RefreshTokenService } from '#services/auth/refresh_token_service'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

/**
 * Encerra a conta do usuário autenticado (RF 15.5). Apoiadores são excluídos
 * permanentemente — sem dados relacionais que precisem sobreviver à conta
 * (posts, projetos etc. pertencem a missionários). Missionários recebem
 * exclusão lógica (`deletedAt`) para preservar a integridade do conteúdo já
 * publicado e vinculado a apoiadores (posts, curtidas, comentários).
 *
 * Em ambos os casos todas as sessões ativas são revogadas, já que a exclusão
 * lógica não remove os refresh tokens do missionário automaticamente.
 */
export class DestroyAccountService {
  /**
   * @param actor Usuário autenticado que solicitou o encerramento da própria conta.
   * @returns Nada — efeito colateral (exclusão/soft delete no Postgres +
   *          revogação de todas as sessões ativas).
   * @example
   * await new DestroyAccountService().execute(auth.getUserOrFail())
   */
  async execute(actor: User): Promise<void> {
    const refreshTokenService = new RefreshTokenService()

    await db.transaction(async (trx) => {
      actor.useTransaction(trx)

      if (actor.role === UserRole.SUPPORTER) {
        await actor.delete()
      } else {
        actor.deletedAt = DateTime.now()
        await actor.save()
      }
    })

    await new AuthRevocationService().revokeAllSessions(actor.id, refreshTokenService)
  }
}

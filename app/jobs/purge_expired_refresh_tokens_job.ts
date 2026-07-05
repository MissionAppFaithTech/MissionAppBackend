import RefreshToken from '#models/refresh_token'
import { DateTime } from 'luxon'

/**
 * Dias de retenção para tokens revogados antes da limpeza definitiva — janela
 * que permite investigação forense de eventos de roubo de token (mesmo
 * family_id reutilizado) por um período razoável.
 */
const REVOKED_RETENTION_DAYS = 30

/**
 * Remove refresh_tokens expirados imediatamente e revogados há mais de
 * `REVOKED_RETENTION_DAYS` dias.
 */
export async function purgeExpiredRefreshTokens(): Promise<number> {
  const now = DateTime.now()
  const revokedCutoff = now.minus({ days: REVOKED_RETENTION_DAYS })

  const deletedRows = await RefreshToken.query()
    .where((query) => {
      query.where('expiresAt', '<', now.toSQL()!).orWhere((subQuery) => {
        subQuery.whereNotNull('revokedAt').where('revokedAt', '<', revokedCutoff.toSQL()!)
      })
    })
    .delete()

  return deletedRows[0] ?? 0
}

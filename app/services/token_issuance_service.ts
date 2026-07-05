import { clientMetadata } from '#auth/client_context'
import type User from '#models/user'
import { RefreshTokenService } from '#services/refresh_token_service'
import type { HttpContext } from '@adonisjs/core/http'

export type IssuedTokens = { accessToken: string; refreshToken: string }

/**
 * Emite o par access+refresh token e sempre os retorna no corpo da resposta.
 *
 * A API é consumida por um BFF Next.js (web) e por apps nativos (mobile) —
 * nunca diretamente por um browser. Um cookie setado por esta API não
 * chegaria ao browser do usuário final, apenas ao processo do BFF; por isso
 * a entrega de tokens não distingue mais cliente por cookie/body. Cabe ao
 * consumidor (BFF ou app) decidir onde guardar o refresh token recebido. Ver
 * ADR-0021, seção "Entrega de Tokens".
 */
export class TokenIssuanceService {
  #refreshTokenService = new RefreshTokenService()

  /** Emite um novo refresh token (nova família de sessão). Usado por login e signup. */
  async issue(ctx: HttpContext, user: User): Promise<IssuedTokens> {
    const { raw, familyId } = await this.#refreshTokenService.create(user.id, clientMetadata(ctx))
    return this.#deliver(ctx, user, raw, familyId)
  }

  /**
   * Entrega um refresh token já rotacionado (mesma família), sem criar uma
   * nova. Usado pelo fluxo de refresh, onde `RefreshTokenService.rotate()`
   * já criou o novo token na família de origem.
   */
  async deliver(
    ctx: HttpContext,
    user: User,
    rawRefreshToken: string,
    familyId: string
  ): Promise<IssuedTokens> {
    return this.#deliver(ctx, user, rawRefreshToken, familyId)
  }

  async #deliver(
    ctx: HttpContext,
    user: User,
    rawRefreshToken: string,
    familyId: string
  ): Promise<IssuedTokens> {
    const { token: accessToken } = await ctx.auth.use('jwt').generate(user, familyId)
    return { accessToken, refreshToken: rawRefreshToken }
  }
}

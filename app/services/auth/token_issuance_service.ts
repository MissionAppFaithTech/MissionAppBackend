import type User from '#models/user'
import type { RefreshTokenService } from '#services/auth/refresh_token_service'
import type { AuthContext } from '#types/http/context'
import type { DeviceMetadata } from '#types/services/auth/refresh_token'
import type { IssuedTokens } from '#types/services/auth/token_issuance'

/**
 * Emite o par access+refresh token e sempre os retorna no corpo da resposta.
 *
 * A API é consumida por um BFF Next.js (web) e por apps nativos (mobile) —
 * nunca diretamente por um browser. Um cookie setado por esta API não
 * chegaria ao browser do usuário final, apenas ao processo do BFF; por isso
 * a entrega de tokens não distingue cliente por cookie/body. Cabe ao
 * consumidor (BFF ou app) decidir onde guardar o refresh token recebido. Ver
 * ADR-0023, seção "Entrega de Tokens".
 */
export class TokenIssuanceService {
  /**
   * Emite um novo refresh token (nova família de sessão) e entrega o par.
   * Usado por login e signup.
   *
   * @param auth Guard de autenticação — usado para gerar o access token JWT.
   * @param user Usuário autenticado/criado.
   * @param meta Metadados de dispositivo do request atual.
   * @param refreshTokenService Instância usada para criar o refresh token —
   *                             injetada em vez de instanciada aqui, mesmo
   *                             padrão de `AuthRevocationService`.
   * @returns `{ accessToken, refreshToken }`.
   * @example
   * const tokens = await service.issue(auth, user, meta, new RefreshTokenService())
   */
  async issue(
    auth: AuthContext,
    user: User,
    meta: DeviceMetadata,
    refreshTokenService: RefreshTokenService
  ): Promise<IssuedTokens> {
    const { raw, familyId } = await refreshTokenService.create(user.id, meta)
    return this.deliver(auth, user, raw, familyId)
  }

  /**
   * Entrega um refresh token já rotacionado (mesma família), sem criar uma
   * nova. Usado pelo fluxo de refresh, onde `RefreshTokenService.rotate()`
   * já criou o novo token na família de origem.
   *
   * @param auth Guard de autenticação — usado para gerar o access token JWT.
   * @param user Usuário dono do token.
   * @param rawRefreshToken Valor bruto do refresh token já rotacionado.
   * @param familyId Família da sessão à qual o novo access token deve ser vinculado.
   * @returns `{ accessToken, refreshToken }`, sempre no corpo (ver ADR-0023).
   * @example
   * const tokens = await service.deliver(auth, user, newRaw, familyId)
   */
  async deliver(
    auth: AuthContext,
    user: User,
    rawRefreshToken: string,
    familyId: string
  ): Promise<IssuedTokens> {
    const { token: accessToken } = await auth.use('jwt').generate(user, familyId)
    return { accessToken, refreshToken: rawRefreshToken }
  }
}

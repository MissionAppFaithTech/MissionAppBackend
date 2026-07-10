import { RESET_TOKEN_BYTES, RESET_TOKEN_TTL_MINUTES } from '#constants/password_reset'
import PasswordResetRequested from '#events/auth/password_reset_requested'
import InvalidPasswordResetTokenException from '#exceptions/auth/invalid_password_reset_token_exception'
import User from '#models/user'
import type { AuthRevocationService } from '#services/auth/auth_revocation_service'
import { LoginAttemptService } from '#services/auth/login_attempt_service'
import type { RefreshTokenService } from '#services/auth/refresh_token_service'
import env from '#start/env'
import { DateTime } from 'luxon'
import { createHash, randomBytes } from 'node:crypto'

/**
 * Fluxo de "esqueci minha senha": gera um token opaco de uso único, envia
 * por email, e troca a senha mediante apresentação do token dentro da
 * validade.
 */
export class PasswordResetService {
  #hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex')
  }

  /**
   * Gera um token de redefinição e envia por email, se o login corresponder
   * a um usuário existente. Idempotente e silencioso quando não corresponde
   * — nunca revela se um email está cadastrado (evita user enumeration).
   *
   * @param login Email informado pelo usuário no formulário de "esqueci minha senha".
   * @returns Nada — efeito colateral (persistência do token + evento que
   *          dispara o envio de email de forma assíncrona, ver
   *          `PasswordResetRequested`).
   * @example
   * await service.requestReset(validated.login)
   */
  async requestReset(login: string): Promise<void> {
    const user = await User.findBy('email', login)
    if (!user) return

    const raw = randomBytes(RESET_TOKEN_BYTES).toString('hex')

    user.recoveryPasswordToken = this.#hashToken(raw)
    user.recoveryPasswordTokenExpiresAt = DateTime.now().plus({ minutes: RESET_TOKEN_TTL_MINUTES })

    await user.save()

    const resetUrl = new URL('/reset-password', env.get('FRONTEND_URL'))
    resetUrl.searchParams.set('token', raw)

    await PasswordResetRequested.dispatch(
      user.fullName,
      user.email,
      resetUrl.href,
      RESET_TOKEN_TTL_MINUTES
    )
  }

  /**
   * Troca a senha mediante apresentação de um token válido e dentro da
   * validade. Revoga todas as sessões ativas e reseta o bloqueio de login
   * por força bruta — apresentar o token é prova de controle sobre o email
   * cadastrado, mesmo tratamento de "reconquista de conta" do fluxo de troca
   * de senha autenticado (ver ADR-0023).
   *
   * @param rawToken Valor bruto do token, recebido no link do email.
   * @param newPassword Nova senha em texto plano.
   * @param refreshTokenService Instância usada para revogar refresh tokens —
   *                             injetada pelo mesmo motivo de `AuthRevocationService`.
   * @param authRevocationService Instância usada para revogar todas as sessões.
   * @returns Nada — efeito colateral (troca de senha + revogação).
   * @throws {InvalidPasswordResetTokenException} Token inexistente ou expirado.
   * @example
   * await service.resetPassword(token, newPassword, new RefreshTokenService(), new AuthRevocationService())
   */
  async resetPassword(
    rawToken: string,
    newPassword: string,
    refreshTokenService: RefreshTokenService,
    authRevocationService: AuthRevocationService
  ): Promise<void> {
    const tokenHash = this.#hashToken(rawToken)
    const user = await User.findBy('recoveryPasswordToken', tokenHash)

    if (
      !user ||
      !user.recoveryPasswordTokenExpiresAt ||
      user.recoveryPasswordTokenExpiresAt < DateTime.now()
    ) {
      throw new InvalidPasswordResetTokenException('Token de redefinição inválido ou expirado')
    }

    user.passwordHash = newPassword
    user.recoveryPasswordToken = null
    user.recoveryPasswordTokenExpiresAt = null

    await user.save()

    const loginAttemptService = new LoginAttemptService()

    await Promise.all([
      authRevocationService.revokeAllSessions(user.id, refreshTokenService),
      loginAttemptService.recordSuccess(user),
    ])
  }
}

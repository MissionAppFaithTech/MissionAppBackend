import cache from '#services/shared/cache/cache'
import type { RefreshTokenService } from '#services/auth/refresh_token_service'
import type { AuthContext } from '#types/http/context'
import { parseDurationToSeconds, secondsUntil } from '#utils/duration'
import env from '#start/env'

/**
 * Gerencia os três mecanismos de revogação via DragonflyDB descritos na ADR-0023:
 * o contador de auth_version (revogação global), a blocklist de jti (revogação
 * do access token corrente) e a blocklist de family_id (revogação remota de uma
 * sessão/dispositivo específico). Nenhum toca o PostgreSQL — são operações O(1)
 * no Dragonfly.
 */
export class AuthRevocationService {
  #authVersionKey(userId: string) {
    return `user:${userId}:auth_version`
  }

  #jtiKey(jti: string) {
    return `jti:${jti}`
  }

  #familyKey(familyId: string) {
    return `family:${familyId}:revoked`
  }

  // TODO: validar outputs do Dragonfly contra um schema antes de confiar neles
  /**
   * Lê o `auth_version` atual de um usuário no DragonflyDB.
   *
   * @param userId Usuário alvo.
   * @returns Valor atual do contador; ausência da chave é tratada como versão
   *          0 (usuário nunca teve revogação global emitida).
   * @example
   * const version = await service.getAuthVersion(user.id)
   */
  async getAuthVersion(userId: string): Promise<number> {
    const value = await cache.get(this.#authVersionKey(userId))
    return value ? Number(value) : 0
  }

  /**
   * Incrementa o `auth_version` de um usuário — invalida instantaneamente
   * todos os access tokens emitidos antes desta chamada, independente de
   * quantos existam, sem enumeração de `jti`.
   *
   * @param userId Usuário alvo.
   * @returns Novo valor do contador após o incremento.
   * @example
   * await service.bumpAuthVersion(user.id)
   */
  async bumpAuthVersion(userId: string): Promise<number> {
    return cache.incr(this.#authVersionKey(userId))
  }

  /**
   * Verifica se um `jti` específico está na blocklist de access tokens revogados.
   *
   * @param jti Identificador único do access token.
   * @returns `true` se o token foi revogado individualmente (ex: logout).
   * @example
   * if (await service.isJtiBlocked(payload.jti)) { ... }
   */
  async isJtiBlocked(jti: string): Promise<boolean> {
    return cache.exists(this.#jtiKey(jti))
  }

  /**
   * Bloqueia um access token específico até sua expiração natural.
   *
   * @param jti Identificador único do access token a bloquear.
   * @param ttlSeconds Tempo restante até a expiração do access token — não um TTL
   *                   fixo. Bloquear além disso desperdiça memória; bloquear menos
   *                   permite reuso do token já revogado antes da expiração real.
   * @returns Nada — no-op se `ttlSeconds <= 0` (token já expiraria sozinho).
   * @example
   * await service.blockJti(payload.jti, exp - nowInSeconds)
   */
  async blockJti(jti: string, ttlSeconds: number): Promise<void> {
    if (ttlSeconds <= 0) return
    await cache.set(this.#jtiKey(jti), '1', ttlSeconds)
  }

  /**
   * Verifica se uma família de refresh tokens foi revogada remotamente.
   *
   * @param familyId Família (sessão/dispositivo) a verificar.
   * @returns `true` se a família foi revogada via `blockFamily()`.
   * @example
   * if (await service.isFamilyRevoked(payload.fid)) { ... }
   */
  async isFamilyRevoked(familyId: string): Promise<boolean> {
    return cache.exists(this.#familyKey(familyId))
  }

  /**
   * Revoga remotamente uma sessão/dispositivo específico sem esperar a
   * expiração natural do access token em uso naquela sessão.
   *
   * @param familyId Família (sessão/dispositivo) a revogar.
   * @returns Nada. TTL da chave é igual ao tempo de vida máximo de um access
   *          token (`JWT_ACCESS_EXPIRES_IN`) — após esse tempo o token já teria
   *          expirado por conta própria, então manter a chave além disso só
   *          desperdiça memória no Dragonfly.
   * @example
   * await service.blockFamily(session.familyId)
   */
  async blockFamily(familyId: string): Promise<void> {
    const ttlSeconds = parseDurationToSeconds(env.get('JWT_ACCESS_EXPIRES_IN'))
    await cache.set(this.#familyKey(familyId), '1', ttlSeconds)
  }

  /**
   * Composição dos dois mecanismos de revogação: corta todos os access tokens
   * ativos (via auth_version) e revoga todos os refresh tokens do usuário no
   * Postgres. Ponto de reuso genérico para troca de senha, alteração de role,
   * suspensão/reprovação de conta e logout em todos os dispositivos.
   *
   * @param userId Usuário alvo.
   * @param refreshTokenService Instância usada para revogar os refresh tokens —
   *                             injetada em vez de instanciada aqui para evitar
   *                             import circular entre os dois services.
   * @returns Nada — as duas operações rodam em paralelo (`Promise.all`).
   * @example
   * await service.revokeAllSessions(user.id, new RefreshTokenService())
   */
  async revokeAllSessions(userId: string, refreshTokenService: RefreshTokenService): Promise<void> {
    await Promise.all([this.bumpAuthVersion(userId), refreshTokenService.revokeAllForUser(userId)])
  }

  /**
   * Revoga remotamente uma sessão/dispositivo específico — composição de
   * `RefreshTokenService.revokeFamily` (Postgres) e `blockFamily` (Dragonfly),
   * as duas metades da revogação remota de uma sessão.
   *
   * @param familyId Família (sessão/dispositivo) a revogar.
   * @param userId Dono esperado da família.
   * @param refreshTokenService Instância usada para revogar no Postgres —
   *                             injetada pelo mesmo motivo de `revokeAllSessions`.
   * @returns Nada — as duas operações rodam em paralelo (`Promise.all`).
   * @example
   * await service.revokeSession(familyId, user.id, new RefreshTokenService())
   */
  async revokeSession(
    familyId: string,
    userId: string,
    refreshTokenService: RefreshTokenService
  ): Promise<void> {
    await Promise.all([
      refreshTokenService.revokeFamily(familyId, userId),
      this.blockFamily(familyId),
    ])
  }

  /**
   * Encerra a sessão do dispositivo atual: revoga a família de refresh token
   * dona do token informado e, se um access token ainda válido acompanhar a
   * request, bloqueia seu `jti` também (defesa extra). Falha ao autenticar o
   * access token (ausente/expirado/inválido) não impede o logout — só a
   * revogação do refresh token é obrigatória (ver RFC 7009).
   *
   * @param auth Guard de autenticação da request atual.
   * @param refreshToken Valor bruto do refresh token a revogar.
   * @param refreshTokenService Instância usada para localizar/revogar a
   *                             família — injetada pelo mesmo motivo de
   *                             `revokeAllSessions`.
   * @returns Nada — idempotente, refresh token desconhecido é no-op.
   * @example
   * await service.logout(auth, refreshToken, new RefreshTokenService())
   */
  async logout(
    auth: AuthContext,
    refreshToken: string,
    refreshTokenService: RefreshTokenService
  ): Promise<void> {
    const family = await refreshTokenService.findFamily(refreshToken)
    if (family) {
      await refreshTokenService.revokeFamily(family.familyId, family.userId)
    }

    try {
      const guard = auth.use('jwt')
      await guard.authenticate()

      const jti = guard.currentJti
      const exp = guard.currentTokenExpiresAt

      if (jti && exp) {
        await this.blockJti(jti, secondsUntil(exp))
      }
    } catch {
      // NOTE: sem middleware.auth() de propósito (RFC 7009) — token
      // ausente/expirado/inválido não deve impedir o logout, que já foi
      // resolvido acima via refresh token.
    }
  }
}

import { dragonflyClient } from '#services/dragonfly_client'
import type { RefreshTokenService } from '#services/refresh_token_service'
import { parseDurationToSeconds } from '#utils/duration'
import env from '#start/env'

/**
 * Gerencia os três mecanismos de revogação via DragonflyDB descritos na ADR-0021:
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
   * Ausência da chave é tratada como versão 0 — usuário nunca teve
   * revogação global emitida.
   */
  async getAuthVersion(userId: string): Promise<number> {
    const value = await dragonflyClient().get(this.#authVersionKey(userId))
    return value ? Number(value) : 0
  }

  /**
   * Invalida instantaneamente todos os access tokens emitidos antes desta chamada,
   * independente de quantos existam — não há enumeração de jti.
   */
  async bumpAuthVersion(userId: string): Promise<number> {
    return dragonflyClient().incr(this.#authVersionKey(userId))
  }

  async isJtiBlocked(jti: string): Promise<boolean> {
    const exists = await dragonflyClient().exists(this.#jtiKey(jti))
    return exists === 1
  }

  /**
   * @param ttlSeconds Tempo restante até a expiração do access token — não um TTL
   *                   fixo. Bloquear além disso desperdiça memória; bloquear menos
   *                   permite reuso do token já revogado antes da expiração real.
   */
  async blockJti(jti: string, ttlSeconds: number): Promise<void> {
    if (ttlSeconds <= 0) return
    await dragonflyClient().set(this.#jtiKey(jti), '1', 'EX', ttlSeconds)
  }

  async isFamilyRevoked(familyId: string): Promise<boolean> {
    const exists = await dragonflyClient().exists(this.#familyKey(familyId))
    return exists === 1
  }

  /**
   * Revoga remotamente uma sessão/dispositivo específico sem esperar a expiração
   * natural do access token em uso naquela sessão. TTL igual ao tempo de vida
   * máximo de um access token (`JWT_ACCESS_EXPIRES_IN`) — após esse tempo o token
   * já teria expirado por conta própria, então manter a chave além disso só
   * desperdiça memória no Dragonfly.
   */
  async blockFamily(familyId: string): Promise<void> {
    const ttlSeconds = parseDurationToSeconds(env.get('JWT_ACCESS_EXPIRES_IN'))
    await dragonflyClient().set(this.#familyKey(familyId), '1', 'EX', ttlSeconds)
  }

  /**
   * Composição dos dois mecanismos de revogação: corta todos os access tokens
   * ativos (via auth_version) e revoga todos os refresh tokens do usuário no
   * Postgres. Ponto de reuso genérico para troca de senha, alteração de role,
   * suspensão/reprovação de conta e logout em todos os dispositivos.
   */
  async revokeAllSessions(userId: string, refreshTokenService: RefreshTokenService): Promise<void> {
    await Promise.all([this.bumpAuthVersion(userId), refreshTokenService.revokeAllForUser(userId)])
  }
}

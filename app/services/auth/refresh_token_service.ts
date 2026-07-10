import { REFRESH_TOKEN_BYTES } from '#constants/refresh_token'
import InvalidRefreshTokenException from '#exceptions/auth/invalid_refresh_token_exception'
import SessionNotFoundException from '#exceptions/auth/session_not_found_exception'
import RefreshToken from '#models/refresh_token'
import type { DeviceMetadata } from '#types/services/auth/refresh_token'
import { refreshTokenTtlInDays } from '#utils/refresh_token_ttl'
import { DateTime } from 'luxon'
import { createHash, randomBytes } from 'node:crypto'
import { v7 as uuidv7 } from 'uuid'

/**
 * Gerencia o ciclo de vida de refresh tokens opacos.
 *
 * Tokens são armazenados apenas como hash SHA-256 — o valor bruto
 * existe somente em memória durante a emissão e nunca é persistido.
 *
 * O TTL é recalculado a partir de `DateTime.now()` a cada `create`/`rotate`
 * (sliding window): um dispositivo mobile usado diariamente nunca expira por
 * inatividade; só pede login novamente após o período configurado sem uso.
 */
export class RefreshTokenService {
  /**
   * Hash SHA-256 de um valor bruto de refresh token — mesma transformação
   * usada na emissão (`generate`) e em toda consulta por valor bruto
   * (`rotate`, `findFamily`), centralizada para não divergir entre os dois.
   *
   * @param raw Valor bruto do token.
   * @returns Hash SHA-256 em hexadecimal.
   */
  #hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex')
  }

  /**
   * Gera um novo par de refresh token: valor bruto (entregue ao cliente) e
   * hash SHA-256 (persistido) — o valor bruto nunca é salvo em nenhuma tabela.
   *
   * @returns `raw` (valor bruto) e `hash` (SHA-256 de `raw`).
   * @example
   * const { raw, hash } = service.generate()
   */
  generate() {
    const raw = randomBytes(REFRESH_TOKEN_BYTES).toString('hex')
    const hash = this.#hashToken(raw)

    return { raw, hash }
  }

  /**
   * Cria um novo refresh token e persiste seu hash.
   *
   * @param userId Dono do token.
   * @param meta Metadados de dispositivo (tipo, nome, IP) — determinam a política de TTL.
   * @param familyId Quando fornecido, vincula o token a uma sessão existente (rotação).
   *                 Quando omitido, uma nova família é criada (novo login).
   * @returns `raw` (valor bruto, entregue ao cliente) e `familyId` (nova ou reaproveitada).
   * @example
   * const { raw, familyId } = await service.create(user.id, { deviceType: DeviceType.WEB })
   */
  async create(userId: string, meta: DeviceMetadata, familyId?: string) {
    const { raw, hash } = this.generate()
    const resolvedFamilyId = familyId ?? uuidv7()

    await RefreshToken.create({
      userId,
      tokenHash: hash,
      familyId: resolvedFamilyId,
      deviceType: meta.deviceType,
      deviceName: meta.deviceName ?? null,
      ipAddress: meta.ipAddress ?? null,
      lastUsedAt: DateTime.now(),
      expiresAt: DateTime.now().plus({ days: refreshTokenTtlInDays(meta.deviceType) }),
    })

    return { raw, familyId: resolvedFamilyId }
  }

  /**
   * Rotaciona o token da sessão corrente.
   *
   * Se o token apresentado já estiver revogado, assume possível roubo e invalida
   * toda a família — todos os tokens emitidos na mesma sessão de login de origem.
   * Neste caso, o usuário precisará autenticar novamente em todos os dispositivos.
   *
   * @param rawToken Valor bruto apresentado pelo cliente.
   * @param meta Metadados de dispositivo do request atual — substituem os do token anterior.
   * @returns `userId` do dono, `newRaw` (novo valor bruto) e `familyId` da sessão.
   * @throws {InvalidRefreshTokenException} Token não encontrado, expirado ou revogado.
   * @example
   * const { newRaw } = await service.rotate(rawTokenFromClient, meta)
   */
  async rotate(rawToken: string, meta: DeviceMetadata) {
    const hash = this.#hashToken(rawToken)
    const token = await RefreshToken.findBy('tokenHash', hash)

    if (!token) {
      throw new InvalidRefreshTokenException('Refresh token inválido')
    }

    if (token.revokedAt || token.expiresAt < DateTime.now()) {
      // NOTE: reuso de um token já revogado (rotacionado anteriormente) é
      // tratado como indício de roubo — invalida toda a família, forçando
      // reautenticação em todos os dispositivos daquela sessão de login.
      // Token só expirado (nunca revogado) não dispara essa invalidação.
      if (token.revokedAt) {
        await RefreshToken.query()
          .where('familyId', token.familyId)
          .update({ revokedAt: DateTime.now() })
      }
      throw new InvalidRefreshTokenException('Refresh token inválido')
    }

    token.revokedAt = DateTime.now()

    await token.save()

    const { raw: newRaw } = await this.create(token.userId, meta, token.familyId)

    return { userId: token.userId, newRaw, familyId: token.familyId }
  }

  /**
   * Localiza a família (sessão) dona de um refresh token, sem rotacioná-lo
   * nem validar expiração/revogação — usado pelo logout, que precisa saber
   * qual família revogar mesmo com um refresh token já expirado ou já revogado
   * (a revogação em si é idempotente, então isso não é um problema).
   *
   * @param rawToken Valor bruto apresentado pelo cliente.
   * @returns `userId`/`familyId` do dono do token, ou `null` se o hash não
   *          corresponder a nenhum token conhecido.
   * @example
   * const family = await service.findFamily(rawToken)
   * if (family) await service.revokeFamily(family.familyId, family.userId)
   */
  async findFamily(rawToken: string): Promise<{ userId: string; familyId: string } | null> {
    const hash = this.#hashToken(rawToken)
    const token = await RefreshToken.findBy('tokenHash', hash)

    return token ? { userId: token.userId, familyId: token.familyId } : null
  }

  /**
   * Revoga todas as sessões (todas as famílias) de um usuário — logout
   * global, troca de senha, suspensão.
   *
   * @param userId Usuário alvo.
   * @returns Nada — efeito colateral (`UPDATE` em massa no Postgres).
   * @example
   * await service.revokeAllForUser(user.id)
   */
  async revokeAllForUser(userId: string) {
    await RefreshToken.query()
      .where('userId', userId)
      .whereNull('revokedAt')
      .update({ revokedAt: DateTime.now() })
  }

  /**
   * Revoga apenas uma família (uma sessão/dispositivo específico) — usado
   * pelo logout do dispositivo atual e pela revogação remota de uma sessão listada.
   *
   * @param familyId Família a revogar.
   * @param userId Dono esperado da família — escopa a revogação para impedir
   *               que um usuário revogue a família de outro.
   * @returns Nada — efeito colateral (`UPDATE` no Postgres).
   * @example
   * await service.revokeFamily(session.familyId, user.id)
   */
  async revokeFamily(familyId: string, userId: string) {
    await RefreshToken.query()
      .where('familyId', familyId)
      .where('userId', userId)
      .whereNull('revokedAt')
      .update({ revokedAt: DateTime.now() })
  }

  /**
   * Lista as sessões ativas do usuário — uma linha por família, usando o
   * token mais recente de cada uma (é o único ainda não rotacionado/revogado).
   *
   * @param userId Usuário alvo.
   * @returns Refresh tokens ativos, ordenados por `lastUsedAt` decrescente.
   * @example
   * const sessions = await service.listActiveSessions(user.id)
   */
  async listActiveSessions(userId: string) {
    return RefreshToken.query()
      .where('userId', userId)
      .whereNull('revokedAt')
      .where('expiresAt', '>', DateTime.now().toSQL())
      .orderBy('lastUsedAt', 'desc')
  }

  /**
   * Localiza uma sessão ativa específica do usuário — versão pontual de
   * `listActiveSessions`, usada quando só a existência/posse de UMA família
   * importa (ex: antes de revogar remotamente).
   *
   * @param userId Dono esperado da sessão.
   * @param familyId Família a localizar.
   * @returns O refresh token mais recente da família.
   * @throws {SessionNotFoundException} Família inexistente, de outro
   *         usuário, ou já expirada/revogada.
   * @example
   * const session = await service.findActiveSessionOrFail(user.id, familyId)
   */
  async findActiveSessionOrFail(userId: string, familyId: string) {
    const session = await RefreshToken.query()
      .where('userId', userId)
      .where('familyId', familyId)
      .whereNull('revokedAt')
      .where('expiresAt', '>', DateTime.now().toSQL())
      .orderBy('lastUsedAt', 'desc')
      .first()

    if (!session) {
      throw new SessionNotFoundException('Sessão não encontrada')
    }

    return session
  }
}

import {
  DEFAULT_REFRESH_TOKEN_REUSE_WINDOW_SECONDS,
  MAX_REFRESH_TOKEN_REPLAY_CHAIN,
  REFRESH_TOKEN_BYTES,
} from '#constants/refresh_token'
import InvalidRefreshTokenException from '#exceptions/auth/invalid_refresh_token_exception'
import RefreshUnavailableException from '#exceptions/auth/refresh_unavailable_exception'
import SessionNotFoundException from '#exceptions/auth/session_not_found_exception'
import { DeviceKind } from '#enums/refresh_token/device_kind'
import RefreshToken from '#models/refresh_token'
import type { AuthRevocationService } from '#services/auth/auth_revocation_service'
import defaultCache from '#services/shared/cache/cache'
import type { CacheClient } from '#services/shared/cache/cache_client'
import env from '#start/env'
import type { DeviceMetadata } from '#types/services/auth/refresh_token'
import { refreshTokenTtlInDays } from '#utils/refresh_token_ttl'
import encryption from '@adonisjs/core/services/encryption'
import logger from '@adonisjs/core/services/logger'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
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
/** Operações de cache usadas pela janela de tolerância (injetáveis em testes). */
type IssuedTokenCache = Pick<CacheClient, 'get' | 'set'>

/** Identidade do aparelho herdada pelo sucessor quando o pedido não a informa (ADR-0038). */
type DeviceIdentity = Pick<RefreshToken, 'deviceId' | 'deviceKind'>

/** Aparelho de um login sem `x-device-id` nem `x-device-kind`. */
const NO_DEVICE: DeviceIdentity = { deviceId: null, deviceKind: DeviceKind.UNKNOWN }

/** Resultado de uma rotação bem-sucedida (normal ou replay dentro da janela). */
type RotationResult = { userId: string; newRaw: string; familyId: string }

/** Desfecho interno da transação de rotação. */
type RotationOutcome =
  ({ kind: 'rotated' } & RotationResult) | { kind: 'invalid' } | { kind: 'theft'; familyId: string }

export class RefreshTokenService {
  #cache: IssuedTokenCache | undefined
  #reuseWindowSeconds: number

  /**
   * @param options.cache Cache da janela de tolerância; padrão: DragonflyDB.
   * @param options.reuseWindowSeconds Janela de tolerância (ADR-0035); padrão:
   *        `REFRESH_TOKEN_REUSE_WINDOW_SECONDS` ou 30 s.
   */
  constructor(options: { cache?: IssuedTokenCache; reuseWindowSeconds?: number } = {}) {
    this.#cache = options.cache
    this.#reuseWindowSeconds =
      options.reuseWindowSeconds ??
      env.get('REFRESH_TOKEN_REUSE_WINDOW_SECONDS') ??
      DEFAULT_REFRESH_TOKEN_REUSE_WINDOW_SECONDS
  }

  get #issuedCache(): IssuedTokenCache {
    return this.#cache ?? defaultCache
  }

  /** Chave do valor cifrado de um token recém-emitido (janela de tolerância). */
  #issuedKey(tokenId: string): string {
    return `refresh:issued:${tokenId}`
  }
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
   * Hash do identificador do aparelho (`x-device-id`): o valor bruto não é
   * persistido, só comparado (ADR-0038).
   */
  #hashDeviceId(raw: string | null | undefined): string | null {
    return raw ? createHash('sha256').update(raw).digest('hex') : null
  }

  /** Aparelho do pedido; o que faltar vem do token anterior (ADR-0038). */
  #deviceIdentity(meta: DeviceMetadata, inherited: DeviceIdentity = NO_DEVICE): DeviceIdentity {
    return {
      deviceId: this.#hashDeviceId(meta.deviceId) ?? inherited.deviceId,
      deviceKind: meta.deviceKind ?? inherited.deviceKind,
    }
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
   * @param trx Transação em curso (rotação), quando houver.
   * @param inherited Identidade do aparelho do token anterior (rotação), usada
   *                  quando o pedido não envia `x-device-id`/`x-device-kind`.
   * @returns `raw` (valor bruto, entregue ao cliente), `familyId` (nova ou reaproveitada) e o `id` do token.
   * @example
   * const { raw, familyId } = await service.create(user.id, { deviceType: DeviceType.WEB })
   */
  async create(
    userId: string,
    meta: DeviceMetadata,
    familyId?: string,
    trx?: TransactionClientContract,
    inherited?: DeviceIdentity
  ) {
    const { raw, hash } = this.generate()
    const resolvedFamilyId = familyId ?? uuidv7()

    const token = await RefreshToken.create(
      {
        userId,
        tokenHash: hash,
        familyId: resolvedFamilyId,
        deviceType: meta.deviceType,
        deviceName: meta.deviceName ?? null,
        ipAddress: meta.ipAddress ?? null,
        ...this.#deviceIdentity(meta, inherited),
        lastUsedAt: DateTime.now(),
        expiresAt: DateTime.now().plus({ days: refreshTokenTtlInDays(meta.deviceType) }),
      },
      { client: trx }
    )

    return { raw, familyId: resolvedFamilyId, id: token.id }
  }

  /**
   * Rotaciona o token da sessão corrente, de forma serializada e idempotente
   * dentro da janela de tolerância (ADR-0035).
   *
   * - Token ativo: emite o sucessor na mesma família, guarda o valor cifrado no
   *   cache por `reuseWindowSeconds` **antes** do commit e marca o token como
   *   revogado com `replaced_by_id`. O `FOR UPDATE` faz pedidos concorrentes com o
   *   mesmo token esperarem o vencedor, então nunca veem o estado intermediário.
   * - Token já rotacionado, reapresentado dentro da janela pelo mesmo dispositivo:
   *   devolve o descendente ativo da cadeia (nunca um token já consumido).
   * - Cadeia que termina numa revogação sem sucessor (logout, troca de senha,
   *   revogação remota): 401 sem nova ação.
   * - Demais reusos de token revogado: tratados como roubo — revoga a família e
   *   bloqueia os access tokens dela (ADR-0023).
   *
   * @param rawToken Valor bruto apresentado pelo cliente.
   * @param meta Metadados de dispositivo do request atual.
   * @param revocation Usado para bloquear na hora os access tokens da família quando
   *                   o roubo é detectado — injetado para evitar import circular.
   * @returns `userId` do dono, `newRaw` (valor bruto atual da sessão) e `familyId`.
   * @throws {InvalidRefreshTokenException} Token desconhecido, expirado, revogado fora
   *         da janela ou sessão encerrada.
   * @throws {RefreshUnavailableException} O cache da janela falhou; nada foi alterado.
   * @example
   * const { newRaw } = await service.rotate(rawTokenFromClient, meta, new AuthRevocationService())
   */
  async rotate(
    rawToken: string,
    meta: DeviceMetadata,
    revocation: Pick<AuthRevocationService, 'blockFamily'>
  ): Promise<RotationResult> {
    const hash = this.#hashToken(rawToken)
    const outcome = await db.transaction((trx) => this.#rotateWithin(trx, hash, meta))

    if (outcome.kind === 'rotated') {
      const { userId, newRaw, familyId } = outcome
      return { userId, newRaw, familyId }
    }

    if (outcome.kind === 'theft') {
      // NOTE: além dos refresh tokens, bloqueia os access tokens já emitidos para a
      // família — sem isso, quem roubou o token seguiria autenticado até o access
      // token expirar (JWT_ACCESS_EXPIRES_IN), como acontece no revokeSession.
      await Promise.all([
        RefreshToken.query()
          .where('familyId', outcome.familyId)
          .update({ revokedAt: DateTime.now() }),
        revocation.blockFamily(outcome.familyId),
      ])
    }

    throw new InvalidRefreshTokenException('Refresh token inválido')
  }

  /**
   * Corpo transacional de {@link rotate}: trava a linha do token apresentado e
   * decide entre rotação normal, replay dentro da janela, sessão encerrada ou roubo.
   */
  async #rotateWithin(
    trx: TransactionClientContract,
    hash: string,
    meta: DeviceMetadata
  ): Promise<RotationOutcome> {
    const token = await RefreshToken.query({ client: trx })
      .where('tokenHash', hash)
      .forUpdate()
      .first()

    if (!token) return { kind: 'invalid' }

    if (!token.revokedAt) {
      // NOTE: token só expirado (nunca revogado) não dispara detecção de roubo.
      if (token.expiresAt < DateTime.now()) return { kind: 'invalid' }
      return this.#issueSuccessor(trx, token, meta)
    }

    return this.#resolveReplay(trx, token, meta)
  }

  /**
   * Emite o sucessor de um token ativo e o registra na janela de tolerância antes
   * do commit; falha no cache desfaz a transação inteira.
   */
  async #issueSuccessor(
    trx: TransactionClientContract,
    token: RefreshToken,
    meta: DeviceMetadata
  ): Promise<RotationOutcome> {
    const successor = await this.create(token.userId, meta, token.familyId, trx, token)

    try {
      await this.#issuedCache.set(
        this.#issuedKey(successor.id),
        encryption.encrypt(successor.raw),
        this.#reuseWindowSeconds
      )
    } catch (error) {
      logger.error(
        { err: error, familyId: token.familyId },
        'refresh token rotation: cache write failed'
      )
      throw new RefreshUnavailableException()
    }

    token.useTransaction(trx)
    token.revokedAt = DateTime.now()
    token.replacedById = successor.id
    await token.save()

    return {
      kind: 'rotated',
      userId: token.userId,
      newRaw: successor.raw,
      familyId: token.familyId,
    }
  }

  /**
   * Trata a reapresentação de um token já revogado (ADR-0035, casos 2 e 3).
   */
  async #resolveReplay(
    trx: TransactionClientContract,
    token: RefreshToken,
    meta: DeviceMetadata
  ): Promise<RotationOutcome> {
    const theft: RotationOutcome = { kind: 'theft', familyId: token.familyId }
    if (!token.replacedById || !this.#withinReuseWindow(token)) return theft

    const descendant = await this.#activeDescendant(trx, token)
    if (descendant === 'ended') return { kind: 'invalid' }

    const raw = await this.#replayableRaw(descendant, meta)
    if (!raw) return theft

    this.#logReplay(token, meta)
    return { kind: 'rotated', userId: token.userId, newRaw: raw, familyId: token.familyId }
  }

  /** Valor bruto do descendente, só quando ele veio do mesmo dispositivo. */
  async #replayableRaw(
    descendant: RefreshToken | null,
    meta: DeviceMetadata
  ): Promise<string | null> {
    if (!descendant || !this.#sameDevice(descendant, meta)) return null
    return this.#cachedRaw(descendant.id)
  }

  /** Valor bruto de um token emitido, lido e decifrado do cache da janela. */
  async #cachedRaw(tokenId: string): Promise<string | null> {
    const cached = await this.#issuedCache.get(this.#issuedKey(tokenId))
    const raw = cached ? encryption.decrypt<string>(cached) : null
    return typeof raw === 'string' && raw ? raw : null
  }

  /** Evento de segurança de todo replay atendido dentro da janela (ADR-0035). */
  #logReplay(token: RefreshToken, meta: DeviceMetadata) {
    logger.warn(
      {
        event: 'refresh_token_replay',
        familyId: token.familyId,
        userId: token.userId,
        deviceType: meta.deviceType,
        ipAddress: meta.ipAddress ?? null,
      },
      'refresh token replayed within the tolerance window'
    )
  }

  /** True quando o token foi revogado há no máximo `reuseWindowSeconds`. */
  #withinReuseWindow(token: RefreshToken): boolean {
    if (!token.revokedAt) return false
    return token.revokedAt.plus({ seconds: this.#reuseWindowSeconds }) >= DateTime.now()
  }

  /**
   * Mesmo `device_type` e `device_name` do token que fez a rotação e, quando os
   * dois lados identificam o aparelho, o mesmo `device_id` (ADR-0038).
   */
  #sameDevice(token: RefreshToken, meta: DeviceMetadata): boolean {
    return (
      this.#sameDeviceId(token.deviceId, meta.deviceId) &&
      token.deviceType === meta.deviceType &&
      (token.deviceName ?? null) === (meta.deviceName ?? null)
    )
  }

  /** Só diverge quando os dois lados identificam o aparelho. */
  #sameDeviceId(stored: string | null, requested: string | null | undefined): boolean {
    const hashed = this.#hashDeviceId(requested)
    return !stored || !hashed || stored === hashed
  }

  /**
   * Segue `replaced_by_id` até o primeiro descendente ativo, travando cada elo.
   *
   * @returns O descendente ativo; `'ended'` quando a cadeia termina numa revogação
   *          sem sucessor (sessão encerrada); `null` quando a cadeia está quebrada,
   *          expirada ou longa demais.
   */
  async #activeDescendant(
    trx: TransactionClientContract,
    token: RefreshToken
  ): Promise<RefreshToken | 'ended' | null> {
    let current: RefreshToken | 'ended' | null = token
    for (let hop = 0; hop < MAX_REFRESH_TOKEN_REPLAY_CHAIN; hop++) {
      current = await this.#nextLink(trx, current)
      if (current === null || current === 'ended' || !current.revokedAt) {
        return this.#unexpired(current)
      }
    }
    return null
  }

  /** Próximo elo da cadeia: o sucessor travado, `'ended'` sem sucessor, `null` se sumiu. */
  async #nextLink(
    trx: TransactionClientContract,
    token: RefreshToken
  ): Promise<RefreshToken | 'ended' | null> {
    if (!token.replacedById) return 'ended'
    const next = await RefreshToken.query({ client: trx })
      .where('id', token.replacedById)
      .forUpdate()
      .first()
    return next ?? null
  }

  /** Descarta um descendente ativo já expirado. */
  #unexpired(link: RefreshToken | 'ended' | null): RefreshToken | 'ended' | null {
    if (link instanceof RefreshToken && link.expiresAt < DateTime.now()) return null
    return link
  }

  /**
   * Abre a sessão de um login ou cadastro: uma por aparelho (ADR-0038). Com
   * `x-device-id`, as sessões ativas do mesmo usuário naquele aparelho são
   * revogadas na mesma transação que cria a nova, e os access tokens delas são
   * bloqueados em seguida. Sem o header, só cria a família nova (comportamento
   * anterior).
   *
   * @param userId Usuário que entrou.
   * @param meta Metadados do aparelho do request.
   * @param revocation Bloqueia os access tokens das sessões substituídas.
   * @returns Valor bruto e família da sessão nova.
   * @example
   * const { raw, familyId } = await service.startSession(user.id, meta, new AuthRevocationService())
   */
  async startSession(
    userId: string,
    meta: DeviceMetadata,
    revocation: Pick<AuthRevocationService, 'blockFamily'>
  ) {
    const deviceId = this.#hashDeviceId(meta.deviceId)
    const { created, replaced } = await db.transaction(async (trx) => {
      const families = deviceId ? await this.#activeFamiliesOnDevice(trx, userId, deviceId) : []
      if (families.length > 0) {
        await RefreshToken.query({ client: trx })
          .whereIn('familyId', families)
          .whereNull('revokedAt')
          .update({ revokedAt: DateTime.now() })
      }
      return { created: await this.create(userId, meta, undefined, trx), replaced: families }
    })

    await Promise.all(replaced.map((familyId) => revocation.blockFamily(familyId)))
    return { raw: created.raw, familyId: created.familyId }
  }

  /** Famílias com token ativo do usuário naquele aparelho. */
  async #activeFamiliesOnDevice(
    trx: TransactionClientContract,
    userId: string,
    deviceId: string
  ): Promise<string[]> {
    const rows = await RefreshToken.query({ client: trx })
      .where('userId', userId)
      .where('deviceId', deviceId)
      .whereNull('revokedAt')
      .distinct('familyId')
    return rows.map((row) => row.familyId)
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
    const sessions = await RefreshToken.query()
      .where('userId', userId)
      .whereNull('revokedAt')
      .where('expiresAt', '>', DateTime.now().toSQL())
      .orderBy('lastUsedAt', 'desc')

    // NOTE: cada rotação cria um token novo; o início da sessão é o primeiro da família.
    const startedAt = await this.#familyStarts(sessions.map((session) => session.familyId))
    for (const session of sessions) {
      session.$extras.startedAt = startedAt.get(session.familyId) ?? session.createdAt
    }
    return sessions
  }

  /** Data do primeiro token de cada família. */
  async #familyStarts(familyIds: string[]): Promise<Map<string, DateTime>> {
    if (familyIds.length === 0) return new Map()
    const rows = await db
      .from('refresh_tokens')
      .select('family_id')
      .min('created_at as started_at')
      .whereIn('family_id', familyIds)
      .groupBy('family_id')
    return new Map(
      rows.map((row: { family_id: string; started_at: Date }) => [
        row.family_id,
        DateTime.fromJSDate(row.started_at),
      ])
    )
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

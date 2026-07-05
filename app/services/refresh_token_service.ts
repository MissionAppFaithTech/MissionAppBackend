import { DeviceType } from '#enums/refresh_token/device_type'
import RefreshToken from '#models/refresh_token'
import { parseDurationToDays } from '#utils/duration'
import env from '#start/env'
import { DateTime } from 'luxon'
import { createHash, randomBytes } from 'node:crypto'
import { v7 as uuidv7 } from 'uuid'

export type DeviceMetadata = {
  deviceType: DeviceType
  deviceName?: string | null
  ipAddress?: string | null
}

/** Tamanho em bytes do refresh token bruto antes de virar hex — 512 bits de entropia. */
const REFRESH_TOKEN_BYTES = 64

function refreshTokenTtlInDays(deviceType: DeviceType): number {
  const raw =
    deviceType === DeviceType.MOBILE
      ? env.get('JWT_REFRESH_EXPIRES_IN_MOBILE')
      : env.get('JWT_REFRESH_EXPIRES_IN_WEB')

  return parseDurationToDays(raw)
}

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
  generate() {
    const raw = randomBytes(REFRESH_TOKEN_BYTES).toString('hex')
    const hash = createHash('sha256').update(raw).digest('hex')

    return { raw, hash }
  }

  /**
   * @param familyId Quando fornecido, vincula o token a uma sessão existente (rotação).
   *                 Quando omitido, uma nova família é criada (novo login).
   */
  async create(userId: string, meta: DeviceMetadata, familyId?: string) {
    const { raw, hash } = this.generate()
    const id = uuidv7()
    const resolvedFamilyId = familyId ?? uuidv7()

    await RefreshToken.create({
      id,
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
   * @throws {Error} Token não encontrado, expirado ou revogado.
   */
  async rotate(rawToken: string, meta: DeviceMetadata) {
    const hash = createHash('sha256').update(rawToken).digest('hex')
    const token = await RefreshToken.findBy('tokenHash', hash)

    if (!token) {
      throw new Error('Token inválido')
    }

    if (token.revokedAt || token.expiresAt < DateTime.now()) {
      if (token.revokedAt) {
        await RefreshToken.query()
          .where('familyId', token.familyId)
          .update({ revokedAt: DateTime.now() })
      }
      throw new Error('Token inválido')
    }

    token.revokedAt = DateTime.now()
    await token.save()

    const { raw: newRaw } = await this.create(token.userId, meta, token.familyId)

    return { userId: token.userId, newRaw, familyId: token.familyId }
  }

  /** Revoga todas as sessões (todas as famílias) de um usuário — logout global, troca de senha, suspensão. */
  async revokeAllForUser(userId: string) {
    await RefreshToken.query()
      .where('userId', userId)
      .whereNull('revokedAt')
      .update({ revokedAt: DateTime.now() })
  }

  /**
   * Revoga apenas uma família (uma sessão/dispositivo específico) — usado pelo
   * logout do dispositivo atual e pela revogação remota de uma sessão listada.
   * Escopado por `userId` para impedir que um usuário revogue a família de outro.
   */
  async revokeFamily(familyId: string, userId: string) {
    await RefreshToken.query()
      .where('familyId', familyId)
      .where('userId', userId)
      .whereNull('revokedAt')
      .update({ revokedAt: DateTime.now() })
  }

  /**
   * Lista as sessões ativas do usuário — uma linha por família, usando o token
   * mais recente de cada uma (é o único ainda não rotacionado/revogado).
   */
  async listActiveSessions(userId: string) {
    return RefreshToken.query()
      .where('userId', userId)
      .whereNull('revokedAt')
      .where('expiresAt', '>', DateTime.now().toSQL()!)
      .orderBy('lastUsedAt', 'desc')
  }
}

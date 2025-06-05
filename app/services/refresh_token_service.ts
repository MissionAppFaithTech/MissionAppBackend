import RefreshToken from '#models/refresh_token'
import { DateTime } from 'luxon'
import { createHash, randomBytes } from 'node:crypto'
import { v7 as uuidv7 } from 'uuid'

export class RefreshTokenService {
  // Gera um par token bruto + hash para armazenar
  generate() {
    const raw = randomBytes(64).toString('hex')
    const hash = createHash('sha256').update(raw).digest('hex')

    return { raw, hash }
  }

  // Cria novo refresh token para o usuário
  async create(userId: string, familyId?: string) {
    const { raw, hash } = this.generate()
    const id = uuidv7()

    await RefreshToken.create({
      id,
      userId,
      tokenHash: hash,
      familyId: familyId ?? id, // nova família se não informado
      expiresAt: DateTime.now().plus({ days: 7 }),
    })

    return raw // só o valor bruto sai daqui, nunca o hash
  }

  // Valida e rotaciona
  async rotate(rawToken: string) {
    const hash = createHash('sha256').update(rawToken).digest('hex')
    const token = await RefreshToken.findBy('tokenHash', hash)

    if (!token) {
      throw new Error('Token inválido')
    }

    if (token.revokedAt || token.expiresAt < DateTime.now()) {
      // Token revogado ou expirado — se revogado, pode ser roubo
      if (token.revokedAt) {
        // Reuso de token revogado: invalida a família inteira
        await RefreshToken.query()
          .where('familyId', token.familyId)
          .update({ revokedAt: DateTime.now() })
      }
      throw new Error('Token inválido')
    }

    // Revoga o token atual
    token.revokedAt = DateTime.now()
    await token.save()

    // Emite novo token da mesma família
    const newRaw = await this.create(token.userId, token.familyId)

    return { userId: token.userId, newRaw }
  }

  // Revoga todos os tokens de um usuário (troca de senha, etc.)
  async revokeAllForUser(userId: string) {
    await RefreshToken.query()
      .where('userId', userId)
      .whereNull('revokedAt')
      .update({ revokedAt: DateTime.now() })
  }
}

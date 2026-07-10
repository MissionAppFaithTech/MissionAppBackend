import { AUTH_UIDS } from '#constants/user'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import hash from '@adonisjs/core/services/hash'

/**
 * Mixin para adicionar helpers de autenticação
 */
export const AuthFinder = withAuthFinder(() => hash.use('argon'), {
  uids: [...AUTH_UIDS],
  passwordColumnName: 'passwordHash',
})

import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import hash from '@adonisjs/core/services/hash'

// TODO: Implementar login com username posteriormente.
/**
 * Mixin para adicionar helpers de autenticação
 */
export const AuthFinder = withAuthFinder(() => hash.use('argon'), {
  uids: ['email'],
  passwordColumnName: 'password_hash',
})

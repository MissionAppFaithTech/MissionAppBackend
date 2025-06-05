import { Exception } from '@adonisjs/core/exceptions'

/**
 * Lançada quando uma conta está temporariamente bloqueada por excesso de
 * tentativas de login falhadas — ver `LoginAttemptService`.
 */
export default class AccountLockedException extends Exception {
  static status = 423
  static code = 'E_ACCOUNT_LOCKED'

  constructor(
    message: string,
    readonly retryAfterSeconds: number
  ) {
    super(message)
  }
}

import { Exception } from '@adonisjs/core/exceptions'

export default class InvalidPasswordResetTokenException extends Exception {
  static status = 401
  static code = 'E_INVALID_PASSWORD_RESET_TOKEN'
}

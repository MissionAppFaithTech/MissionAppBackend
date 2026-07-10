import { Exception } from '@adonisjs/core/exceptions'

export default class InvalidRefreshTokenException extends Exception {
  static status = 401
  static code = 'E_INVALID_REFRESH_TOKEN'
}

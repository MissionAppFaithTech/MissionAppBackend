import { Exception } from '@adonisjs/core/exceptions'

export default class SessionNotFoundException extends Exception {
  static status = 404
  static code = 'E_SESSION_NOT_FOUND'
}

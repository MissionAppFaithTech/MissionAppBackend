import { Exception } from '@adonisjs/core/exceptions'

export default class NotFollowingException extends Exception {
  static status = 404
  static code = 'E_NOT_FOLLOWING'
}

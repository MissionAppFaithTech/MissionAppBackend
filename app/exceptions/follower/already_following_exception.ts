import { Exception } from '@adonisjs/core/exceptions'

export default class AlreadyFollowingException extends Exception {
  static status = 409
  static code = 'E_ALREADY_FOLLOWING'
}

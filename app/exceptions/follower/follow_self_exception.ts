import { Exception } from '@adonisjs/core/exceptions'

export default class FollowSelfException extends Exception {
  static status = 422
  static code = 'E_FOLLOW_SELF'
}

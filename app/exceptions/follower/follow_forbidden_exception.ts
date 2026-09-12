import { Exception } from '@adonisjs/core/exceptions'

export default class FollowForbiddenException extends Exception {
  static status = 403
  static code = 'E_FOLLOW_FORBIDDEN'
}

import { Exception } from '@adonisjs/core/exceptions'

export default class PostForbiddenException extends Exception {
  static status = 403
  static code = 'E_POST_FORBIDDEN'
}

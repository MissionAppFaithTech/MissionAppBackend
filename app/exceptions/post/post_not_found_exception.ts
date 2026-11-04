import { Exception } from '@adonisjs/core/exceptions'

export default class PostNotFoundException extends Exception {
  static status = 404
  static code = 'E_POST_NOT_FOUND'
}

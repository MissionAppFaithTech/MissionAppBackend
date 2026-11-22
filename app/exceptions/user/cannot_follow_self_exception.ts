import { Exception } from '@adonisjs/core/exceptions'

export default class CannotFollowSelfException extends Exception {
  static status = 422
  static code = 'E_CANNOT_FOLLOW_SELF'

  constructor(message = 'Você não pode seguir a si mesmo.') {
    super(message)
  }
}

import { Exception } from '@adonisjs/core/exceptions'

/**
 * Usuário inexistente, removido ou fora do que a operação aceita (ex.: seguir
 * quem não é missionário público) — o mesmo 404 para não revelar se o id existe.
 */
export default class UserNotFoundException extends Exception {
  static status = 404
  static code = 'E_USER_NOT_FOUND'

  constructor(message = 'Usuário não encontrado.') {
    super(message)
  }
}

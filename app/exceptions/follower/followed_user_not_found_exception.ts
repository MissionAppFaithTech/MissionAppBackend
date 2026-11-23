import { Exception } from '@adonisjs/core/exceptions'

/**
 * Perfil a seguir inexistente, fora do ar ou que não é de missionário — o
 * mesmo 404 para todos os casos, para não revelar se o username existe.
 */
export default class FollowedUserNotFoundException extends Exception {
  static status = 404
  static code = 'E_FOLLOWED_USER_NOT_FOUND'
}

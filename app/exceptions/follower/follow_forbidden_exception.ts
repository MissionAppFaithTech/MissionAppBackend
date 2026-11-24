import { Exception } from '@adonisjs/core/exceptions'

/** Só apoiadores e missionários seguem perfis (RF 4.4.1, RF 5.2). */
export default class FollowForbiddenException extends Exception {
  static status = 403
  static code = 'E_FOLLOW_FORBIDDEN'
}

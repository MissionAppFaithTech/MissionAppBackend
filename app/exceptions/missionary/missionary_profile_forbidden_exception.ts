import { Exception } from '@adonisjs/core/exceptions'

export default class MissionaryProfileForbiddenException extends Exception {
  static status = 403
  static code = 'E_MISSIONARY_PROFILE_FORBIDDEN'
}

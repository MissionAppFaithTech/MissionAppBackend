import { Exception } from '@adonisjs/core/exceptions'

export default class MissionaryProfileNotFoundException extends Exception {
  static status = 404
  static code = 'E_MISSIONARY_PROFILE_NOT_FOUND'
}

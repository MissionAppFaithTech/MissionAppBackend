import { Exception } from '@adonisjs/core/exceptions'

export default class MissionaryProfileAlreadyExistsException extends Exception {
  static status = 409
  static code = 'E_MISSIONARY_PROFILE_ALREADY_EXISTS'
}
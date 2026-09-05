import { Exception } from '@adonisjs/core/exceptions'

export default class MissionaryNotFoundException extends Exception {
  static status = 404
  static code = 'E_MISSIONARY_NOT_FOUND'
}

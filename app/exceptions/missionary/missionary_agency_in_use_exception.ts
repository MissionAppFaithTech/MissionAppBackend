import { Exception } from '@adonisjs/core/exceptions'

export default class MissionaryAgencyInUseException extends Exception {
  static status = 409
  static code = 'E_MISSIONARY_AGENCY_IN_USE'
}

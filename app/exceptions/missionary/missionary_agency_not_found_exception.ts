import { Exception } from '@adonisjs/core/exceptions'

export default class MissionaryAgencyNotFoundException extends Exception {
  static status = 404
  static code = 'E_MISSIONARY_AGENCY_NOT_FOUND'
}
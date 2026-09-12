import { Exception } from '@adonisjs/core/exceptions'

export default class SupporterProfileNotFoundException extends Exception {
  static status = 404
  static code = 'E_SUPPORTER_PROFILE_NOT_FOUND'
}

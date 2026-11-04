import { Exception } from '@adonisjs/core/exceptions'

export default class ImpactProjectAlreadyExistsException extends Exception {
  static status = 409
  static code = 'E_IMPACT_PROJECT_ALREADY_EXISTS'
}

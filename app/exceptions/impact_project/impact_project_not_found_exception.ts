import { Exception } from '@adonisjs/core/exceptions'

export default class ImpactProjectNotFoundException extends Exception {
  static status = 404
  static code = 'E_IMPACT_PROJECT_NOT_FOUND'
}

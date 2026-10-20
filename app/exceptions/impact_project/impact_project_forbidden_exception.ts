import { Exception } from '@adonisjs/core/exceptions'

export default class ImpactProjectForbiddenException extends Exception {
  static status = 403
  static code = 'E_IMPACT_PROJECT_FORBIDDEN'
}

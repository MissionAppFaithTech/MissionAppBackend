import { Exception } from '@adonisjs/core/exceptions'

export default class FaithCommunityForbiddenException extends Exception {
  static status = 403
  static code = 'E_FAITH_COMMUNITY_FORBIDDEN'
}

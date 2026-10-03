import { Exception } from '@adonisjs/core/exceptions'

export default class FaithCommunityNotFoundException extends Exception {
  static status = 404
  static code = 'E_FAITH_COMMUNITY_NOT_FOUND'
}

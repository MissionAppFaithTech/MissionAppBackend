import { Exception } from '@adonisjs/core/exceptions'

export default class MediaAssetForbiddenException extends Exception {
  static status = 403
  static code = 'E_MEDIA_ASSET_FORBIDDEN'
}

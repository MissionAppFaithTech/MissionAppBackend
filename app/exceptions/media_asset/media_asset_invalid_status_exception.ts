import { Exception } from '@adonisjs/core/exceptions'

export default class MediaAssetInvalidStatusException extends Exception {
  static status = 409
  static code = 'E_MEDIA_ASSET_INVALID_STATUS'
}

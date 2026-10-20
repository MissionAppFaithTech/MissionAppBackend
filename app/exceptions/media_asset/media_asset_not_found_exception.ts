import { Exception } from '@adonisjs/core/exceptions'

export default class MediaAssetNotFoundException extends Exception {
  static status = 404
  static code = 'E_MEDIA_ASSET_NOT_FOUND'
}

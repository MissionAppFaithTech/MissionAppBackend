import { Exception } from '@adonisjs/core/exceptions'

export default class MediaAssetNotAttachableException extends Exception {
  static status = 422
  static code = 'E_MEDIA_ASSET_NOT_ATTACHABLE'
}

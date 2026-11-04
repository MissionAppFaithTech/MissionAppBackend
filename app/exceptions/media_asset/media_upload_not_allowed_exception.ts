import { Exception } from '@adonisjs/core/exceptions'

export default class MediaUploadNotAllowedException extends Exception {
  static status = 422
  static code = 'E_MEDIA_UPLOAD_NOT_ALLOWED'
}

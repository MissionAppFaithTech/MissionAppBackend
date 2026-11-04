import { Exception } from '@adonisjs/core/exceptions'

/**
 * A postagem levaria o missionário além do limite de imagens (RF 8.2). Repetir o
 * pedido com `replaceOldestImages: true` confirma a substituição das mais antigas.
 */
export default class PostImageLimitReachedException extends Exception {
  static status = 409
  static code = 'E_POST_IMAGE_LIMIT_REACHED'
}

import { Exception } from '@adonisjs/core/exceptions'

/**
 * Lançada quando o cursor de paginação recebido não pode ser decodificado
 * (ADR-0033). Clientes só devem repassar o `meta.nextCursor` recebido.
 */
export default class InvalidCursorException extends Exception {
  static status = 422
  static code = 'E_INVALID_CURSOR'

  constructor(message = 'Cursor de paginação inválido.') {
    super(message)
  }
}

import { Exception } from '@adonisjs/core/exceptions'

/**
 * Lançada quando a rotação de refresh token não consegue registrar o token
 * emitido no cache da janela de tolerância (ADR-0035). A transação é desfeita e
 * nada é revogado: o cliente pode tentar de novo em instantes.
 */
export default class RefreshUnavailableException extends Exception {
  static status = 503
  static code = 'E_REFRESH_UNAVAILABLE'

  readonly retryAfterSeconds = 1

  constructor(message = 'Não foi possível renovar a sessão agora. Tente novamente em instantes.') {
    super(message)
  }
}

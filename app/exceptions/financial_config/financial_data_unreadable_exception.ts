import { Exception } from '@adonisjs/core/exceptions'

/**
 * Um dado bancário gravado não pôde ser descriptografado — chave errada,
 * chave antiga fora de `FINANCIAL_DATA_ENCRYPTION_PREVIOUS_KEYS` ou valor
 * adulterado. Responde 500: é falha de operação, não do cliente, e esconder
 * o dado como "pendente" levaria doações para lugar nenhum.
 */
export default class FinancialDataUnreadableException extends Exception {
  static status = 500
  static code = 'E_FINANCIAL_DATA_UNREADABLE'
}

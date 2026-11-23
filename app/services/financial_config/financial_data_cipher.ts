import FinancialDataUnreadableException from '#exceptions/financial_config/financial_data_unreadable_exception'
import encryption from '@adonisjs/core/services/encryption'

/** Colunas de `financial_configs` gravadas cifradas. */
export type EncryptedFinancialField =
  'pixKey' | 'agency' | 'accountNumber' | 'holderName' | 'holderDocument'

/**
 * Cifra e decifra os dados bancários de um missionário com AES-256-GCM e a
 * chave dedicada `financial` (NF 1.1).
 *
 * Cada valor é amarrado ao missionário e à coluna pelo `purpose` do GCM: um
 * texto cifrado copiado para outra linha ou outra coluna (por quem tem acesso
 * só ao banco) não descriptografa, em vez de virar a conta de outra pessoa.
 */
export class FinancialDataCipher {
  constructor(private readonly missionaryId: string) {}

  encrypt(field: EncryptedFinancialField, value: string | null): string | null {
    if (value === null) return null
    return encryption.use('financial').encrypt(value, { purpose: this.purposeOf(field) })
  }

  /**
   * @throws {FinancialDataUnreadableException} Valor gravado que não descriptografa.
   */
  decrypt(field: EncryptedFinancialField, value: string | null): string | null {
    if (value === null) return null

    const plain = encryption.use('financial').decrypt<string>(value, this.purposeOf(field))
    if (typeof plain !== 'string') {
      throw new FinancialDataUnreadableException(
        'Não foi possível ler os dados de doação deste missionário'
      )
    }
    return plain
  }

  private purposeOf(field: EncryptedFinancialField): string {
    return `financial_config:${this.missionaryId}:${field}`
  }
}

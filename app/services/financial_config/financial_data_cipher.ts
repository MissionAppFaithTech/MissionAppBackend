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
   * Falha alto em vez de devolver `null`: tratar o valor como "não configurado"
   * esconderia o problema e mandaria o apoiador para um método vazio. É erro
   * interno (chave errada, chave antiga fora de `_PREVIOUS_KEYS` ou valor
   * adulterado), então sai como 500 genérico e o detalhe fica só no log.
   *
   * @throws {Error} Valor gravado que não descriptografa.
   */
  decrypt(field: EncryptedFinancialField, value: string | null): string | null {
    if (value === null) return null

    const plain = encryption.use('financial').decrypt<string>(value, this.purposeOf(field))
    if (typeof plain !== 'string') {
      throw new Error(
        `Dado bancário ilegível em financial_configs (missionário ${this.missionaryId}, campo ${field})`
      )
    }
    return plain
  }

  private purposeOf(field: EncryptedFinancialField): string {
    return `financial_config:${this.missionaryId}:${field}`
  }
}

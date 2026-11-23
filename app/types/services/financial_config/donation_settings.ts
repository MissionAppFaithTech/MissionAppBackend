import type { BankAccountType } from '#enums/financial_config/bank_account_type'
import type { PixKeyType } from '#enums/financial_config/pix_key_type'

/** Chave Pix já descriptografada. */
export type PixDetails = {
  keyType: PixKeyType
  key: string
}

/** Dados de transferência bancária já descriptografados; documento só com dígitos. */
export type BankTransferDetails = {
  bankName: string
  bankNumber: string
  agency: string
  accountNumber: string
  accountType: BankAccountType
  holderName: string
  holderDocument: string
}

/**
 * Área de doação do missionário em claro (RF 12.1): mensagem aos apoiadores e
 * os dois métodos, cada um `null` enquanto estiver pendente.
 */
export type DonationSettings = {
  missionaryId: string
  donationMessage: string | null
  pix: PixDetails | null
  bankTransfer: BankTransferDetails | null
}

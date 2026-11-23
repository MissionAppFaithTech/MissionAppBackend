import type { DonationSettings } from '#types/services/financial_config/donation_settings'
import { documentMask } from '#utils/document_mask'
import { BaseTransformer } from '@adonisjs/core/transformers'

/**
 * Área de doação vista pelo apoiador ou visitante (RF 12.2): só os métodos
 * ativos e o documento do titular mascarado. O pagamento acontece fora do app.
 */
export default class PublicDonationTransformer extends BaseTransformer<DonationSettings> {
  toObject() {
    const { donationMessage, pix, bankTransfer } = this.resource

    return {
      donationMessage,
      pix: pix ? { keyType: pix.keyType, key: pix.key } : null,
      bankTransfer: bankTransfer
        ? {
            bankName: bankTransfer.bankName,
            bankNumber: bankTransfer.bankNumber,
            agency: bankTransfer.agency,
            accountNumber: bankTransfer.accountNumber,
            accountType: bankTransfer.accountType,
            holderName: bankTransfer.holderName,
            holderDocument: documentMask(bankTransfer.holderDocument),
          }
        : null,
    }
  }
}

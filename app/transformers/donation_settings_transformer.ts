import { DonationMethodStatus } from '#enums/financial_config/donation_method_status'
import type { DonationSettings } from '#types/services/financial_config/donation_settings'
import { BaseTransformer } from '@adonisjs/core/transformers'

/**
 * Área de doação vista pelo dono (ou ADMIN), em claro e com o status de cada
 * método (RF 12.1.4). Nunca use na leitura pública: o documento sai completo.
 */
export default class DonationSettingsTransformer extends BaseTransformer<DonationSettings> {
  toObject() {
    const { missionaryId, donationMessage, pix, bankTransfer } = this.resource

    return {
      missionaryId,
      donationMessage,
      pix: {
        status: pix ? DonationMethodStatus.ACTIVE : DonationMethodStatus.PENDING,
        keyType: pix?.keyType ?? null,
        key: pix?.key ?? null,
      },
      bankTransfer: {
        status: bankTransfer ? DonationMethodStatus.ACTIVE : DonationMethodStatus.PENDING,
        bankName: bankTransfer?.bankName ?? null,
        bankNumber: bankTransfer?.bankNumber ?? null,
        agency: bankTransfer?.agency ?? null,
        accountNumber: bankTransfer?.accountNumber ?? null,
        accountType: bankTransfer?.accountType ?? null,
        holderName: bankTransfer?.holderName ?? null,
        holderDocument: bankTransfer?.holderDocument ?? null,
      },
    }
  }
}

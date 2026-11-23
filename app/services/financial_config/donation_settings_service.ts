import FinancialConfig from '#models/financial_config'
import type Missionary from '#models/missionary'
import type User from '#models/user'
import { ResolveMissionaryService } from '#services/missionary/resolve_missionary_service'
import type {
  BankTransferDetails,
  DonationSettings,
  PixDetails,
} from '#types/services/financial_config/donation_settings'
import db from '@adonisjs/lucid/services/db'
import { FinancialDataCipher } from './financial_data_cipher.ts'

type UpdateDonationSettingsPayload = {
  donationMessage?: string | null
  pix?: PixDetails | null
  bankTransfer?: BankTransferDetails | null
}

/**
 * Área de doação do missionário (RF 12): mensagem aos apoiadores, Pix só com
 * a chave (ADR-0039) e transferência bancária. O pagamento acontece fora do
 * app (RF 12.3); aqui só se guardam, cifrados, os dados para o apoiador copiar.
 */
export class DonationSettingsService {
  /**
   * Configuração do missionário do ator (ou do `targetMissionaryId`, se ADMIN).
   */
  async show(actor: User, targetMissionaryId?: string): Promise<DonationSettings> {
    const missionary = await new ResolveMissionaryService().execute(actor, targetMissionaryId)
    return this.read(missionary)
  }

  /**
   * Atualiza parcialmente: campo omitido fica como está, `null` limpa o método
   * (volta a pendente) e objeto substitui o método inteiro.
   */
  async update(
    actor: User,
    payload: UpdateDonationSettingsPayload,
    targetMissionaryId?: string
  ): Promise<DonationSettings> {
    const missionary = await new ResolveMissionaryService().execute(actor, targetMissionaryId)
    const cipher = new FinancialDataCipher(missionary.id)

    await db.transaction(async (trx) => {
      if (payload.donationMessage !== undefined) {
        missionary.useTransaction(trx)
        missionary.donationMessage = payload.donationMessage
        await missionary.save()
      }

      if (payload.pix === undefined && payload.bankTransfer === undefined) {
        return
      }

      // NOTE: forUpdate serializa duas edições simultâneas do mesmo missionário;
      // sem ele, as duas tentariam criar a linha e uma cairia na unique 1:1
      const config =
        (await FinancialConfig.query({ client: trx })
          .where('missionaryId', missionary.id)
          .forUpdate()
          .first()) ?? new FinancialConfig().merge({ missionaryId: missionary.id })
      config.useTransaction(trx)

      if (payload.pix !== undefined) {
        config.merge({
          pixKeyType: payload.pix?.keyType ?? null,
          pixKey: cipher.encrypt('pixKey', payload.pix?.key ?? null),
        })
      }

      if (payload.bankTransfer !== undefined) {
        const transfer = payload.bankTransfer
        config.merge({
          bankName: transfer?.bankName ?? null,
          bankNumber: transfer?.bankNumber ?? null,
          accountType: transfer?.accountType ?? null,
          agency: cipher.encrypt('agency', transfer?.agency ?? null),
          accountNumber: cipher.encrypt('accountNumber', transfer?.accountNumber ?? null),
          holderName: cipher.encrypt('holderName', transfer?.holderName ?? null),
          holderDocument: cipher.encrypt('holderDocument', transfer?.holderDocument ?? null),
        })
      }

      await config.save()
    })

    return this.read(missionary)
  }

  /**
   * Lê e descriptografa a configuração de um missionário já resolvido — usado
   * também pela leitura pública, que localiza o missionário pelo username.
   */
  async read(missionary: Missionary): Promise<DonationSettings> {
    const config = await FinancialConfig.findBy('missionaryId', missionary.id)

    return {
      missionaryId: missionary.id,
      donationMessage: missionary.donationMessage ?? null,
      pix: config ? this.pixOf(config) : null,
      bankTransfer: config ? this.bankTransferOf(config) : null,
    }
  }

  private pixOf(config: FinancialConfig): PixDetails | null {
    const cipher = new FinancialDataCipher(config.missionaryId)
    const key = cipher.decrypt('pixKey', config.pixKey)

    if (!key || !config.pixKeyType) return null
    return { keyType: config.pixKeyType, key }
  }

  private bankTransferOf(config: FinancialConfig): BankTransferDetails | null {
    const cipher = new FinancialDataCipher(config.missionaryId)
    const agency = cipher.decrypt('agency', config.agency)
    const accountNumber = cipher.decrypt('accountNumber', config.accountNumber)
    const holderName = cipher.decrypt('holderName', config.holderName)
    const holderDocument = cipher.decrypt('holderDocument', config.holderDocument)

    // NOTE: o método só fica ativo completo — a escrita grava todos os campos
    // juntos, então um campo faltando aqui só aparece em linha legada/parcial
    if (
      !config.bankName ||
      !config.bankNumber ||
      !config.accountType ||
      !agency ||
      !accountNumber ||
      !holderName ||
      !holderDocument
    ) {
      return null
    }

    return {
      bankName: config.bankName,
      bankNumber: config.bankNumber,
      accountType: config.accountType,
      agency,
      accountNumber,
      holderName,
      holderDocument,
    }
  }
}

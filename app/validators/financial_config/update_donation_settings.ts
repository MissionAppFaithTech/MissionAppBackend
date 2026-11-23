import { BankAccountType } from '#enums/financial_config/bank_account_type'
import { PixKeyType } from '#enums/financial_config/pix_key_type'
import { pixKey } from '#validators/shared/fields/pix_key'
import { text } from '#validators/shared/fields/text'
import vine from '@vinejs/vine'

/**
 * CPF (11 dígitos) ou CNPJ (14) do titular, salvo só com dígitos. Normaliza
 * numa regra, e não em `.transform()`, que só roda depois das validações.
 */
const holderDocumentRule = vine.createRule((value, _options, field) => {
  if (typeof value !== 'string') return

  const digits = value.replace(/\D/g, '')
  if (/^(\d{11}|\d{14})$/.test(digits)) {
    field.mutate(digits, field)
  } else {
    field.report(
      'Informe o CPF (11 dígitos) ou o CNPJ (14 dígitos) do titular.',
      'holderDocument',
      field
    )
  }
})

// NOTE: `null` limpa o método (volta a pendente); objeto substitui o método
// inteiro, por isso todos os campos de cada método são obrigatórios
export const updateDonationSettingsValidator = vine.create({
  donationMessage: vine.string().trim().maxLength(5000).nullable().optional(),
  pix: vine
    .object({
      keyType: vine.enum(Object.values(PixKeyType)),
      key: pixKey(),
    })
    .nullable()
    .optional(),
  bankTransfer: vine
    .object({
      bankName: text(1, 120),
      bankNumber: vine
        .string()
        .trim()
        .regex(/^\d{3}$/),
      agency: vine
        .string()
        .trim()
        .regex(/^\d{1,5}(-[\dxX])?$/),
      accountNumber: vine
        .string()
        .trim()
        .regex(/^\d{1,20}-?[\dxX]$/),
      accountType: vine.enum(Object.values(BankAccountType)),
      holderName: text(2, 255),
      holderDocument: text(11, 18).use(holderDocumentRule()),
    })
    .nullable()
    .optional(),
})

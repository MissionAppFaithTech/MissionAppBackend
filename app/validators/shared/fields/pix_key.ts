import { PixKeyType } from '#enums/financial_config/pix_key_type'
import { text } from '#validators/shared/fields/text'
import vine from '@vinejs/vine'

const PIX_KEY_TYPES = new Set<string>(Object.values(PixKeyType))

/**
 * Formato de cada tipo de chave conforme o DICT do Banco Central: CPF e CNPJ
 * só com dígitos, e-mail com até 77 caracteres, telefone em E.164 e chave
 * aleatória (EVP) como UUID.
 */
const PIX_KEY_FORMAT: Record<PixKeyType, RegExp> = {
  [PixKeyType.CPF]: /^\d{11}$/,
  [PixKeyType.CNPJ]: /^\d{14}$/,
  [PixKeyType.EMAIL]: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  [PixKeyType.PHONE]: /^\+[1-9]\d{1,14}$/,
  [PixKeyType.RANDOM]: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
}

const PIX_KEY_INVALID: Record<PixKeyType, string> = {
  [PixKeyType.CPF]: 'Informe os 11 dígitos do CPF da chave Pix.',
  [PixKeyType.CNPJ]: 'Informe os 14 dígitos do CNPJ da chave Pix.',
  [PixKeyType.EMAIL]: 'Informe um e-mail válido de até 77 caracteres para a chave Pix.',
  [PixKeyType.PHONE]: 'Informe o telefone da chave Pix no formato +5511912345678.',
  [PixKeyType.RANDOM]: 'Informe a chave aleatória no formato UUID.',
}

/** Normaliza para o formato salvo: dígitos em CPF/CNPJ, minúsculas em e-mail e EVP. */
function normalizePixKey(type: PixKeyType, value: string): string {
  switch (type) {
    case PixKeyType.CPF:
    case PixKeyType.CNPJ:
      return value.replace(/\D/g, '')
    case PixKeyType.PHONE:
      return value.replace(/[\s()-]/g, '')
    default:
      return value.trim().toLowerCase()
  }
}

/**
 * Valida e normaliza a chave conforme o `keyType` irmão. Sem tipo válido,
 * deixa a regra do próprio `keyType` responder.
 */
const pixKeyRule = vine.createRule((value, _options, field) => {
  const keyType = (field.parent as Record<string, unknown> | undefined)?.keyType
  if (typeof value !== 'string' || typeof keyType !== 'string' || !PIX_KEY_TYPES.has(keyType)) {
    return
  }

  const type = keyType as PixKeyType
  const normalized = normalizePixKey(type, value)
  const tooLong = type === PixKeyType.EMAIL && normalized.length > 77

  if (PIX_KEY_FORMAT[type].test(normalized) && !tooLong) {
    field.mutate(normalized, field)
  } else {
    field.report(PIX_KEY_INVALID[type], 'pixKey', field)
  }
})

/** Chave Pix (ADR-0039: só a chave, sem QR Code), normalizada pelo `keyType`. */
export const pixKey = () => text(1, 140).use(pixKeyRule())

import { IdentityType } from '#enums/missionary/identity_type'

/** Formato salvo no banco (`chk_missionaries_identity_document_format`). */
const IDENTITY_DOCUMENT_FORMAT: Record<IdentityType, RegExp> = {
  [IdentityType.CPF]: /^\d{11}$/,
  [IdentityType.PASSPORT]: /^[A-Z0-9]+$/,
}

/** Mensagem do 422 quando o documento já pertence a outro missionário. */
export const IDENTITY_DOCUMENT_TAKEN: Record<IdentityType, string> = {
  [IdentityType.CPF]: 'Este CPF já está cadastrado.',
  [IdentityType.PASSPORT]: 'Este passaporte já está cadastrado.',
}

/** Mensagem do 422 quando o documento não tem o formato do tipo informado. */
export const IDENTITY_DOCUMENT_INVALID: Record<IdentityType, string> = {
  [IdentityType.CPF]: 'Informe os 11 dígitos do CPF.',
  [IdentityType.PASSPORT]: 'Informe o número do passaporte com letras e números.',
}

/**
 * Normaliza o documento para comparar e salvar sempre no mesmo formato: CPF só
 * com dígitos e passaporte em maiúsculas, só com letras e números. Assim
 * `123.456.789-09` e `12345678909` são o mesmo CPF, e `ab 12-34` e `AB1234`, o
 * mesmo passaporte. Não confere dígito verificador: um passaporte estrangeiro
 * pode ter 11 dígitos.
 *
 * @param type Tipo informado pelo cliente.
 * @param value Documento como digitado.
 * @returns O documento normalizado (pode ser vazio se só havia pontuação).
 * @example
 * normalizeIdentityDocument(IdentityType.CPF, '123.456.789-09') // '12345678909'
 * normalizeIdentityDocument(IdentityType.PASSPORT, 'ab 12-34') // 'AB1234'
 */
export function normalizeIdentityDocument(type: IdentityType, value: string): string {
  return type === IdentityType.CPF
    ? value.replace(/\D/g, '')
    : value.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

/** Se o documento já normalizado tem o formato salvo para o tipo. */
export function isIdentityDocumentValid(type: IdentityType, normalized: string): boolean {
  return IDENTITY_DOCUMENT_FORMAT[type].test(normalized)
}

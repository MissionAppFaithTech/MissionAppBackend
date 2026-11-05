import { IdentityType } from '#enums/missionary/identity_type'
import {
  IDENTITY_DOCUMENT_INVALID,
  isIdentityDocumentValid,
  normalizeIdentityDocument,
} from '#utils/identity_document'
import { text } from '#validators/shared/fields/text'
import vine from '@vinejs/vine'

const IDENTITY_TYPES = new Set<string>(Object.values(IdentityType))

/** `identityType` irmão, quando é um dos tipos aceitos. */
function siblingIdentityType(parent: unknown): IdentityType | null {
  const type = (parent as Record<string, unknown> | undefined)?.identityType
  return typeof type === 'string' && IDENTITY_TYPES.has(type) ? (type as IdentityType) : null
}

/**
 * Normaliza o documento conforme o `identityType` irmão (CPF só com dígitos,
 * passaporte em maiúsculas sem pontuação) e recusa o que não ficar no formato
 * salvo no banco. Sem tipo válido, deixa a regra do próprio `identityType`
 * responder.
 */
const identityDocumentRule = vine.createRule((value, _options, field) => {
  const identityType = siblingIdentityType(field.parent)
  if (typeof value !== 'string' || !identityType) return

  const normalized = normalizeIdentityDocument(identityType, value)
  if (isIdentityDocumentValid(identityType, normalized)) {
    field.mutate(normalized, field)
  } else {
    field.report(IDENTITY_DOCUMENT_INVALID[identityType], 'identityDocument', field)
  }
})

/** Documento do missionário (CPF ou passaporte), já normalizado. */
export const identityDocument = () => text(1, 50).use(identityDocumentRule())

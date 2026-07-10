import vine from '@vinejs/vine'
import { ipAddress } from '#validators/shared/fields/ip_address'
import { clientMetadataHeadersSchema } from '#validators/shared/schemas/client_metadata_headers'

/**
 * Validator usado por `toDeviceMetadata()` (`#utils/client_metadata`) para
 * validar, isoladamente do validator do domínio (login, signup, refresh), os
 * headers de metadados de cliente e o IP da requisição.
 */
export const clientMetadataValidator = () =>
  vine.create({
    headers: clientMetadataHeadersSchema(),
    ipAddress: ipAddress(),
  })

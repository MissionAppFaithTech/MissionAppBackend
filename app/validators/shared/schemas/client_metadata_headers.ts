import { clientType } from '#validators/shared/fields/client_type'
import { deviceName } from '#validators/shared/fields/device_name'
import vine from '@vinejs/vine'

/**
 * Sub-schema para o namespace `headers` mesclado automaticamente por
 * `request.validateUsing()`. Ausência de `x-client-type` é interpretada como
 * cliente web pelo mapeamento em `#utils/client_metadata` — aqui só se
 * valida o formato, quando o header está presente.
 */
export const clientMetadataHeadersSchema = () =>
  vine.object({
    'x-client-type': clientType().optional(),
    'x-device-name': deviceName().optional(),
  })

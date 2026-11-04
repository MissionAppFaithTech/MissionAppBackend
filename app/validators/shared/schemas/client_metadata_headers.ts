import { clientType } from '#validators/shared/fields/client_type'
import { deviceId } from '#validators/shared/fields/device_id'
import { deviceKind } from '#validators/shared/fields/device_kind'
import { deviceName } from '#validators/shared/fields/device_name'
import vine from '@vinejs/vine'

/**
 * Sub-schema para o namespace `headers` mesclado automaticamente por
 * `request.validateUsing()`. Ausência de `x-client-type` é interpretada como
 * cliente web pelo mapeamento em `#utils/client_metadata` — aqui só se
 * valida o formato, quando o header está presente. `x-device-id` e
 * `x-device-kind` identificam o aparelho da sessão (ADR-0038).
 */
export const clientMetadataHeadersSchema = () =>
  vine.object({
    'x-client-type': clientType().optional(),
    'x-device-name': deviceName().optional(),
    'x-device-id': deviceId().optional(),
    'x-device-kind': deviceKind().optional(),
  })

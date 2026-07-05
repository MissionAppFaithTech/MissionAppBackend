/**
 * Limites de coluna de `refresh_tokens`, compartilhados entre a migration
 * (Knex) e o helper que lê os headers de metadado do cliente
 * (`app/auth/client_context.ts`). O schema OpenAPI
 * (`docs/api/v1/auth/auth.openapi.yaml`) espelha estes valores mas não pode
 * importá-los — mantenha-o em sincronia manualmente ao alterar aqui.
 */
export const DEVICE_TYPE_MAX_LENGTH = 16
export const DEVICE_NAME_MAX_LENGTH = 120
export const IP_ADDRESS_MAX_LENGTH = 45

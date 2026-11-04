/**
 * Limites de coluna de `refresh_tokens`, compartilhados entre a migration
 * (Knex) e o helper que lê os headers de metadado do cliente
 * (`app/utils/client_metadata.ts`). O schema OpenAPI
 * (`docs/api/v1/auth/auth.openapi.yaml`) espelha estes valores mas não pode
 * importá-los — mantenha-o em sincronia manualmente ao alterar aqui.
 */
export const DEVICE_TYPE_MAX_LENGTH = 16
export const DEVICE_NAME_MAX_LENGTH = 120
export const IP_ADDRESS_MAX_LENGTH = 45
/** `device_id` guarda o SHA-256 em hex do identificador do aparelho (ADR-0038). */
export const DEVICE_ID_HASH_LENGTH = 64
export const DEVICE_KIND_MAX_LENGTH = 16

/** Limites do header `x-device-id` (identificador aleatório gerado pelo cliente). */
export const DEVICE_ID_MIN_LENGTH = 16
export const DEVICE_ID_MAX_LENGTH = 128

/** Tamanho em bytes do refresh token bruto antes de virar hex — 512 bits de entropia. */
export const REFRESH_TOKEN_BYTES = 64

/** Janela de tolerância padrão (ADR-0035) quando REFRESH_TOKEN_REUSE_WINDOW_SECONDS está ausente. */
export const DEFAULT_REFRESH_TOKEN_REUSE_WINDOW_SECONDS = 30

/** Máximo de elos `replaced_by_id` seguidos num replay antes de tratar como roubo. */
export const MAX_REFRESH_TOKEN_REPLAY_CHAIN = 5

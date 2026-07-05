import { UNIT_SECONDS } from '#constants/duration'

/**
 * Converte strings de duração no formato "<N><s|m|h|d>" (ex: "15m", "7d") em
 * segundos. Mesmo formato aceito por `SignJWT.setExpirationTime` do jose,
 * usado para manter os valores de configuração consistentes entre o payload
 * JWT e os TTLs de chaves no DragonflyDB.
 */
export function parseDurationToSeconds(value: string): number {
  const match = value.match(/^(\d+)(s|m|h|d)$/)
  if (!match) {
    throw new Error(`Duração inválida: "${value}" — use o formato "<N><s|m|h|d>" (ex: "15m", "7d")`)
  }
  return Number(match[1]) * UNIT_SECONDS[match[2]]
}

/**
 * Converte strings de duração no formato "<N>d" em dias — usado para TTLs de
 * refresh token, onde a granularidade de dias é suficiente e mais legível
 * que segundos.
 */
export function parseDurationToDays(value: string): number {
  const match = value.match(/^(\d+)d$/)
  if (!match) {
    throw new Error(`Duração inválida: "${value}" — use o formato "<N>d" (ex: "7d")`)
  }
  return Number(match[1])
}

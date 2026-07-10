import { UNIT_SECONDS } from '#constants/duration'

/**
 * Converte strings de duração no formato "<N><s|m|h|d>" em segundos. Mesmo
 * formato aceito por `SignJWT.setExpirationTime` do jose, usado para manter
 * os valores de configuração consistentes entre o payload JWT e os TTLs de
 * chaves no DragonflyDB.
 *
 * @param value Duração no formato "<N><s|m|h|d>" (ex: "15m", "7d").
 * @returns O valor convertido para segundos.
 * @throws {Error} Quando `value` não corresponde ao formato esperado.
 * @example
 * parseDurationToSeconds('15m') // 900
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
 *
 * @param value Duração no formato "<N>d" (ex: "7d").
 * @returns O valor convertido para dias.
 * @throws {Error} Quando `value` não corresponde ao formato esperado.
 * @example
 * parseDurationToDays('7d') // 7
 */
export function parseDurationToDays(value: string): number {
  const match = value.match(/^(\d+)d$/)
  if (!match) {
    throw new Error(`Duração inválida: "${value}" — use o formato "<N>d" (ex: "7d")`)
  }
  return Number(match[1])
}

/**
 * Calcula o TTL restante (em segundos) até um timestamp epoch em segundos
 * (ex: claim `exp` de um JWT) — centraliza a conversão epoch-ms → epoch-s
 * do `Date.now()`, evitando erro de unidade nos call sites.
 *
 * @param epochSeconds Timestamp epoch em segundos (ex: `payload.exp`).
 * @returns Segundos restantes. Pode ser negativo/zero se já expirado.
 * @example
 * const ttlSeconds = secondsUntil(guard.currentTokenExpiresAt)
 */
export function secondsUntil(epochSeconds: number): number {
  return epochSeconds - Math.floor(Date.now() / 1000)
}

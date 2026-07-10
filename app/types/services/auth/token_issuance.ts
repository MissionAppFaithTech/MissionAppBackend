/** Par de tokens retornado ao cliente após login, signup ou refresh (ver ADR-0021). */
export type IssuedTokens = { accessToken: string; refreshToken: string }

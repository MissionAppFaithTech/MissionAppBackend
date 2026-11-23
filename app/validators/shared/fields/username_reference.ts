import vine from '@vinejs/vine'

/**
 * Username de um perfil existente (URL, alvo de seguir). Normaliza para
 * minúsculo antes das regras do username, para aceitar links com maiúsculas.
 */
export const usernameReference = () =>
  vine
    .string()
    .trim()
    .toLowerCase()
    .minLength(3)
    .maxLength(32)
    .regex(/^[a-z0-9_]+$/)

import vine from '@vinejs/vine'

/**
 * Username do perfil público na URL. Normaliza para minúsculo antes das regras
 * do username (3–32, `[a-z0-9_]`), para aceitar links com maiúsculas.
 */
export const publicMissionaryProfileValidator = vine.create({
  params: vine.object({
    username: vine
      .string()
      .trim()
      .toLowerCase()
      .minLength(3)
      .maxLength(32)
      .regex(/^[a-z0-9_]+$/),
  }),
})

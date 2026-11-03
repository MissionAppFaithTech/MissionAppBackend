import { id } from '#validators/shared/fields/id'
import vine from '@vinejs/vine'

/**
 * `:id` das rotas `/missionaries/{id}/*`. Opcional porque as mesmas actions
 * atendem `/missionaries/*`, que editam o perfil do próprio usuário.
 */
export const missionaryIdValidator = vine.create({
  params: vine.object({
    id: id().optional(),
  }),
})

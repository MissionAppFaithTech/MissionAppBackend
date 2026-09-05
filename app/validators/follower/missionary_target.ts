import { id } from '#validators/shared/fields/id'
import vine from '@vinejs/vine'

// Reaproveitado por FollowingController.store (seguir) e .destroy (deixar de
// seguir) — os dois handlers validam exatamente o mesmo shape.
export const missionaryTargetValidator = vine.create({
  params: vine.object({
    missionaryId: id(),
  }),
})

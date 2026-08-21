import { UsernameAvailabilityService } from '#services/user/username_availability_service'
import { usernameAvailabilityValidator } from '#validators/user/username_availability'
import type { HttpContext } from '@adonisjs/core/http'

export default class UsernameAvailabilityController {
  async show({ request, serialize }: HttpContext) {
    const { username } = await request.validateUsing(usernameAvailabilityValidator)
    const result = await new UsernameAvailabilityService().execute(username)

    return serialize(result)
  }
}

import { UserRole } from '#enums/user/user_role'
import SupporterProfileNotFoundException from '#exceptions/supporter/supporter_profile_not_found_exception'
import User from '#models/user'
import UserTransformer from '#transformers/user_transformer'
import type { HttpContext } from '@adonisjs/core/http'

export default class ProfileController {
  async show({ request, serialize }: HttpContext) {
    const username = request.param('username') as string

    const supporter = await User.query()
      .where('username', username)
      .andWhere('role', UserRole.SUPPORTER)
      .whereNull('deletedAt')
      .first()

    if (!supporter) {
      throw new SupporterProfileNotFoundException('Perfil de apoiador não encontrado')
    }

    return serialize(UserTransformer.transform(supporter).useVariant('toPublic'))
  }
}

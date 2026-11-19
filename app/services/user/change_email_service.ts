import User from '#models/user'
import { fieldValidationError } from '#utils/field_validation_error'
import { uniqueViolationFieldError } from '#utils/unique_violation_field_error'
import db from '@adonisjs/lucid/services/db'

type ChangeEmailPayload = {
  email: string
  currentPassword: string
}

/**
 * Atualiza o e-mail de login da conta autenticada mediante confirmação da
 * senha atual e validação de unicidade.
 */
export class ChangeEmailService {
  /**
   * Confirma a senha atual do usuário e altera seu e-mail de acesso.
   *
   * @param actor Usuário autenticado que solicita a troca.
   * @param payload Novo e-mail normalizado e senha atual em texto plano.
   * @returns O usuário atualizado com a relação `profilePicture` carregada.
   * @throws {errors.E_VALIDATION_ERROR} Senha atual incorreta, novo e-mail igual ao atual ou já utilizado por outra conta.
   * @example
   * const updated = await new ChangeEmailService().execute(user, { email: 'novo@exemplo.com', currentPassword: 'Senha@123' })
   */
  async execute(actor: User, payload: ChangeEmailPayload): Promise<User> {
    await actor.validatePassword(payload.currentPassword)

    if (payload.email === actor.email) {
      throw fieldValidationError(
        'email',
        'same_email',
        'O novo e-mail deve ser diferente do e-mail atual.'
      )
    }

    const userWithSameEmail = await User.query()
      .where('email', payload.email)
      .whereNot('id', actor.id)
      .first()

    if (userWithSameEmail) {
      throw fieldValidationError('email', 'database.unique', 'Este e-mail já está em uso.')
    }

    try {
      await db.transaction(async (trx) => {
        actor.useTransaction(trx)
        actor.email = payload.email
        await actor.save()
      })
    } catch (error) {
      throw uniqueViolationFieldError(error) ?? error
    }

    await actor.load('profilePicture')
    return actor
  }
}

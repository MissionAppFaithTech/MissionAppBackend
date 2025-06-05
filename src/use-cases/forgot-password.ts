import type { UsersRepository } from '@/repositories/users-repository'
import { sign } from 'jsonwebtoken'
import { UserEmailNotFoundError } from './errors/user-email-not-found-error'
import 'dotenv/config'
import { sendEmail } from '@/utils/send-email'

interface ForgotPasswordUseCaseRequest {
  email: string
}

export class ForgotPasswordUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute({ email }: ForgotPasswordUseCaseRequest) {
    const user = await this.usersRepository.findByEmail(email)

    if (user == null) {
      throw new UserEmailNotFoundError()
    }

    const passwordToken = sign({}, process.env.JWT_SECRET, {
      subject: user.email,
      expiresIn: '10m',
    })

    const url = process.env.FRONTEND_URL + '/reset-password/' + passwordToken

    const message = `Você solicitou a recuperação de senha. \n\n Por favor, clique abaixo para alterá-la. O link vai expirar em 10 minutos. \n\n${url}`

    const html = `Você solicitou a recuperação de senha. \n\n Por favor, clique abaixo para alterá-la. O link vai expirar em 10 minutos. \n<a href=${url}>Clique aqui para recuperar senha</a>`

    try {
      await sendEmail({
        to: user.email,
        subject: 'Recuperação de senha',
        message,
        html,
      })
    } catch (error) {
      console.log(error)
    }
  }
}

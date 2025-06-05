import { sendWelcomeEmail } from '#jobs/user/send_welcome_email_job'
import { UserRole } from '#enums/user/user_role'
import mail from '@adonisjs/mail/services/main'
import { test } from '@japa/runner'
import { v7 as uuidv7 } from 'uuid'

test.group('sendWelcomeEmail (job)', (group) => {
  let fakeMailer: ReturnType<typeof mail.fake>

  group.each.setup(() => {
    fakeMailer = mail.fake()
    return () => mail.restore()
  })

  test('envia o email de boas-vindas para o destinatário do payload', async ({ assert }) => {
    await sendWelcomeEmail({
      id: uuidv7(),
      fullName: 'Test User',
      email: 'test@example.com',
      role: UserRole.SUPPORTER,
    })

    fakeMailer.messages.assertSent((message) => {
      assert.isTrue(message.hasRecipient('to', 'test@example.com'))
      assert.isTrue(message.hasSubject('Bem-vindo!'))
      return true
    })
  })
})

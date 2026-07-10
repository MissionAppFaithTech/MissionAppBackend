import { sendPasswordResetEmail } from '#jobs/auth/send_password_reset_email_job'
import mail from '@adonisjs/mail/services/main'
import { test } from '@japa/runner'

test.group('sendPasswordResetEmail (job)', (group) => {
  let fakeMailer: ReturnType<typeof mail.fake>

  group.each.setup(() => {
    fakeMailer = mail.fake()
    return () => mail.restore()
  })

  test('envia o email de redefinição para o destinatário do payload', async ({ assert }) => {
    await sendPasswordResetEmail({
      fullName: 'Test User',
      email: 'test@example.com',
      resetUrl: 'https://app.example.com/reset-password?token=abc',
      expiresInMinutes: 60,
    })

    fakeMailer.messages.assertSent((message) => {
      assert.isTrue(message.hasRecipient('to', 'test@example.com'))
      assert.isTrue(message.hasSubject('Redefinição de senha'))
      return true
    })
  })
})

import type { Attachment } from 'nodemailer/lib/mailer'

export interface SendEmailRequest {
  to: string
  subject: string
  message: string
  html: string
  attachments?: Attachment[]
}

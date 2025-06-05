import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { defineConfig, transports } from '@adonisjs/mail'
import type { InferMailers } from '@adonisjs/mail/types'

const mailConfig = defineConfig({
  default: env.get('MAIL_MAILER'),

  from: {
    address: env.get('MAIL_FROM_ADDRESS'),
    name: env.get('MAIL_FROM_NAME'),
  },

  globals: {
    brandName: 'MissionApp',
    /**
     * Path absoluto das logos usadas no header dos emails. Consumido pelo
     * helper `embedImage` do Edge (injetado por `@adonisjs/mail`) dentro de
     * `emails/components/base.edge`, que embute o arquivo como anexo inline
     * (CID) — não depende de o app estar publicamente acessível.
     *
     * TODO: trocar por URL pública (ex.: CDN/S3) quando o deploy de produção
     * estiver disponível, reduzindo o tamanho do email.
     */
    logoLightPath: app.makePath('resources/assets/emails/logo-light.png'),
    logoDarkPath: app.makePath('resources/assets/emails/logo-dark.png'),
  },

  mailers: {
    resend: transports.resend({
      key: env.get('RESEND_API_KEY'),
      baseUrl: 'https://api.resend.com',
    }),
  },
})

export default mailConfig

declare module '@adonisjs/mail/types' {
  export interface MailersList extends InferMailers<typeof mailConfig> {}
}

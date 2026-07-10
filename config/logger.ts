import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { defineConfig, syncDestination, targets } from '@adonisjs/core/logger'

const loggerConfig = defineConfig({
  /**
   * Nome do logger padrão usado por ctx.logger e chamadas do app logger.
   */
  default: 'app',

  loggers: {
    app: {
      /**
       * Liga/desliga este logger.
       */
      enabled: true,

      /**
       * Nome do logger exibido nos registros de log.
       */
      name: env.get('APP_NAME'),

      /**
       * Nível mínimo para saída (trace, debug, info, warn, error, fatal).
       */
      level: env.get('LOG_LEVEL'),

      /**
       * Usa destino síncrono fora de produção para flush imediato.
       */
      destination: !app.inProduction ? await syncDestination() : undefined,

      /**
       * Configura para onde os logs são escritos.
       */
      transport: {
        targets: [targets.file({ destination: 1 })],
      },

      /**
       * Defesa em camadas: se algum código no futuro logar um objeto bruto
       * (request, body, headers) em vez de um payload já filtrado (como faz
       * `RequestLoggerMiddleware`), esses caminhos saem como `[Redacted]` em
       * vez de vazar credencial. Não substitui escolher com cuidado o que se
       * loga — só cobre o esquecimento.
       */
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          '*.password',
          '*.newPassword',
          '*.currentPassword',
          '*.passwordConfirmation',
          '*.newPasswordConfirmation',
          '*.passwordHash',
          '*.token',
          '*.accessToken',
          '*.refreshToken',
        ],
        censor: '[Redacted]',
      },
    },
  },
})

export default loggerConfig

/**
 * Inferência de tipos para a lista de loggers configurados
 * na aplicação.
 */
declare module '@adonisjs/core/types' {
  export interface LoggersList extends InferLoggers<typeof loggerConfig> {}
}

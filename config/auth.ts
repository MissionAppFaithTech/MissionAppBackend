import { JwtGuard } from '#auth/guards/jwt'
import { LucidJwtUserProvider } from '#auth/providers/lucid_user_jwt_provider'
import { AuthRevocationService } from '#services/auth_revocation_service'
import env from '#start/env'
import { defineConfig } from '@adonisjs/auth'
import { sessionGuard, sessionUserProvider } from '@adonisjs/auth/session'
import type { Authenticators, InferAuthEvents } from '@adonisjs/auth/types'

const authConfig = defineConfig({
  /**
   * Guard padrão usado quando nenhum guard é especificado explicitamente.
   */
  default: 'jwt',

  guards: {
    // TODO: adicionar guard `api` (tokensGuard + tokensUserProvider) se algum
    // consumidor precisar de personal access tokens além do fluxo JWT.

    /**
     * Guard baseado em JWT para autenticação de API stateless.
     */
    jwt: (ctx) =>
      new JwtGuard(ctx, new LucidJwtUserProvider(), new AuthRevocationService(), {
        secret: env.get('JWT_SECRET'),
        expiresIn: env.get('JWT_ACCESS_EXPIRES_IN'),
      }),

    /**
     * Guard baseado em session para autenticação via browser.
     */
    web: sessionGuard({
      /**
       * Habilita login persistente usando remember-me tokens.
       */
      useRememberMeTokens: false,

      provider: sessionUserProvider({
        model: () => import('#models/user'),
      }),
    }),
  },
})

export default authConfig

/**
 * Inferência de tipos a partir dos guards de auth
 * configurados.
 */
declare module '@adonisjs/auth/types' {
  export interface Authenticators extends InferAuthenticators<typeof authConfig> {}
}
declare module '@adonisjs/core/types' {
  interface EventsList extends InferAuthEvents<Authenticators> {}
}

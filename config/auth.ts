import { JwtGuard } from '#auth/guards/jwt'
import { LucidJwtUserProvider } from '#auth/providers/lucid_user_jwt_provider'
import env from '#start/env'
import { defineConfig } from '@adonisjs/auth'
import { sessionGuard, sessionUserProvider } from '@adonisjs/auth/session'
import type { Authenticators, InferAuthEvents } from '@adonisjs/auth/types'

const authConfig = defineConfig({
  /**
   * Default guard used when no guard is explicitly specified.
   */
  default: 'jwt',

  guards: {
    /**
     * Token-based guard for stateless API authentication.
     */
    // api: tokensGuard({
    //   provider: tokensUserProvider({
    //     tokens: 'accessTokens',
    //     model: () => import('#models/user'),
    //   }),
    // }),

    /**
     * JWT-based guard for stateless API authentication.
     */
    jwt: (ctx) =>
      new JwtGuard(ctx, new LucidJwtUserProvider(), {
        secret: env.get('JWT_SECRET'),
        expiresIn: env.get('JWT_ACCESS_EXPIRES_IN') ?? '2h',
      }),

    /**
     * Session-based guard for browser authentication.
     */
    web: sessionGuard({
      /**
       * Enable persistent login using remember-me tokens.
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
 * Inferring types from the configured auth
 * guards.
 */
declare module '@adonisjs/auth/types' {
  export interface Authenticators extends InferAuthenticators<typeof authConfig> {}
}
declare module '@adonisjs/core/types' {
  interface EventsList extends InferAuthEvents<Authenticators> {}
}

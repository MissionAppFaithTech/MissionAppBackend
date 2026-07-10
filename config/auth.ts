import { JwtGuard } from '#auth/guards/jwt'
import { LucidJwtUserProvider } from '#auth/providers/lucid_user_jwt_provider'
import { AuthRevocationService } from '#services/auth/auth_revocation_service'
import env from '#start/env'
import { defineConfig } from '@adonisjs/auth'
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
     * Guard baseado em JWT para autenticação de API stateless — único guard
     * em uso (ver ADR-0023). Sessão stateful clássica foi avaliada e
     * descartada (ver Alternativas Consideradas do ADR).
     */
    jwt: (ctx) =>
      new JwtGuard(ctx, new LucidJwtUserProvider(), new AuthRevocationService(), {
        secret: env.get('JWT_SECRET'),
        expiresIn: env.get('JWT_ACCESS_EXPIRES_IN'),
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

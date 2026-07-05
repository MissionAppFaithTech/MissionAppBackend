import { errors, symbols } from '@adonisjs/auth'
import type { AuthClientResponse, GuardContract } from '@adonisjs/auth/types'
import type { HttpContext } from '@adonisjs/core/http'
import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import { v7 as uuidv7 } from 'uuid'
import type { AuthRevocationService } from '#services/auth_revocation_service'

export type JwtGuardUser<RealUser> = {
  getId(): string
  getOriginal(): RealUser
}

export interface JwtUserProviderContract<RealUser> {
  [symbols.PROVIDER_REAL_USER]: RealUser
  createUserForGuard(user: RealUser): Promise<JwtGuardUser<RealUser>>
  findById(id: string | number | bigint): Promise<JwtGuardUser<RealUser> | null>
}

export type JwtGuardOptions = {
  secret: string
  expiresIn?: string
}

export class JwtGuard<
  UserProvider extends JwtUserProviderContract<unknown>,
> implements GuardContract<UserProvider[typeof symbols.PROVIDER_REAL_USER]> {
  declare [symbols.GUARD_KNOWN_EVENTS]: {}

  driverName: 'jwt' = 'jwt'
  authenticationAttempted = false
  isAuthenticated = false
  user?: UserProvider[typeof symbols.PROVIDER_REAL_USER]

  #ctx: HttpContext
  #userProvider: UserProvider
  #options: JwtGuardOptions
  #secret: Uint8Array
  #authRevocationService: AuthRevocationService
  #currentJti?: string
  #currentTokenExpiresAt?: number
  #currentFamilyId?: string

  constructor(
    ctx: HttpContext,
    userProvider: UserProvider,
    authRevocationService: AuthRevocationService,
    options: JwtGuardOptions
  ) {
    this.#ctx = ctx
    this.#userProvider = userProvider
    this.#authRevocationService = authRevocationService
    this.#options = options
    this.#secret = new TextEncoder().encode(options.secret)
  }

  /**
   * jti/exp/fid do token que autenticou a request atual — usado pelo logout
   * para bloquear exatamente esse token com o TTL restante correto e para
   * escopar a revogação de refresh tokens à família (dispositivo) de origem.
   */
  get currentJti(): string | undefined {
    return this.#currentJti
  }

  get currentTokenExpiresAt(): number | undefined {
    return this.#currentTokenExpiresAt
  }

  get currentFamilyId(): string | undefined {
    return this.#currentFamilyId
  }

  /**
   * @param familyId Família do refresh token emitido junto com este access
   *                 token. Quando omitido (ex: `authenticateAsClient` em
   *                 testes, sem refresh token real envolvido), uma família
   *                 avulsa é gerada — nunca aparecerá na blocklist de família
   *                 revogada, então não afeta a autenticação.
   */
  async generate(user: UserProvider[typeof symbols.PROVIDER_REAL_USER], familyId?: string) {
    const providerUser = await this.#userProvider.createUserForGuard(user)
    const authVersion = await this.#authRevocationService.getAuthVersion(providerUser.getId())

    const builder = new SignJWT({
      sub: String(providerUser.getId()),
      jti: uuidv7(),
      role: (providerUser.getOriginal() as { role: string }).role,
      auth_version: authVersion,
      fid: familyId ?? uuidv7(),
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()

    if (this.#options.expiresIn) {
      builder.setExpirationTime(this.#options.expiresIn)
    }

    const token = await builder.sign(this.#secret)

    return { type: 'bearer' as const, token }
  }

  async authenticate(): Promise<UserProvider[typeof symbols.PROVIDER_REAL_USER]> {
    if (this.authenticationAttempted) {
      return this.getUserOrFail()
    }

    this.authenticationAttempted = true

    const authHeader = this.#ctx.request.header('authorization')

    if (!authHeader?.startsWith('Bearer ')) {
      throw new errors.E_UNAUTHORIZED_ACCESS('Unauthorized access', {
        guardDriverName: this.driverName,
      })
    }

    const token = authHeader.slice(7)

    let payload: JWTPayload

    try {
      const result = await jwtVerify(token, this.#secret)

      payload = result.payload
    } catch {
      throw new errors.E_UNAUTHORIZED_ACCESS('Unauthorized access', {
        guardDriverName: this.driverName,
      })
    }

    const jti = payload.jti
    const authVersion = payload.auth_version
    const familyId = payload.fid

    if (
      !payload.sub ||
      typeof jti !== 'string' ||
      typeof authVersion !== 'number' ||
      typeof familyId !== 'string'
    ) {
      throw new errors.E_UNAUTHORIZED_ACCESS('Unauthorized access', {
        guardDriverName: this.driverName,
      })
    }

    // NOTE: fail-closed — qualquer falha ao consultar o DragonflyDB rejeita a
    // request. Dado o contexto de dados sensíveis (LGPD) e transações
    // financeiras, uma indisponibilidade do Dragonfly não deve degradar para
    // "aceitar o token".
    try {
      const currentAuthVersion = await this.#authRevocationService.getAuthVersion(payload.sub)

      if (currentAuthVersion !== authVersion) {
        throw new errors.E_UNAUTHORIZED_ACCESS('Unauthorized access', {
          guardDriverName: this.driverName,
        })
      }

      if (await this.#authRevocationService.isJtiBlocked(jti)) {
        throw new errors.E_UNAUTHORIZED_ACCESS('Unauthorized access', {
          guardDriverName: this.driverName,
        })
      }

      if (await this.#authRevocationService.isFamilyRevoked(familyId)) {
        throw new errors.E_UNAUTHORIZED_ACCESS('Unauthorized access', {
          guardDriverName: this.driverName,
        })
      }
    } catch (error) {
      if (error instanceof errors.E_UNAUTHORIZED_ACCESS) throw error
      throw new errors.E_UNAUTHORIZED_ACCESS('Unauthorized access', {
        guardDriverName: this.driverName,
      })
    }

    const providerUser = await this.#userProvider.findById(payload.sub)

    if (!providerUser) {
      throw new errors.E_UNAUTHORIZED_ACCESS('Unauthorized access', {
        guardDriverName: this.driverName,
      })
    }

    this.user = providerUser.getOriginal()
    this.isAuthenticated = true
    this.#currentJti = jti
    this.#currentTokenExpiresAt = payload.exp
    this.#currentFamilyId = familyId

    return this.user
  }

  async check(): Promise<boolean> {
    try {
      await this.authenticate()
      return true
    } catch {
      return false
    }
  }

  getUserOrFail(): UserProvider[typeof symbols.PROVIDER_REAL_USER] {
    if (!this.user) {
      throw new errors.E_UNAUTHORIZED_ACCESS('Unauthorized access', {
        guardDriverName: this.driverName,
      })
    }
    return this.user
  }

  // NOTE: suporte ao loginAs() nos testes — não é chamado em código de produção
  async authenticateAsClient(
    user: UserProvider[typeof symbols.PROVIDER_REAL_USER]
  ): Promise<AuthClientResponse> {
    const { token } = await this.generate(user)
    return { headers: { authorization: `Bearer ${token}` } }
  }
}

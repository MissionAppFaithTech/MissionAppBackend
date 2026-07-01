import { errors, symbols } from '@adonisjs/auth'
import type { AuthClientResponse, GuardContract } from '@adonisjs/auth/types'
import type { HttpContext } from '@adonisjs/core/http'
import { SignJWT, jwtVerify, type JWTPayload } from 'jose'

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

  constructor(ctx: HttpContext, userProvider: UserProvider, options: JwtGuardOptions) {
    this.#ctx = ctx
    this.#userProvider = userProvider
    this.#options = options
    this.#secret = new TextEncoder().encode(options.secret)
  }

  async generate(user: UserProvider[typeof symbols.PROVIDER_REAL_USER]) {
    const providerUser = await this.#userProvider.createUserForGuard(user)

    const builder = new SignJWT({ sub: String(providerUser.getId()) })
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

    if (!payload.sub) {
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

    return this.user
  }

  // fallow-ignore-next-line unused-class-member -- contrato GuardContract; chamado pelo auth do AdonisJS via IoC, não por import direto
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

  // Suporte ao loginAs() nos testes
  async authenticateAsClient(
    user: UserProvider[typeof symbols.PROVIDER_REAL_USER]
  ): Promise<AuthClientResponse> {
    const { token } = await this.generate(user)
    return { headers: { authorization: `Bearer ${token}` } }
  }
}

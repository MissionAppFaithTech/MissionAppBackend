import { errors, symbols } from '@adonisjs/auth'
import type { AuthClientResponse, GuardContract } from '@adonisjs/auth/types'
import type { HttpContext } from '@adonisjs/core/http'
import { SignJWT, jwtVerify } from 'jose'
import type { JWTPayload } from 'jose'
import { v7 as uuidv7 } from 'uuid'
import type { AuthRevocationService } from '#services/auth/auth_revocation_service'
import type { JwtGuardOptions, JwtUserProviderContract } from '#types/auth/jwt_guard'

/**
 * Guard de autenticação stateless via JWT assinado (HS256), com revogação
 * híbrida apoiada em DragonflyDB — combina três mecanismos independentes
 * (bloqueio de `jti` individual, `auth_version` por usuário e blocklist de
 * família de refresh token) para cobrir logout de um dispositivo, logout
 * global e detecção de roubo de token sem esperar a expiração natural do
 * access token. Ver ADR-0023 ("Estratégia de Autenticação: JWT Híbrido com
 * Revogação via DragonflyDB").
 */
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
  #authRevocationService: AuthRevocationService
  #options: JwtGuardOptions
  #secret: Uint8Array

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
   * `jti` do access token que autenticou a request atual — usado pelo logout
   * para bloquear exatamente esse token na blocklist individual do Dragonfly.
   * `undefined` até `authenticate()` ter sucesso.
   */
  get currentJti(): string | undefined {
    return this.#currentJti
  }

  /**
   * Expiração (`exp`, epoch em segundos) do access token atual — usado pelo
   * logout para calcular o TTL restante do bloqueio de `jti`. `undefined`
   * até `authenticate()` ter sucesso.
   */
  get currentTokenExpiresAt(): number | undefined {
    return this.#currentTokenExpiresAt
  }

  /**
   * `fid` (família do refresh token) vinculado ao access token atual — usado
   * pelo logout para escopar a revogação de refresh tokens ao dispositivo de
   * origem, sem afetar as demais sessões do usuário. `undefined` até
   * `authenticate()` ter sucesso.
   */
  get currentFamilyId(): string | undefined {
    return this.#currentFamilyId
  }

  /**
   * Assina um novo access token JWT (HS256) para o usuário informado.
   *
   * @param user Usuário real devolvido pelo provider — convertido
   *             internamente via `createUserForGuard()` para extrair id/role.
   * @param familyId Família do refresh token emitido junto com este access
   *                 token. Quando omitido (ex: `authenticateAsClient` em
   *                 testes, sem refresh token real envolvido), uma família
   *                 avulsa é gerada — nunca aparecerá na blocklist de família
   *                 revogada, então não afeta a autenticação.
   * @returns `{ type: 'bearer', token }` — pronto para o header
   *          `Authorization: Bearer <token>`.
   * @example
   * const { token } = await guard.generate(user, familyId)
   */
  async generate(user: UserProvider[typeof symbols.PROVIDER_REAL_USER], familyId?: string) {
    const providerUser = await this.#userProvider.createUserForGuard(user)
    const authVersion = await this.#authRevocationService.getAuthVersion(providerUser.getId())

    const builder = new SignJWT({
      sub: String(providerUser.getId()),
      jti: uuidv7(),
      role: providerUser.getRole(),
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

  /**
   * Valida o access token do header `Authorization: Bearer <token>` em 4
   * etapas: assinatura/expiração (`jwtVerify`), `auth_version` do payload
   * contra o valor atual no Dragonfly, `jti` contra a blocklist individual e
   * `fid` contra a blocklist de família. Qualquer falha em qualquer etapa —
   * incluindo indisponibilidade do Dragonfly — rejeita a request
   * (fail-closed, ver NOTE abaixo). Idempotente: chamadas repetidas na mesma
   * request reaproveitam o resultado da primeira tentativa.
   *
   * @returns Usuário real autenticado.
   * @throws {errors.E_UNAUTHORIZED_ACCESS} Header ausente/malformado, token
   *         inválido/expirado, payload com claims ausentes, `auth_version`
   *         desatualizado, `jti` bloqueado, família revogada, usuário não
   *         encontrado, ou falha ao consultar o Dragonfly.
   */
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
      // NOTE: As 3 checagens são independentes (fontes distintas no Dragonfly) —
      // rodam em paralelo em vez de sequencial.
      const [authVersionMismatch, jtiBlocked, familyRevoked] = await Promise.all([
        this.#authRevocationService
          .getAuthVersion(payload.sub)
          .then((currentAuthVersion) => currentAuthVersion !== authVersion),
        this.#authRevocationService.isJtiBlocked(jti),
        this.#authRevocationService.isFamilyRevoked(familyId),
      ])

      if (authVersionMismatch || jtiBlocked || familyRevoked) {
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

  /**
   * Verifica se a request está autenticada, sem lançar erro.
   *
   * @returns `true` se `authenticate()` teria sucesso; `false` caso contrário.
   */
  async check(): Promise<boolean> {
    try {
      await this.authenticate()
      return true
    } catch {
      return false
    }
  }

  /**
   * Devolve o usuário já autenticado nesta request.
   *
   * @returns Usuário real.
   * @throws {errors.E_UNAUTHORIZED_ACCESS} `authenticate()` ainda não teve
   *         sucesso nesta request.
   */
  getUserOrFail(): UserProvider[typeof symbols.PROVIDER_REAL_USER] {
    if (!this.user) {
      throw new errors.E_UNAUTHORIZED_ACCESS('Unauthorized access', {
        guardDriverName: this.driverName,
      })
    }
    return this.user
  }

  /**
   * Suporte ao `loginAs()` nos testes — não é chamado em código de produção.
   *
   * @param user Usuário a autenticar no client de teste.
   * @returns Header `Authorization: Bearer <token>` pronto para a request de teste.
   */
  async authenticateAsClient(
    user: UserProvider[typeof symbols.PROVIDER_REAL_USER]
  ): Promise<AuthClientResponse> {
    const { token } = await this.generate(user)
    return { headers: { authorization: `Bearer ${token}` } }
  }
}

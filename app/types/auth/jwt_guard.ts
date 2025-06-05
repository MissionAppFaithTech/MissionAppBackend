import type { symbols } from '@adonisjs/auth'
import type { UserRole } from '#enums/user/user_role'

/**
 * Contrato mínimo que o `JwtGuard` espera de um usuário já resolvido pelo
 * provider — abstrai o modelo real (`User`) para que o guard não dependa do
 * ORM diretamente, só desse shape.
 *
 * @template RealUser Tipo do modelo real (ex: `User`) devolvido por `getOriginal()`.
 *
 * @example
 * const guardUser: JwtGuardUser<User> = {
 *   getId: () => user.id,
 *   getRole: () => user.role,
 *   getOriginal: () => user,
 * }
 */
export type JwtGuardUser<RealUser> = {
  /** Id do usuário, serializado como string no claim `sub` do JWT. */
  getId(): string
  /** Role do usuário, serializado no claim `role` do JWT. */
  getRole(): UserRole
  /** Devolve a instância original do modelo (`RealUser`), sem transformação. */
  getOriginal(): RealUser
}

/**
 * Contrato que um provider de usuários deve implementar para ser aceito pelo
 * `JwtGuard` — equivalente ao `UserProviderContract` nativo do AdonisJS, mas
 * específico do fluxo JWT: sem métodos de credenciais/hash, só resolução por id.
 *
 * @template RealUser Tipo do modelo real que o provider resolve (ex: `User`).
 *
 * @example
 * class LucidUserJwtProvider implements JwtUserProviderContract<User> {
 *   declare [symbols.PROVIDER_REAL_USER]: User
 *
 *   async createUserForGuard(user: User) {
 *     return { getId: () => user.id, getRole: () => user.role, getOriginal: () => user }
 *   }
 *
 *   async findById(id: string) {
 *     const user = await User.find(id)
 *     return user
 *       ? { getId: () => user.id, getRole: () => user.role, getOriginal: () => user }
 *       : null
 *   }
 * }
 */
export interface JwtUserProviderContract<RealUser> {
  /** Marca de tipo — nunca lida em runtime, só usada pelo TS para inferir `RealUser`. */
  [symbols.PROVIDER_REAL_USER]: RealUser

  /**
   * Envolve um usuário já carregado no shape `JwtGuardUser`, sem nova consulta ao banco.
   *
   * @param user Instância do modelo real já resolvida (ex: logo após o login).
   * @returns Wrapper `JwtGuardUser` pronto para o `JwtGuard` usar.
   */
  createUserForGuard(user: RealUser): Promise<JwtGuardUser<RealUser>>

  /**
   * Busca o usuário pelo id extraído do claim `sub` do JWT.
   *
   * @param id Id do usuário — string, number ou bigint conforme a PK do model.
   * @returns Usuário envolvido em `JwtGuardUser`, ou `null` se não encontrado
   *          (ex: usuário deletado após o token ter sido emitido).
   */
  findById(id: string | number | bigint): Promise<JwtGuardUser<RealUser> | null>
}

/**
 * Opções de configuração do `JwtGuard` — segredo de assinatura e TTL do access token.
 *
 * @property secret Segredo usado para assinar e verificar o JWT.
 * @property expiresIn TTL do access token (ex: `'15m'`); ausente significa sem expiração.
 *
 * @example
 * const options: JwtGuardOptions = { secret: env.get('APP_KEY'), expiresIn: '15m' }
 */
export type JwtGuardOptions = {
  secret: string
  expiresIn?: string
}

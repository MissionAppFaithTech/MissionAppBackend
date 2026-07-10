// fallow-ignore-file circular-dependency -- relacionamento Lucid com lazy loading via callback; ciclo inexistente em runtime
import { AUTH_UIDS } from '#constants/user'
import { UserSchema } from '#database/schema'
import { Gender } from '#enums/user/gender'
import { MembershipStatus } from '#enums/user/membership_status'
import { UserRole } from '#enums/user/user_role'
import { LoginAttemptService } from '#services/auth/login_attempt_service'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { Filterable } from '@dirupt/adonis-lucid-filter'
import type { DateTime } from 'luxon'
import AuthenticationAudit from './authentication_audit.ts'
import UserFilter from './filters/user_filter.ts'
import MediaAsset from './media_asset.ts'
import { AuthFinder } from './mixins/auth_finder.ts'
import { WithPrimaryUuid } from './mixins/with_primary_uuid.ts'
import { WithTimestamps } from './mixins/with_timestamps.ts'
import UserActionAudit from './user_action_audit.ts'

// TS2417 nessa declaração: `verifyCredentials()` sobrescrito abaixo com
// assinatura concreta (`Promise<User>`), mas o mixin `AuthFinder`
// (`@adonisjs/auth/mixins/lucid`) declara o original como
// `verifyCredentials<T extends UserWithUserFinderClass>(this: T, ...): Promise<InstanceType<T>>`
// — genérico e polimórfico em `this`. `UserWithUserFinderClass` não é
// exportado pelo pacote, então não dá pra usar o tipo real como constraint
// aqui. JÁ TESTADO (2026-07): recriar esse tipo localmente (via
// `NormalizeConstructor` + shape estrutural equivalente) e usar como
// constraint genérico do override ATÉ elimina esse erro, mas troca 1
// diretiva bem localizada por 3-4 casts espalhados (`as User`, um por
// chamada ao `LoginAttemptService`) — porque `InstanceType<T>` genérico não
// carrega os campos concretos do `User` (lockedAt, lockCount etc, ausentes
// do shape genérico do mixin). Pior custo/benefício: mais superfície de
// cast, mais um tipo interno de terceiro duplicado localmente (drift
// silencioso se `@adonisjs/auth` mudar o shape). Mantendo `@ts-expect-error`
// — se o mixin algum dia exportar esse tipo ou aceitar override concreto,
// isso aqui vira erro "unused directive" e avisa sozinho.
// @ts-expect-error
export default class User extends compose(
  UserSchema,
  WithPrimaryUuid,
  WithTimestamps,
  AuthFinder,
  Filterable
) {
  static $filter = () => UserFilter

  declare role: UserRole
  declare gender: Gender
  declare membershipStatus: MembershipStatus
  declare lockedAt: DateTime | null
  declare lockCount: number

  @belongsTo(() => MediaAsset, { foreignKey: 'profile_picture_id' })
  declare profilePicture: BelongsTo<typeof MediaAsset>

  @hasMany(() => AuthenticationAudit)
  declare authenticationAudits: HasMany<typeof AuthenticationAudit>

  @hasMany(() => UserActionAudit)
  declare userActionAudit: HasMany<typeof UserActionAudit>

  /**
   * Sobrescreve `verifyCredentials()` do mixin `AuthFinder` para impor
   * bloqueio por força bruta (`LoginAttemptService`) sem duplicar nem
   * modificar a lógica de verificação timing-safe do mixin oficial — ela
   * continua intocada, delegada via `super.verifyCredentials()`. Mantém o
   * mesmo nome/assinatura do método original de propósito: é o único ponto
   * de entrada de verificação de credenciais da aplicação, então qualquer
   * chamador (presente ou futuro) já ganha o bloqueio automaticamente, sem
   * precisar saber que ele existe.
   *
   * @param uid Email do usuário.
   * @param password Senha em texto plano.
   * @returns Usuário autenticado.
   * @throws {AccountLockedException} Conta bloqueada por excesso de tentativas.
   * @throws {errors.E_INVALID_CREDENTIALS} Credenciais inválidas (do mixin original).
   * @example
   * const user = await User.verifyCredentials(email, password)
   */
  static async verifyCredentials(uid: string, password: string): Promise<User> {
    const loginAttemptService = new LoginAttemptService()

    const user = (await super.findForAuth([...AUTH_UIDS], uid)) as User | null

    if (user) {
      await loginAttemptService.assertNotLocked(user)
    }

    try {
      const verified = (await super.verifyCredentials(uid, password)) as User
      await loginAttemptService.recordSuccess(verified)
      return verified
    } catch (error) {
      if (user) {
        await loginAttemptService.recordFailure(user)
      }
      throw error
    }
  }
}

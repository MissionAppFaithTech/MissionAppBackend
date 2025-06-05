import type { AuthenticationStatus } from '#enums/authentication_audit/authentication_status'
import { BaseEvent } from '@adonisjs/core/events'

/**
 * Disparado a cada tentativa de login, sucesso ou falha — de dentro de
 * `User.verifyCredentials()` (único ponto de entrada de verificação de
 * credenciais, ver ADR-0023), único lugar que sabe o motivo exato da falha
 * (usuário inexistente vs senha errada vs conta bloqueada) sem expor essa
 * distinção na resposta HTTP — a proteção contra timing attack/enumeração
 * continua intacta, esse evento é consumido só internamente (audit trail),
 * nunca refletido na resposta ao cliente. Consumido por
 * `RecordAuthenticationAuditListener`
 * (`app/listeners/auth/record_authentication_audit_listener.ts`).
 */
export default class LoginAttempted extends BaseEvent {
  constructor(
    readonly userId: string | null,
    readonly status: AuthenticationStatus
  ) {
    super()
  }
}

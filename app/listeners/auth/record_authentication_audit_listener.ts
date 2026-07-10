import type LoginAttempted from '#events/auth/login_attempted'
import AuthenticationAudit from '#models/authentication_audit'

/**
 * Grava a tentativa de login como registro de auditoria imutável. Síncrono,
 * de propósito — ao contrário do envio de email (`SendPasswordResetEmailListener`),
 * não passa por fila: audit trail de segurança quer consistência forte com a
 * ação (gravar sempre, na hora, mesmo que o Redis/BullMQ esteja fora do ar),
 * não "eventualmente vai gravar".
 */
export default class RecordAuthenticationAuditListener {
  async handle(event: LoginAttempted): Promise<void> {
    await AuthenticationAudit.create({
      userId: event.userId,
      status: event.status,
    })
  }
}

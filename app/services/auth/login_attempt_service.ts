import {
  ACCOUNT_LOCK_BASE_SECONDS,
  ACCOUNT_LOCK_MAX_SECONDS,
  LOCK_COUNT_DECAY_DAYS,
  MAX_FAILED_LOGIN_ATTEMPTS,
} from '#constants/user'
import AccountLockedException from '#exceptions/auth/account_locked_exception'
import type User from '#models/user'
import { DateTime } from 'luxon'

/**
 * Política de bloqueio de conta por força bruta — chamado a partir do
 * override de `User.verifyCredentials()` (`app/models/user.ts`), nunca
 * diretamente por controllers. Backoff exponencial: cada nova janela de
 * bloqueio dobra a duração do anterior, até o teto de `ACCOUNT_LOCK_MAX_SECONDS`.
 *
 * `lockedAt` nunca é zerado — funciona como registro permanente do último
 * bloqueio (usado pelo decaimento de `lockCount` em `recordFailure`), não
 * como flag de "bloqueado agora". "Bloqueado agora" é sempre calculado pela
 * janela de tempo (`lockedAt + duração`), nunca pela presença do campo.
 */
export class LoginAttemptService {
  #lockDurationSeconds(lockCount: number): number {
    return Math.min(ACCOUNT_LOCK_BASE_SECONDS * 2 ** (lockCount - 1), ACCOUNT_LOCK_MAX_SECONDS)
  }

  /**
   * Verifica se a conta está bloqueada. Se o período de bloqueio já
   * expirou, a tentativa prossegue sem lançar — nenhuma escrita é feita
   * (não há mais estado de "está bloqueado" pra limpar, só a janela de
   * tempo, que já passou por conta própria).
   *
   * @param user Usuário a verificar.
   * @throws {AccountLockedException} Conta ainda dentro do período de bloqueio.
   * @example
   * await service.assertNotLocked(user)
   */
  async assertNotLocked(user: User): Promise<void> {
    if (!user.lockedAt) return

    const unlockAt = user.lockedAt.plus({ seconds: this.#lockDurationSeconds(user.lockCount) })
    const now = DateTime.now()

    if (now < unlockAt) {
      const retryAfterSeconds = Math.ceil(unlockAt.diff(now, 'seconds').seconds)
      throw new AccountLockedException(
        `Conta temporariamente bloqueada. Tente novamente em ${retryAfterSeconds} segundos.`,
        retryAfterSeconds
      )
    }
  }

  /**
   * Registra uma tentativa de login falha. Bloqueia a conta ao atingir
   * `MAX_FAILED_LOGIN_ATTEMPTS`, com duração calculada por `lockCount`
   * (backoff exponencial). Se o último bloqueio foi há mais de
   * `LOCK_COUNT_DECAY_DAYS`, trata como incidente isolado — reseta
   * `lockCount` antes de escalar, em vez de continuar a progressão de um
   * bloqueio antigo e não-relacionado.
   *
   * @param user Usuário que falhou a tentativa.
   * @returns Nada — efeito colateral (`UPDATE` no Postgres).
   * @example
   * await service.recordFailure(user)
   */
  async recordFailure(user: User): Promise<void> {
    user.loginAttempts += 1

    if (user.loginAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
      if (
        user.lockedAt &&
        DateTime.now().diff(user.lockedAt, 'days').days > LOCK_COUNT_DECAY_DAYS
      ) {
        user.lockCount = 0
      }

      user.lockedAt = DateTime.now()
      user.lockCount += 1
      user.loginAttempts = 0
    }

    await user.save()
  }

  /**
   * Registra um login bem-sucedido — reseta só o contador de tentativas em
   * andamento. `lockedAt`/`lockCount` não são tocados: permanecem como
   * registro do último bloqueio, usado pelo decaimento em `recordFailure`
   * caso a conta seja bloqueada de novo no futuro.
   *
   * @param user Usuário autenticado com sucesso.
   * @returns Nada — no-op se não houver nada para resetar.
   * @example
   * await service.recordSuccess(user)
   */
  async recordSuccess(user: User): Promise<void> {
    if (user.loginAttempts === 0) return

    user.loginAttempts = 0

    await user.save()
  }
}

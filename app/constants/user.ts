/**
 * Colunas usadas como identificador único de login — compartilhada entre o
 * mixin `AuthFinder` (`app/models/mixins/auth_finder.ts`, repassada pro
 * `withAuthFinder`) e o override de `User.verifyCredentials()`
 * (`app/models/user.ts`), que precisa da mesma lista para buscar o usuário
 * antes de delegar a verificação de senha ao mixin.
 */
export const AUTH_UIDS = ['email'] as const

/** Tentativas de login falhadas consecutivas antes de bloquear a conta. */
export const MAX_FAILED_LOGIN_ATTEMPTS = 5

/** Duração do primeiro bloqueio de conta, em segundos. */
export const ACCOUNT_LOCK_BASE_SECONDS = 15

/** Teto de duração de bloqueio de conta, em segundos (24h). */
export const ACCOUNT_LOCK_MAX_SECONDS = 24 * 60 * 60

/**
 * Janela, em dias, para decaimento de `lock_count`: se o último bloqueio foi
 * há mais tempo que isso, o próximo bloqueio reseta o escalonamento (trata
 * como incidente isolado, não ataque contínuo).
 */
export const LOCK_COUNT_DECAY_DAYS = 1

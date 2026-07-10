import { PASSWORD_RESET_EMAIL_JOB_NAME } from '#constants/password_reset'
import { EMAIL_QUEUE_NAME } from '#constants/mail'
import { MISSIONARY_INDEXING_JOB_NAME } from '#constants/missionary_search'
import { SEARCH_INDEXING_QUEUE_NAME } from '#constants/search'
import { WELCOME_EMAIL_JOB_NAME } from '#constants/welcome_email'
import { sendPasswordResetEmail } from '#jobs/auth/send_password_reset_email_job'
import { indexMissionary } from '#jobs/user/index_missionary_job'
import { sendWelcomeEmail } from '#jobs/user/send_welcome_email_job'

/**
 * Trinca {fila, job, handler} — `any` no payload é proposital: cada `handle`
 * já vem fortemente tipado no seu próprio módulo (`PasswordResetRequestedPayload`,
 * etc); aqui a lista precisa ser heterogênea, então o tipo é apagado só
 * neste ponto de agregação, igual o próprio `Job<T = any>` do BullMQ faz.
 *
 * Mais de uma entrada pode compartilhar a mesma `queueName` (ex: todos os
 * emails da aplicação vivem na mesma fila `EMAIL_QUEUE_NAME` — ver
 * `app/constants/mail.ts` pro motivo) — `jobName` é o que diferencia qual
 * handler processa qual job dentro da fila compartilhada.
 */
type WorkerRegistryEntry = {
  queueName: string
  jobName: string
  handle: (payload: any) => Promise<void>
}

/**
 * Registro central das filas/jobs BullMQ consumidos por
 * `commands/queue_workers.ts`. Cada entrada aqui é a trinca {fila, job,
 * handler} que antes exigia um `commands/queue_*_worker.ts` dedicado —
 * adicionar um job novo é adicionar uma linha aqui, não criar um arquivo de
 * command novo.
 *
 * Não inclui `queue:refresh-tokens-cleanup` — aquele command também
 * *produz* seu próprio job repetível (cron) na inicialização, um papel
 * diferente de "só consumir uma fila que outra parte da aplicação alimenta",
 * que é o que as entradas aqui têm em comum.
 */
export const workerRegistry: WorkerRegistryEntry[] = [
  {
    queueName: EMAIL_QUEUE_NAME,
    jobName: PASSWORD_RESET_EMAIL_JOB_NAME,
    handle: sendPasswordResetEmail,
  },
  { queueName: EMAIL_QUEUE_NAME, jobName: WELCOME_EMAIL_JOB_NAME, handle: sendWelcomeEmail },
  {
    queueName: SEARCH_INDEXING_QUEUE_NAME,
    jobName: MISSIONARY_INDEXING_JOB_NAME,
    handle: indexMissionary,
  },
]

/** Tamanho em bytes do token bruto antes de virar hex — 256 bits de entropia. */
export const RESET_TOKEN_BYTES = 32

/** Validade do link de redefinição de senha, em minutos. */
export const RESET_TOKEN_TTL_MINUTES = 60

/** Nome do job dentro da fila única de email (`EMAIL_QUEUE_NAME`, ver `#constants/mail`). */
export const PASSWORD_RESET_EMAIL_JOB_NAME = 'send-password-reset-email'

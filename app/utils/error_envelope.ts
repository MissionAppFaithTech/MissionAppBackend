/**
 * Item de erro de validação, um por campo (VineJS).
 */
export type ErrorEnvelopeFieldError = {
  field: string
  rule: string
  message: string
}

/**
 * Formato único de toda resposta de erro da API (ADR-0034).
 *
 * - `message`: texto para humanos; clientes não decidem nada com base nele.
 * - `code`: identificador estável (`E_*`), parte do contrato público.
 * - `errors`: só em erros de validação.
 * - `meta`: dados estruturados para o cliente reagir (ex.: `retryAfterSeconds`).
 * - `debug`: só fora de produção, em erros 5xx; o stack fica só nos logs (`report`).
 */
export type ErrorEnvelope = {
  message: string
  code: string
  errors?: ErrorEnvelopeFieldError[]
  meta?: { retryAfterSeconds?: number }
  debug?: { name: string; message: string }
}

export const INTERNAL_ERROR_CODE = 'E_INTERNAL_SERVER_ERROR'
export const INTERNAL_ERROR_MESSAGE = 'Erro interno do servidor. Tente novamente mais tarde.'
const VALIDATION_ERROR_CODE = 'E_VALIDATION_ERROR'
export const VALIDATION_ERROR_MESSAGE = 'Dados inválidos. Verifique os campos e tente novamente.'
const TOO_MANY_REQUESTS_CODE = 'E_TOO_MANY_REQUESTS'
export const GENERIC_ERROR_MESSAGE = 'Não foi possível concluir a requisição.'

/**
 * Códigos de status sem código de domínio usam um código derivado do status,
 * para que nenhuma resposta de erro saia sem `code`.
 */
const STATUS_CODES: Record<number, string> = {
  400: 'E_BAD_REQUEST',
  401: 'E_UNAUTHORIZED_ACCESS',
  403: 'E_FORBIDDEN',
  404: 'E_NOT_FOUND',
  405: 'E_METHOD_NOT_ALLOWED',
  409: 'E_CONFLICT',
  413: 'E_PAYLOAD_TOO_LARGE',
  422: VALIDATION_ERROR_CODE,
  423: 'E_LOCKED',
  429: TOO_MANY_REQUESTS_CODE,
}

/** Mensagens em pt-BR para erros do framework que chegam em inglês. */
const FRAMEWORK_MESSAGES: Record<string, string> = {
  E_ROUTE_NOT_FOUND: 'Rota não encontrada.',
  E_ROW_NOT_FOUND: 'Recurso não encontrado.',
}

/**
 * Normalizado a partir de qualquer valor lançado, antes de virar resposta.
 */
export type NormalizedError = {
  status: number
  envelope: ErrorEnvelope
  retryAfterSeconds?: number
}

type ErrorLike = {
  name?: unknown
  message?: unknown
  status?: unknown
  code?: unknown
  messages?: unknown
  retryAfterSeconds?: unknown
}

function asErrorLike(error: unknown): ErrorLike {
  return typeof error === 'object' && error !== null ? (error as ErrorLike) : {}
}

/**
 * Status HTTP de um erro: só aceita 4xx/5xx numéricos; o resto é tratado como 500.
 */
function statusOf(error: ErrorLike): number {
  const status = Number(error.status)
  return Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500
}

const stringOr = (value: unknown, fallback: string) =>
  typeof value === 'string' ? value : fallback

/**
 * Uma mensagem do VineJS no formato do envelope, ou `null` quando não há texto.
 */
function toFieldError(item: unknown): ErrorEnvelopeFieldError | null {
  if (typeof item !== 'object' || item === null) return null
  const { field, rule, message } = item as Record<string, unknown>
  if (typeof message !== 'string' || !message) return null
  return { field: stringOr(field, ''), rule: stringOr(rule, ''), message }
}

/**
 * Converte as mensagens do VineJS no formato `errors` do envelope, descartando
 * entradas sem texto.
 */
export function toFieldErrors(messages: unknown): ErrorEnvelopeFieldError[] {
  if (!Array.isArray(messages)) return []
  return messages.map(toFieldError).filter((item) => item !== null)
}

/**
 * Envelope de 5xx: mensagem genérica; o detalhe só aparece com `debug`.
 */
function internalErrorEnvelope(error: unknown, err: ErrorLike, debug: boolean): ErrorEnvelope {
  const envelope: ErrorEnvelope = { message: INTERNAL_ERROR_MESSAGE, code: INTERNAL_ERROR_CODE }
  if (!debug) return envelope
  return {
    ...envelope,
    debug: {
      name: stringOr(err.name, 'Error'),
      message: stringOr(err.message, String(error)),
    },
  }
}

/**
 * `code` declarado pelo erro (padrão `E_*`) ou derivado do status.
 */
function codeOf(err: ErrorLike, status: number): string {
  if (typeof err.code === 'string' && err.code.startsWith('E_')) return err.code
  return STATUS_CODES[status] ?? 'E_HTTP_ERROR'
}

/**
 * Mensagem de um erro de validação com campos: a do campo único ou a genérica.
 */
function validationMessageOf(fieldErrors: ErrorEnvelopeFieldError[]): string | null {
  if (fieldErrors.length === 0) return null
  return fieldErrors.length === 1 ? fieldErrors[0].message : VALIDATION_ERROR_MESSAGE
}

/**
 * Mensagem pública: a da validação, a tradução de erro do framework, o texto do
 * erro ou um texto genérico.
 */
function messageOf(code: string, err: ErrorLike, fieldErrors: ErrorEnvelopeFieldError[]): string {
  const isValidation = code === VALIDATION_ERROR_CODE
  const fromFields = isValidation ? validationMessageOf(fieldErrors) : null
  const message = fromFields ?? FRAMEWORK_MESSAGES[code] ?? stringOr(err.message, '').trim()
  if (message) return message
  return isValidation ? VALIDATION_ERROR_MESSAGE : GENERIC_ERROR_MESSAGE
}

/**
 * Segundos de espera (inteiro positivo) ou `undefined`.
 */
function retryAfterOf(err: ErrorLike): number | undefined {
  const seconds = Number(err.retryAfterSeconds)
  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : undefined
}

/**
 * Normaliza qualquer erro no envelope único da API (ADR-0034).
 *
 * @param error Valor lançado (exceção de domínio, erro do framework ou bug).
 * @param options.debug Inclui `debug` em erros 5xx (nunca em produção).
 * @returns Status HTTP, envelope e, quando houver, os segundos para `Retry-After`.
 * @example
 * const { status, envelope } = normalizeError(error, { debug: !app.inProduction })
 */
export function normalizeError(error: unknown, options: { debug?: boolean } = {}): NormalizedError {
  const err = asErrorLike(error)
  const status = statusOf(err)
  if (status >= 500) {
    return { status, envelope: internalErrorEnvelope(error, err, Boolean(options.debug)) }
  }

  const fieldErrors = toFieldErrors(err.messages)
  const code = codeOf(err, status)
  const retryAfterSeconds = retryAfterOf(err)
  const envelope: ErrorEnvelope = { message: messageOf(code, err, fieldErrors), code }
  if (fieldErrors.length > 0) envelope.errors = fieldErrors
  if (retryAfterSeconds) envelope.meta = { retryAfterSeconds }

  return { status, retryAfterSeconds, envelope }
}

/**
 * Envelope de 429 usado pelos middlewares de rate limit, que respondem sem lançar.
 *
 * @param message Texto para humanos.
 * @param retryAfterSeconds Janela restante, também enviada no header `Retry-After`.
 * @returns Envelope com `code: 'E_TOO_MANY_REQUESTS'` e `meta.retryAfterSeconds`.
 */
export function tooManyRequestsEnvelope(message: string, retryAfterSeconds: number): ErrorEnvelope {
  return { message, code: TOO_MANY_REQUESTS_CODE, meta: { retryAfterSeconds } }
}

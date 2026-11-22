import type { COUNTER_TARGETS } from '#constants/counter'

/** Nome de um contador bufferizado (chave de `COUNTER_TARGETS`). */
export type CounterTargetName = keyof typeof COUNTER_TARGETS

/** Variação a aplicar no contador `target` da entidade `id`. */
export type CounterDelta = { target: CounterTargetName; id: string; delta: number }

/** Delta ainda não aplicado no banco, por id da entidade. */
export type CounterOverlay = Map<string, number>

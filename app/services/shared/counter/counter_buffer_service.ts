import {
  COUNTER_PENDING_KEY_PREFIX,
  COUNTER_PROCESSING_KEY_PREFIX,
  COUNTER_TARGETS,
} from '#constants/counter'
import cache from '#services/shared/cache/cache'
import type {
  CounterDelta,
  CounterOverlay,
  CounterTargetName,
} from '#types/services/shared/counter_buffer'
import logger from '@adonisjs/core/services/logger'

/**
 * Buffer dos contadores desnormalizados no Dragonfly (ADR-0033). Único ponto
 * que conhece as chaves: os services gravam deltas aqui em vez de fazer
 * `UPDATE` na linha do contador (que viraria linha quente num perfil popular),
 * e o job de flush aplica os deltas no PostgreSQL em lote.
 *
 * Cada alvo tem um hash "pendente" (recebe incrementos) e um "em
 * processamento" (o que um flush está aplicando). O valor real de um
 * contador é `banco + pendente + processamento`.
 */
export class CounterBufferService {
  /**
   * Acumula deltas. Chamado dentro da transação que mudou a relação, antes do
   * commit — se o Dragonfly falhar, a transação é desfeita (fail-closed) e o
   * contador nunca fica sem o delta correspondente.
   *
   * @param deltas Variações a acumular (zeros são ignorados).
   * @returns Nada.
   * @example
   * await new CounterBufferService().increment([{ target: 'postLikes', id: post.id, delta: 1 }])
   */
  async increment(deltas: CounterDelta[]): Promise<void> {
    await Promise.all(
      deltas
        .filter(({ delta }) => delta !== 0)
        .map(({ target, id, delta }) => cache.hincrby(this.pendingKey(target), id, delta))
    )
  }

  /**
   * Soma dos deltas ainda não aplicados no banco, para exibir o contador
   * atualizado logo após o clique. Fail-open: em erro do Dragonfly devolve um
   * mapa vazio e a tela mostra o valor do banco.
   *
   * @param target Contador a consultar.
   * @param ids Ids das entidades.
   * @returns Delta pendente por id (ids sem delta ficam fora do mapa).
   * @example
   * const overlay = await buffer.pending('postLikes', posts.map((post) => post.id))
   */
  async pending(target: CounterTargetName, ids: string[]): Promise<CounterOverlay> {
    try {
      return await this.readDeltas(target, ids)
    } catch (error) {
      logger.warn({ err: error, target }, 'counter overlay unavailable; using database values')
      return new Map()
    }
  }

  /**
   * Ids que têm delta ainda não aplicado — a reconciliação pula esses, porque
   * o `COUNT(*)` deles pode já incluir uma relação cujo delta o flush ainda
   * vai somar. Sem fail-open: um erro aborta a reconciliação.
   *
   * @param target Contador a consultar.
   * @param ids Ids candidatos.
   * @returns Subconjunto de `ids` com delta pendente ou em processamento.
   * @example
   * const dirty = await buffer.dirtyIds('userFollowers', ids)
   */
  async dirtyIds(target: CounterTargetName, ids: string[]): Promise<Set<string>> {
    const deltas = await this.readDeltas(target, ids)
    return new Set(deltas.keys())
  }

  /**
   * Move atomicamente o pendente para o hash de processamento e devolve o que
   * deve ser aplicado (inclui sobra de um flush anterior interrompido).
   *
   * @param target Contador a drenar.
   * @returns Pares `[id, delta]` com delta diferente de zero.
   * @example
   * const entries = await buffer.drain('postLikes')
   */
  async drain(target: CounterTargetName): Promise<Array<[string, number]>> {
    const entries = await cache.drainHashInto(this.pendingKey(target), this.processingKey(target))

    return entries.filter(([, delta]) => delta !== 0)
  }

  /**
   * Descarta o hash de processamento — chamado só após o commit do flush.
   *
   * @param target Contador já aplicado.
   * @returns Nada.
   * @example
   * await buffer.clearProcessing('postLikes')
   */
  async clearProcessing(target: CounterTargetName): Promise<void> {
    await cache.del(this.processingKey(target))
  }

  /**
   * Remove pendente e processamento de todos os alvos.
   *
   * WARNING: descarta deltas não aplicados — uso restrito a testes.
   *
   * @returns Nada.
   * @example
   * await new CounterBufferService().clearAll()
   */
  async clearAll(): Promise<void> {
    const targets = Object.keys(COUNTER_TARGETS) as CounterTargetName[]
    await Promise.all(
      targets.flatMap((target) => [
        cache.del(this.pendingKey(target)),
        cache.del(this.processingKey(target)),
      ])
    )
  }

  private async readDeltas(target: CounterTargetName, ids: string[]): Promise<CounterOverlay> {
    const overlay: CounterOverlay = new Map()
    if (ids.length === 0) {
      return overlay
    }

    const [pending, processing] = await Promise.all([
      cache.hmget(this.pendingKey(target), ids),
      cache.hmget(this.processingKey(target), ids),
    ])

    ids.forEach((id, index) => {
      const delta = Number(pending[index] ?? 0) + Number(processing[index] ?? 0)
      if (delta !== 0) {
        overlay.set(id, delta)
      }
    })

    return overlay
  }

  private pendingKey(target: CounterTargetName): string {
    return `${COUNTER_PENDING_KEY_PREFIX}${COUNTER_TARGETS[target].key}`
  }

  private processingKey(target: CounterTargetName): string {
    return `${COUNTER_PROCESSING_KEY_PREFIX}${COUNTER_TARGETS[target].key}`
  }
}

/**
 * Valor exibido de um contador: banco + delta pendente, nunca negativo.
 *
 * @param stored Valor gravado no banco.
 * @param overlay Deltas pendentes (de {@link CounterBufferService.pending}).
 * @param id Id da entidade.
 * @returns Contador a exibir.
 * @example
 * likesCount: withPendingDelta(post.likesCount, overlay, post.id)
 */
export function withPendingDelta(stored: number, overlay: CounterOverlay, id: string): number {
  return Math.max(stored + (overlay.get(id) ?? 0), 0)
}

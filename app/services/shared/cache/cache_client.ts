import type { Redis } from 'ioredis'
import { randomUUID } from 'node:crypto'

/**
 * Client de cache genérico (autenticação, rate limit, buffer de contadores) —
 * hoje apoiado em ioredis/DragonflyDB, mas a interface expõe só as operações
 * que a aplicação realmente usa. Uma troca futura de
 * backend (Redis, outro serviço compatível) só exige mudar a implementação
 * interna desta classe e do provider que a registra
 * (`providers/cache_provider.ts`) — nenhum consumidor referencia ioredis
 * diretamente.
 */
export class CacheClient {
  static readonly #INCR_WITH_INITIAL_TTL_SCRIPT = `
    local current = redis.call('INCR', KEYS[1])
    local ttl = redis.call('TTL', KEYS[1])

    if current == 1 or ttl == -1 then
      redis.call('EXPIRE', KEYS[1], ARGV[1])
    end

    return current
  `

  // NOTE: se sobrou hash de processamento de um flush que caiu, soma nele em
  // vez de RENAME (que sobrescreveria os deltas ainda não aplicados)
  static readonly #DRAIN_HASH_SCRIPT = `
    if redis.call('EXISTS', KEYS[2]) == 0 then
      if redis.call('EXISTS', KEYS[1]) == 1 then
        redis.call('RENAME', KEYS[1], KEYS[2])
      end
    else
      local entries = redis.call('HGETALL', KEYS[1])
      for i = 1, #entries, 2 do
        redis.call('HINCRBY', KEYS[2], entries[i], entries[i + 1])
      end
      redis.call('DEL', KEYS[1])
    end

    return redis.call('HGETALL', KEYS[2])
  `

  static readonly #RELEASE_LOCK_SCRIPT = `
    if redis.call('GET', KEYS[1]) == ARGV[1] then
      return redis.call('DEL', KEYS[1])
    end

    return 0
  `

  #redis: Redis

  constructor(redis: Redis) {
    this.#redis = redis
  }

  /**
   * Lê o valor bruto de uma chave.
   *
   * @param key Chave a ler.
   * @returns Valor armazenado, ou `null` se a chave não existir.
   * @example
   * const value = await cache.get('user:123:auth_version')
   */
  async get(key: string): Promise<string | null> {
    return this.#redis.get(key)
  }

  /**
   * Grava um valor com expiração.
   *
   * @param key Chave a gravar.
   * @param value Valor a armazenar.
   * @param ttlSeconds Tempo de vida da chave, em segundos.
   * @returns Nada.
   * @example
   * await cache.set('jti:abc', '1', 900)
   */
  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.#redis.set(key, value, 'EX', ttlSeconds)
  }

  /**
   * Incrementa (ou inicializa em 1, se ausente) um contador.
   *
   * @param key Chave do contador.
   * @returns Novo valor do contador após o incremento.
   * @example
   * const version = await cache.incr('user:123:auth_version')
   */
  async incr(key: string): Promise<number> {
    return this.#redis.incr(key)
  }

  /**
   * Incrementa um contador e garante TTL inicial em uma única operação atômica.
   *
   * @param key Chave do contador.
   * @param ttlSeconds Tempo de vida em segundos para a janela fixa.
   * @returns Novo valor do contador após o incremento.
   * @example
   * const attempts = await cache.incrWithInitialTtl('rate-limit:ip:127.0.0.1', 60)
   */
  async incrWithInitialTtl(key: string, ttlSeconds: number): Promise<number> {
    const result = await this.#redis.eval(
      CacheClient.#INCR_WITH_INITIAL_TTL_SCRIPT,
      1,
      key,
      ttlSeconds.toString()
    )

    return Number(result)
  }

  /**
   * Define (ou atualiza) o TTL de uma chave já existente.
   *
   * @param key Chave alvo.
   * @param ttlSeconds Tempo de vida em segundos.
   * @returns `true` quando o TTL foi aplicado; `false` quando a chave não existe.
   * @example
   * await cache.expire('rate-limit:ip:127.0.0.1', 60)
   */
  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.#redis.expire(key, ttlSeconds)
    return result === 1
  }

  /**
   * Verifica se uma chave existe.
   *
   * @param key Chave a verificar.
   * @returns `true` se a chave existir.
   * @example
   * if (await cache.exists('family:abc:revoked')) { ... }
   */
  async exists(key: string): Promise<boolean> {
    const count = await this.#redis.exists(key)
    return count === 1
  }

  /**
   * Remove uma chave (no-op se ela não existir).
   *
   * @param key Chave a remover.
   * @returns Nada.
   * @example
   * await cache.del('counter:processing:post_likes')
   */
  async del(key: string): Promise<void> {
    await this.#redis.del(key)
  }

  /**
   * Soma `delta` a um campo de hash (cria o hash/campo em 0 se ausente).
   *
   * @param key Chave do hash.
   * @param field Campo a incrementar.
   * @param delta Valor a somar (pode ser negativo).
   * @returns Novo valor do campo.
   * @example
   * await cache.hincrby('counter:pending:post_likes', postId, 1)
   */
  async hincrby(key: string, field: string, delta: number): Promise<number> {
    return this.#redis.hincrby(key, field, delta)
  }

  /**
   * Lê vários campos de um hash em uma única ida ao servidor.
   *
   * @param key Chave do hash.
   * @param fields Campos a ler.
   * @returns Valores na mesma ordem de `fields`, `null` para campos ausentes.
   * @example
   * const [a, b] = await cache.hmget('counter:pending:post_likes', [idA, idB])
   */
  async hmget(key: string, fields: string[]): Promise<(string | null)[]> {
    if (fields.length === 0) {
      return []
    }

    return this.#redis.hmget(key, ...fields)
  }

  /**
   * Move atomicamente o conteúdo do hash `source` para `destination` e devolve
   * tudo o que está em `destination`. Incrementos feitos em `source` depois da
   * chamada caem num hash novo, sem perda. Se `destination` já existir (sobra
   * de um processamento anterior interrompido), os valores são somados.
   *
   * @param source Hash ativo, que continua recebendo incrementos.
   * @param destination Hash de processamento.
   * @returns Pares `[campo, valor]` presentes em `destination` após a mescla.
   * @example
   * const entries = await cache.drainHashInto('counter:pending:post_likes', 'counter:processing:post_likes')
   */
  async drainHashInto(source: string, destination: string): Promise<Array<[string, number]>> {
    const flat = (await this.#redis.eval(
      CacheClient.#DRAIN_HASH_SCRIPT,
      2,
      source,
      destination
    )) as string[]

    const entries: Array<[string, number]> = []
    for (let i = 0; i < flat.length; i += 2) {
      entries.push([flat[i], Number(flat[i + 1])])
    }

    return entries
  }

  /**
   * Tenta adquirir um lock exclusivo com expiração (`SET NX EX`).
   *
   * @param key Chave do lock.
   * @param ttlSeconds Validade do lock, para não ficar preso se o dono cair.
   * @returns Token do dono (exigido por {@link releaseLock}) ou `null` se já está tomado.
   * @example
   * const token = await cache.acquireLock('counter:sync:lock', 300)
   */
  async acquireLock(key: string, ttlSeconds: number): Promise<string | null> {
    const token = randomUUID()
    const result = await this.#redis.set(key, token, 'EX', ttlSeconds, 'NX')

    return result === 'OK' ? token : null
  }

  /**
   * Libera um lock só se ele ainda pertence a `token` — um lock expirado e
   * readquirido por outro processo não é apagado.
   *
   * @param key Chave do lock.
   * @param token Token devolvido por {@link acquireLock}.
   * @returns Nada.
   * @example
   * await cache.releaseLock('counter:sync:lock', token)
   */
  async releaseLock(key: string, token: string): Promise<void> {
    await this.#redis.eval(CacheClient.#RELEASE_LOCK_SCRIPT, 1, key, token)
  }

  /**
   * Fecha a conexão subjacente — chamado pelo `shutdown()` do
   * `CacheProvider` ao encerrar o processo.
   *
   * @returns Nada.
   * @example
   * await cache.quit()
   */
  async quit(): Promise<void> {
    await this.#redis.quit()
  }
}

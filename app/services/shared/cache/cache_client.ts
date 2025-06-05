import type { Redis } from 'ioredis'

/**
 * Client de cache genérico usado pelos services de autenticação — hoje
 * apoiado em ioredis/DragonflyDB, mas a interface expõe só as operações que
 * a aplicação realmente usa (get/set/incr/exists/quit). Uma troca futura de
 * backend (Redis, outro serviço compatível) só exige mudar a implementação
 * interna desta classe e do provider que a registra
 * (`providers/cache_provider.ts`) — nenhum consumidor referencia ioredis
 * diretamente.
 */
export class CacheClient {
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

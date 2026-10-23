import type { ApplicationService } from '@adonisjs/core/types'
import { Redis } from 'ioredis'
import { redisConnection } from '#config/redis'
import { CacheClient } from '#services/shared/cache/cache_client'

/**
 * Registra o singleton de cache (`CacheClient`) usado pelos services de
 * autenticação — hoje apoiado em DragonflyDB via ioredis. Ver
 * `app/services/shared/cache/cache_client.ts` para a interface exposta aos
 * consumidores.
 */
export default class CacheProvider {
  #client?: CacheClient

  constructor(protected app: ApplicationService) {}

  /**
   * Registra o binding singleton de `CacheClient` no container.
   */
  register() {
    this.app.container.singleton(CacheClient, () => {
      this.#client = new CacheClient(new Redis(redisConnection))
      return this.#client
    })
  }

  /**
   * Fecha a conexão com o DragonflyDB quando a aplicação termina — sem isso o
   * socket aberto mantém o event loop vivo e comandos Ace que carregam a app
   * (ex.: `migration:run`) nunca encerram sozinhos.
   */
  async shutdown() {
    await this.#client?.quit()
  }
}

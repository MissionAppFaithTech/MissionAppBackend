import type { ApplicationService } from '@adonisjs/core/types'
import { Redis } from 'ioredis'
import { redisConnection } from '#config/redis'
import { CacheClient } from '#services/shared/cache/cache_client'

/**
 * Registra o singleton de cache (`CacheClient`) usado pelos services de
 * autenticação — hoje apoiado em DragonflyDB via ioredis. Ver
 * `app/services/shared/cache/cache_client.ts` para a interface exposta aos
 * consumidores.
 *
 * NOTE: sem hook `shutdown()` de propósito — o boot interno do `node ace
 * test` (fase de codegen) termina e reinicia o ciclo de vida da aplicação
 * dentro do mesmo processo antes dos testes reais rodarem. Um `shutdown()`
 * chamando `.quit()` aqui fecharia a conexão permanentemente (ioredis nunca
 * reconecta após `.quit()`) nesse ponto intermediário, quebrando os testes
 * reais que rodam depois. O encerramento explícito da conexão nos testes é
 * feito em `tests/bootstrap.ts`, que roda no teardown real do Japa.
 */
export default class CacheProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Registra o binding singleton de `CacheClient` no container.
   */
  register() {
    this.app.container.singleton(CacheClient, () => new CacheClient(new Redis(redisConnection)))
  }
}

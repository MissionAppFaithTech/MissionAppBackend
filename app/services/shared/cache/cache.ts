import app from '@adonisjs/core/services/app'
import { CacheClient } from '#services/shared/cache/cache_client'

let cache: CacheClient

/**
 * Instância singleton de `CacheClient`, resolvida do container após o boot
 * da aplicação — mesmo padrão usado por `@adonisjs/lucid/services/db`. Passa
 * pelo container (em vez de `new CacheClient(...)` direto aqui) só por causa
 * do `CacheProvider`: permite `container.swap(CacheClient, fake)` em testes
 * no futuro, sem isso o provider não teria propósito.
 */
await app.booted(async () => {
  cache = await app.container.make(CacheClient)
})

export { cache as default }

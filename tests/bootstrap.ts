import { assert } from '@japa/assert'
import { apiClient } from '@japa/api-client'
import app from '@adonisjs/core/services/app'
import type { Config } from '@japa/runner/types'
import { pluginAdonisJS } from '@japa/plugin-adonisjs'
import { dbAssertions } from '@adonisjs/lucid/plugins/db'
import testUtils from '@adonisjs/core/services/test_utils'
import { authApiClient } from '@adonisjs/auth/plugins/api_client'
import { sessionApiClient } from '@adonisjs/session/plugins/api_client'
import searchClient from '#services/shared/search/search_client'
import { MissionarySearchService } from '#services/search/missionary_search_service'
import { emailQueue } from '#queues/email_queue'
import { searchIndexingQueue } from '#queues/search_indexing_queue'
import type { Registry } from '../.adonisjs/client/registry/schema.d.ts'

/**
 * Este arquivo é importado pelo arquivo de entrypoint "bin/test.ts"
 */
declare module '@japa/api-client/types' {
  interface RoutesRegistry extends Registry {}
}

/**
 * Este arquivo é importado pelo arquivo de entrypoint "bin/test.ts"
 */

/**
 * Configure os plugins do Japa no array plugins.
 * Saiba mais - https://japa.dev/docs/runner-config#plugins-optional
 */
export const plugins: Config['plugins'] = [
  assert(),
  pluginAdonisJS(app),
  dbAssertions(app),
  apiClient(),
  sessionApiClient(app),
  authApiClient(app),
]

/**
 * Configure a função de ciclo de vida executada antes e depois
 * de todos os testes.
 *
 * As funções de setup são executadas antes de todos os testes
 * As funções de teardown são executadas depois de todos os testes
 */
export const runnerHooks: Required<Pick<Config, 'setup' | 'teardown'>> = {
  // NOTE: aquece o Elasticsearch antes da suíte — com o container recém-subido
  // e o índice ainda inexistente, a primeira chamada (criação do índice + JVM
  // fria) passa dos 2s de timeout da suíte unit. Pago aqui, fora de qualquer
  // teste, o custo não vira falha intermitente.
  setup: [
    async () => {
      await new MissionarySearchService().searchByName('aquecimento')
    },
  ],
  // NOTE: fecha as conexões compartilhadas — sem isso o processo nunca encerra
  // sozinho (forceExit: false + socket aberto mantêm o event loop vivo). O
  // cache não entra aqui: é fechado pelo `shutdown()` do CacheProvider no
  // `app.terminate()` encadeado em bin/test.ts.
  teardown: [
    () => searchClient.close(),
    () => emailQueue.close(),
    () => searchIndexingQueue.close(),
  ],
}

/**
 * Configure as suítes acessando a instância da suíte de teste.
 * Saiba mais - https://japa.dev/docs/test-suites#lifecycle-hooks
 */
export const configureSuite: Config['configureSuite'] = (suite) => {
  if (['browser', 'functional', 'e2e'].includes(suite.name)) {
    return suite.setup(() => testUtils.httpServer().start())
  }
}

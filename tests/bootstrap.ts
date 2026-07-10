import { assert } from '@japa/assert'
import { apiClient } from '@japa/api-client'
import app from '@adonisjs/core/services/app'
import type { Config } from '@japa/runner/types'
import { pluginAdonisJS } from '@japa/plugin-adonisjs'
import { dbAssertions } from '@adonisjs/lucid/plugins/db'
import testUtils from '@adonisjs/core/services/test_utils'
import { authApiClient } from '@adonisjs/auth/plugins/api_client'
import { sessionApiClient } from '@adonisjs/session/plugins/api_client'
import cache from '#services/shared/cache/cache'
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
  setup: [],
  // NOTE: fecha a conexão ioredis compartilhada — sem isso o processo nunca
  // encerra sozinho (forceExit: false + socket aberto mantêm o event loop vivo).
  teardown: [() => cache.quit()],
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

/*
|--------------------------------------------------------------------------
| Arquivo do kernel HTTP
|--------------------------------------------------------------------------
|
| O arquivo do kernel HTTP é usado para registrar os middlewares no
| servidor ou no router.
|
*/

import router from '@adonisjs/core/services/router'
import server from '@adonisjs/core/services/server'

/**
 * O error handler é usado para converter uma exception
 * em uma resposta HTTP.
 */
server.errorHandler(() => import('#exceptions/handler'))

/**
 * A stack de middleware do server roda middlewares em todas as
 * requisições HTTP, mesmo quando não há rota registrada para
 * a URL da requisição.
 */
server.use([
  () => import('#middleware/request_logger_middleware'),
  () => import('#middleware/force_json_response_middleware'),
  () => import('#middleware/container_bindings_middleware'),
  () => import('@adonisjs/cors/cors_middleware'),
])

/**
 * A stack de middleware do router roda middlewares em todas as
 * requisições HTTP com uma rota registrada.
 */
router.use([
  () => import('@adonisjs/core/bodyparser_middleware'),
  () => import('@adonisjs/session/session_middleware'),
  () => import('@adonisjs/shield/shield_middleware'),
  () => import('@adonisjs/auth/initialize_auth_middleware'),
  () => import('#middleware/silent_auth_middleware'),
])

/**
 * Middlewares nomeados devem ser atribuídos explicitamente às
 * rotas ou ao grupo de rotas.
 */
export const middleware = router.named({
  auth: () => import('#middleware/auth_middleware'),
})

/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'
import { controllers } from '#generated/controllers'

router.get('/', () => {
  return { hello: 'world' }
})

router
  .group(() => {
    router.post('accounts', [controllers.Account, 'store'])

    router
      .group(() => {
        router.post('login', [controllers.AccessTokens, 'store'])
        router.delete('logout', [controllers.AccessTokens, 'destroy']).use(middleware.auth())
      })
      .prefix('auth')
      .as('auth')

    router.get('account/profile', [controllers.Profile, 'show']).use(middleware.auth())
  })
  .prefix('/api/v1')
  .as('v1')

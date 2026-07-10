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
    router.post('accounts', [controllers.user.Account, 'store'])

    router
      .group(() => {
        router.post('login', [controllers.auth.AccessTokens, 'store'])
        router.delete('logout', [controllers.auth.AccessTokens, 'destroy'])
        router.post('refresh', [controllers.auth.RefreshTokens, 'store'])
        router.post('forgot-password', [controllers.auth.ForgotPassword, 'store'])
        router.patch('reset-password', [controllers.auth.ResetPassword, 'update'])

        router
          .group(() => {
            router.get('sessions', [controllers.auth.Sessions, 'index'])
            router.delete('sessions', [controllers.auth.AllSessions, 'destroy'])
            router.delete('sessions/:familyId', [controllers.auth.Sessions, 'destroy'])
          })
          .use(middleware.auth())
      })
      .prefix('auth')
      .as('auth')

    router.get('account/profile', [controllers.user.Profile, 'show']).use(middleware.auth())
    router
      .patch('account/password', [controllers.user.AccountPassword, 'update'])
      .use(middleware.auth())
  })
  .prefix('/api/v1')
  .as('v1')

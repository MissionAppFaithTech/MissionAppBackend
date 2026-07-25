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
import { readFile } from 'node:fs/promises'
import { extname, resolve } from 'node:path'

const docsRoot = resolve(process.cwd(), 'docs', 'api', 'v1')

const docsContentTypes: Record<string, string> = {
  '.yaml': 'text/yaml; charset=utf-8',
  '.yml': 'text/yaml; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
}

router.get('/docs', async ({ response }) => {
  return response.type('text/html; charset=utf-8').send(`<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>MissionApp API Docs</title>
  </head>
  <body>
    <script
      id="api-reference"
      data-url="/docs/api/v1/openapi.bundle.yaml"
    ></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`)
})

router.get('/docs/api/v1/*', async ({ request, response }) => {
  const wildcard = request.param('*')
  const requestedPath = Array.isArray(wildcard) ? wildcard.join('/') : `${wildcard ?? ''}`
  const filePath = resolve(docsRoot, requestedPath)

  if (!filePath.startsWith(docsRoot)) {
    return response.badRequest({ message: 'Caminho inválido' })
  }

  try {
    const content = await readFile(filePath, 'utf8')
    const contentType = docsContentTypes[extname(filePath)] ?? 'text/plain; charset=utf-8'

    return response.type(contentType).send(content)
  } catch {
    return response.notFound({ message: 'Arquivo de documentação não encontrado' })
  }
})

router.get('/', () => {
  return { hello: 'world' }
})

router
  .group(() => {
    router.post('accounts', [controllers.user.Account, 'store'])
    router.post('media-assets', [controllers.mediaAsset.MediaAssets, 'store']).use(middleware.auth())

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
    router.patch('account/profile', [controllers.user.Profile, 'update']).use(middleware.auth())
    router
      .patch('account/password', [controllers.user.AccountPassword, 'update'])
      .use(middleware.auth())

    router
      .group(() => {
        router.patch('about', [controllers.missionary.About, 'update'])
        router.post('profile', [controllers.missionary.Profile, 'store'])
        router.patch('profile', [controllers.missionary.Profile, 'update'])
        router.patch('identity', [controllers.missionary.Identity, 'update'])
        router.patch('work-address', [controllers.missionary.WorkAddress, 'update'])
      })
      .prefix('missionaries')
      .as('missionary')
      .use(middleware.auth())

    router
      .group(() => {
        router.patch('about', [controllers.missionary.About, 'update'])
        router.patch('profile', [controllers.missionary.Profile, 'update'])
        router.patch('identity', [controllers.missionary.Identity, 'update'])
        router.patch('work-address', [controllers.missionary.WorkAddress, 'update'])
      })
      .prefix('missionaries/:id')
      .as('missionary.admin')
      .use(middleware.auth())
  })
  .prefix('/api/v1')
  .as('v1')

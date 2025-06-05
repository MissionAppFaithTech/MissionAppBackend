/*
|--------------------------------------------------------------------------
| Entrypoint do servidor HTTP
|--------------------------------------------------------------------------
|
| O arquivo "server.ts" é o entrypoint para iniciar o servidor HTTP do
| AdonisJS. Você pode rodar este arquivo diretamente ou usar o comando
| "serve" para rodá-lo e monitorar mudanças de arquivo
|
*/

await import('reflect-metadata')
const { Ignitor, prettyPrintError } = await import('@adonisjs/core')

/**
 * URL para a raiz da aplicação. O AdonisJS precisa dela para resolver
 * paths de arquivos e diretórios para comandos de scaffolding
 */
const APP_ROOT = new URL('../', import.meta.url)

/**
 * O importer é usado para importar arquivos no contexto da
 * aplicação.
 */
const IMPORTER = (filePath: string) => {
  if (filePath.startsWith('./') || filePath.startsWith('../')) {
    return import(new URL(filePath, APP_ROOT).href)
  }
  return import(filePath)
}

new Ignitor(APP_ROOT, { importer: IMPORTER })
  .tap((app) => {
    app.booting(async () => {
      await import('#start/env')
    })
    app.listen('SIGTERM', () => app.terminate())
    app.listenIf(app.managedByPm2, 'SIGINT', () => app.terminate())
  })
  .httpServer()
  .start()
  .catch((error) => {
    process.exitCode = 1
    prettyPrintError(error)
  })

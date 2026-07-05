/*
|--------------------------------------------------------------------------
| Entry point do Ace
|--------------------------------------------------------------------------
|
| O arquivo "console.ts" é o entrypoint para inicializar o framework de
| linha de comando do AdonisJS e executar comandos.
|
| Comandos não inicializam a aplicação, a menos que o comando em execução
| tenha a flag "options.startApp" definida como true.
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
  .ace()
  .handle(process.argv.splice(2))
  .catch((error) => {
    process.exitCode = 1
    prettyPrintError(error)
  })

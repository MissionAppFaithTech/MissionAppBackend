import { normalizeError } from '#utils/error_envelope'
import { test } from '@japa/runner'
import { readdir } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const EXCEPTIONS_DIR = fileURLToPath(new URL('../../../app/exceptions', import.meta.url))

async function exceptionFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) return exceptionFiles(path)
      return Promise.resolve(entry.name.endsWith('_exception.ts') ? [path] : [])
    })
  )
  return nested.flat()
}

type ExceptionClass = (new (message: string, ...args: unknown[]) => Error) & {
  code?: string
  status?: number
}

/**
 * Contrato do ADR-0034: toda exceção de domínio tem um `code` estável `E_*`, um
 * status 4xx (ou um 5xx deliberado, como 503) e chega ao cliente no envelope com
 * esse mesmo `code`. O 500 é reservado para erros internos.
 */
test.group('Exceções de domínio (contrato do envelope de erro)', () => {
  test('existe pelo menos uma exceção a verificar', async ({ assert }) => {
    const files = await exceptionFiles(EXCEPTIONS_DIR)
    assert.isAbove(files.length, 0)
  })

  test('cada exceção declara code E_*, status de erro e sai no envelope', async ({ assert }) => {
    for (const file of await exceptionFiles(EXCEPTIONS_DIR)) {
      const name = relative(EXCEPTIONS_DIR, file)
      const module = (await import(pathToFileURL(file).href)) as { default: ExceptionClass }
      const ExceptionCtor = module.default

      assert.match(String(ExceptionCtor.code), /^E_[A-Z0-9_]+$/, `${name}: code inválido`)
      assert.isAtLeast(Number(ExceptionCtor.status), 400, `${name}: status abaixo de 400`)
      assert.notEqual(
        Number(ExceptionCtor.status),
        500,
        `${name}: 500 é reservado a erros internos`
      )
      assert.isBelow(Number(ExceptionCtor.status), 600, `${name}: status inválido`)

      const { status, envelope } = normalizeError(new ExceptionCtor('Mensagem de teste', 30))
      assert.equal(status, ExceptionCtor.status, `${name}: status no envelope`)
      assert.equal(envelope.code, ExceptionCtor.code, `${name}: code no envelope`)
      assert.equal(envelope.message, 'Mensagem de teste', `${name}: mensagem no envelope`)
    }
  })
})

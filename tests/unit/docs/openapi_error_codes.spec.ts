import { test } from '@japa/runner'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parse } from 'yaml'

const ROOT = fileURLToPath(new URL('../../../', import.meta.url))
const API = join(ROOT, 'docs/api/v1')
const DOMAIN_SPECS = [
  'auth/auth.openapi.yaml',
  'missionary/missionary.openapi.yaml',
  'user/user.openapi.yaml',
  'impact_project/impact_project.openapi.yaml',
  'media_asset/media_asset.openapi.yaml',
  'post/post.openapi.yaml',
]
const METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const

/**
 * Codes the framework answers with on its own (VineJS, auth guard, Lucid,
 * router, rate limit middlewares and the envelope fallbacks). Domain codes are
 * read from `app/exceptions/**`.
 */
const FRAMEWORK_CODES = [
  'E_VALIDATION_ERROR',
  'E_UNAUTHORIZED_ACCESS',
  'E_INVALID_CREDENTIALS',
  'E_ROW_NOT_FOUND',
  'E_ROUTE_NOT_FOUND',
  'E_TOO_MANY_REQUESTS',
  'E_INTERNAL_SERVER_ERROR',
]

type Response = { description?: string; content?: Record<string, { schema?: { $ref?: string } }> }
type Operation = { responses?: Record<string, Response> }
type Spec = { paths: Record<string, Partial<Record<(typeof METHODS)[number], Operation>>> }

async function loadSpec(relativePath: string): Promise<Spec> {
  return parse(await readFile(join(API, relativePath), 'utf8')) as Spec
}

async function domainCodes(dir = join(ROOT, 'app/exceptions')): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const codes = await Promise.all(
    entries.map(async (entry) => {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) return domainCodes(path)
      if (!entry.name.endsWith('_exception.ts')) return []
      const module = (await import(pathToFileURL(path).href)) as { default: { code?: string } }
      return module.default.code ? [module.default.code] : []
    })
  )
  return codes.flat()
}

function operations(spec: Spec) {
  return Object.entries(spec.paths).flatMap(([path, item]) =>
    METHODS.filter((method) => item[method]).map((method) => ({
      label: `${method.toUpperCase()} ${path}`,
      path,
      method,
      responses: item[method]!.responses ?? {},
    }))
  )
}

/** Every documented error response of the domain specs, flattened. */
async function errorResponses() {
  const specs = await Promise.all(
    DOMAIN_SPECS.map(async (file) => ({ file, spec: await loadSpec(file) }))
  )
  return specs.flatMap(({ file, spec }) =>
    operations(spec).flatMap(({ label, responses }) =>
      Object.entries(responses)
        .filter(([status]) => Number(status) >= 400)
        .map(([status, response]) => ({ where: `${file} ${label} ${status}`, status, response }))
    )
  )
}

/** "Códigos: `E_A`, `E_B`." at the end of the description. */
function citedCodes(description = ''): string[] {
  const text = description.replace(/\s+/g, ' ')
  const match = /Códigos: ((?:`E_[A-Z0-9_]+`(?:, )?)+)\.$/.exec(text.trim())
  return match ? [...match[1].matchAll(/`(E_[A-Z0-9_]+)`/g)].map((m) => m[1]) : []
}

const schemaName = (response: Response) =>
  response.content?.['application/json']?.schema?.$ref?.split('#/components/schemas/')[1]

/**
 * ADR-0034, item 6: every error response documents the codes the operation can
 * answer, and the hand-kept bundle says the same as the domain specs.
 */
test.group('OpenAPI: códigos de erro por rota (ADR-0034)', () => {
  test('toda resposta de erro cita os códigos possíveis, e todos existem na API', async ({
    assert,
  }) => {
    const known = new Set([...FRAMEWORK_CODES, ...(await domainCodes())])

    for (const { where, response } of await errorResponses()) {
      const codes = citedCodes(response.description)
      assert.isAbove(codes.length, 0, `${where}: sem "Códigos: …"`)
      const unknown = codes.filter((code) => !known.has(code))
      assert.isEmpty(unknown, `${where}: códigos que não existem na API`)
    }
  })

  test('422 usa ValidationErrorResponse e os demais erros usam ErrorResponse', async ({
    assert,
  }) => {
    for (const { where, status, response } of await errorResponses()) {
      const expected = status === '422' ? 'ValidationErrorResponse' : 'ErrorResponse'
      assert.equal(schemaName(response), expected, where)
    }
  })

  test('o bundle repete as respostas de cada operação dos arquivos de domínio', async ({
    assert,
  }) => {
    const bundle = await loadSpec('openapi.bundle.yaml')
    const normalize = (value: unknown) =>
      JSON.parse(JSON.stringify(value).replaceAll('../auth/auth.openapi.yaml#', '#'))
    const domainLabels: string[] = []

    for (const file of DOMAIN_SPECS) {
      for (const { label, path, method, responses } of operations(await loadSpec(file))) {
        domainLabels.push(label)
        assert.deepEqual(
          normalize(bundle.paths[path]?.[method]?.responses),
          normalize(responses),
          `bundle diverge de ${file} em ${label}`
        )
      }
    }

    assert.sameMembers(
      operations(bundle).map(({ label }) => label),
      domainLabels,
      'o bundle e os arquivos de domínio têm as mesmas operações'
    )
  })
})

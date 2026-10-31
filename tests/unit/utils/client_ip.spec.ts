import { BFF_SECRET_HEADER, CLIENT_IP_HEADER, resolveClientIp } from '#utils/client_ip'
import type { RequestContext } from '#types/http/context'
import { test } from '@japa/runner'

const SECRET = 'segredo-de-teste-com-tamanho-suficiente'
const CONNECTION_IP = '10.0.0.5'

function fakeRequest(headers: Record<string, string>): RequestContext {
  return {
    ip: () => CONNECTION_IP,
    header: (name: string) => headers[name.toLowerCase()],
  } as unknown as RequestContext
}

test.group('resolveClientIp', () => {
  test('usa o IP da conexão quando o segredo não está configurado', ({ assert }) => {
    const request = fakeRequest({ [BFF_SECRET_HEADER]: SECRET, [CLIENT_IP_HEADER]: '203.0.113.9' })
    assert.equal(resolveClientIp(request, ''), CONNECTION_IP)
  })

  test('usa o IP repassado pelo BFF quando o segredo confere', ({ assert }) => {
    const request = fakeRequest({
      [BFF_SECRET_HEADER]: SECRET,
      [CLIENT_IP_HEADER]: ' 203.0.113.9 ',
    })
    assert.equal(resolveClientIp(request, SECRET), '203.0.113.9')
  })

  test('aceita IPv6', ({ assert }) => {
    const request = fakeRequest({ [BFF_SECRET_HEADER]: SECRET, [CLIENT_IP_HEADER]: '2001:db8::1' })
    assert.equal(resolveClientIp(request, SECRET), '2001:db8::1')
  })

  test('ignora o IP repassado quando o segredo diverge', ({ assert }) => {
    const request = fakeRequest({
      [BFF_SECRET_HEADER]: 'errado',
      [CLIENT_IP_HEADER]: '203.0.113.9',
    })
    assert.equal(resolveClientIp(request, SECRET), CONNECTION_IP)
  })

  test('ignora o IP repassado sem o header de segredo', ({ assert }) => {
    const request = fakeRequest({ [CLIENT_IP_HEADER]: '203.0.113.9' })
    assert.equal(resolveClientIp(request, SECRET), CONNECTION_IP)
  })

  test('ignora valores que não são IP', ({ assert }) => {
    const request = fakeRequest({ [BFF_SECRET_HEADER]: SECRET, [CLIENT_IP_HEADER]: 'not-an-ip' })
    assert.equal(resolveClientIp(request, SECRET), CONNECTION_IP)
  })

  test('sem o header de IP, vale o IP da conexão', ({ assert }) => {
    const request = fakeRequest({ [BFF_SECRET_HEADER]: SECRET })
    assert.equal(resolveClientIp(request, SECRET), CONNECTION_IP)
  })
})

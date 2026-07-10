/**
 * Verifica se um endereço é loopback ou de rede privada (RFC 1918) — usado
 * como `trustProxy` em `config/app.ts` para decidir quando confiar em
 * `X-Forwarded-For`/`X-Forwarded-Proto`. Cobre tanto um load balancer na
 * rede privada (ADR-0021) quanto um proxy reverso (ex: Nginx Proxy Manager)
 * rodando em container Docker separado na mesma VPS — a rede bridge padrão
 * do Docker cai dentro de 172.16.0.0/12, portanto não é loopback do ponto de
 * vista da app mesmo estando fisicamente na mesma máquina.
 *
 * @param address Endereço IP de origem da conexão imediata (pode vir com
 *                prefixo IPv4-mapped `::ffff:`, normalizado antes do teste).
 * @returns Se `address` é loopback (127.0.0.0/8, ::1) ou privada
 *          (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, fc00::/7).
 * @example
 * isTrustedProxyAddress('172.20.0.3')  // true — dentro da faixa bridge do Docker
 * isTrustedProxyAddress('203.0.113.5') // false — endereço público
 */
export function isTrustedProxyAddress(address: string): boolean {
  const normalized = address.replace(/^::ffff:/i, '')

  return (
    normalized === '::1' ||
    normalized.startsWith('127.') ||
    normalized.startsWith('10.') ||
    normalized.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(normalized) ||
    /^f[cd][0-9a-f]{0,2}:/i.test(normalized)
  )
}

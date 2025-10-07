import type { FastifyRequest } from 'fastify'

export function getClientIp(request: FastifyRequest): string {
  // const xff = request.headers['x-forwarded-for']
  // if (Array.isArray(xff)) return xff[0]
  // if (typeof xff === 'string' && xff.length > 0) return xff.split(',')[0].trim()
  return request.ip
}

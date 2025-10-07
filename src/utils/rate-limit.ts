import type { RateLimitInput } from '@custom-types/rate-limit-input-type'
import { RateLimitError } from '@use-cases/errors/generic/rate-limit-error'
import type { RouteOptions } from 'fastify'
import { getClientIp } from './get-client-ip'

export function rateLimit({ max = 5, timeWindow }: RateLimitInput): Partial<RouteOptions> {
  return {
    config: {
      rateLimit: {
        max,
        timeWindow,
        keyGenerator: (request) => getClientIp(request),
        errorResponseBuilder: () => new RateLimitError(),
      },
    },
  }
}

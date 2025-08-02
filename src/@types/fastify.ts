// src/@types/fastify-jwt.d.ts
import '@fastify/jwt'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: {
      publicId: string
    }
    sign: {
      sub: string
      expiresIn?: string
    }
  }
}

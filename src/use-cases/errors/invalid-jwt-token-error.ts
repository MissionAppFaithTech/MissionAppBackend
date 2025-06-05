export class InvalidJwtTokenError extends Error {
  constructor() {
    super('Token JWT inválido')
  }
}

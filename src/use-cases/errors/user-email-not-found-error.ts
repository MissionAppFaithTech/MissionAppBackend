export class UserEmailNotFoundError extends Error {
  constructor() {
    super('User email not found')
  }
}

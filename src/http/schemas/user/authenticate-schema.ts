import { z } from 'zod'
import { emailSchema } from '../utils/email'
import { nonemptyTextSchema } from '../utils/nonempty-text'

export const authenticateBodySchema = z.object({
  email: emailSchema,
  password: nonemptyTextSchema,
})

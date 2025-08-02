import { nonemptyTextSchema } from './nonempty-text'

export const emailSchema = nonemptyTextSchema.min(6).email()

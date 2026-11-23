import { FeedScope } from '#enums/post/feed_scope'
import { cursor } from '#validators/shared/fields/cursor'
import { limit } from '#validators/shared/fields/limit'
import vine from '@vinejs/vine'

export const listFeedValidator = vine.create({
  scope: vine.enum(Object.values(FeedScope)).optional(),
  cursor: cursor(),
  limit: limit(),
})

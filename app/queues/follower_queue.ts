import { bullMQConnection } from '#config/redis'
import { FOLLOWER_QUEUE_NAME } from '#constants/follower'
import type { UserFollowedPayload } from '#types/events/follower/user_followed'
import type { UserUnfollowedPayload } from '#types/events/follower/user_unfollowed'
import { Queue } from 'bullmq'

/**
 * Fila BullMQ dedicada ao recálculo dos contadores em cache de
 * seguidores/seguindo — separada da fila de indexação de busca
 * (`#queues/search_indexing_queue`) porque atende um domínio diferente
 * (contadores no Postgres, não indexação no Elasticsearch).
 */
export const followerQueue = new Queue<UserFollowedPayload | UserUnfollowedPayload>(
  FOLLOWER_QUEUE_NAME,
  { connection: bullMQConnection }
)

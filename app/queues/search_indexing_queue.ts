import { bullMQConnection } from '#config/redis'
import type { MISSIONARY_INDEXING_JOB_NAME } from '#constants/missionary_search'
import { SEARCH_INDEXING_QUEUE_NAME } from '#constants/search'
import type { MissionaryProfileCreatedPayload } from '#types/events/missionary/missionary_profile_created'
import type { UserRegisteredPayload } from '#types/events/user/user_registered'
import { Queue } from 'bullmq'

/**
 * Fila de produção única, compartilhada por toda indexação no Elasticsearch
 * — ver `app/constants/search.ts` pro motivo de ser uma fila só em vez de
 * uma por tipo de modelo indexado. Cada listener de indexação (hoje só
 * `IndexMissionaryListener`) usa esta mesma instância, só variando o
 * `job.name` no `.add()`.
 *
 * O tipo do payload é a união dos payloads de todo evento que hoje dispara
 * indexação — acrescente aqui (`| NovoEventoPayload`) ao adicionar a
 * indexação de um novo modelo.
 *
 * NameType é explicitado pois o BullMQ v6 não reduz mais sozinho o tipo
 * default de `job.name` quando `DataTypeOrJob` é uma união.
 */
export const searchIndexingQueue = new Queue<
  UserRegisteredPayload | MissionaryProfileCreatedPayload,
  void,
  typeof MISSIONARY_INDEXING_JOB_NAME
>(SEARCH_INDEXING_QUEUE_NAME, {
  connection: bullMQConnection,
})

/**
 * Nome da fila BullMQ única que enfileira toda indexação no Elasticsearch da
 * aplicação (missionários, e outros modelos buscáveis conforme forem
 * adicionados) — mesmo motivo da fila única de email (`#constants/mail`):
 * concorrência do worker controlada num lugar só, não por-tipo-de-modelo. O
 * tipo específico de cada job dentro dessa fila é distinguido pelo próprio
 * `job.name` do BullMQ (ex: `MISSIONARY_INDEXING_JOB_NAME`), não por um
 * campo separado no payload.
 */
export const SEARCH_INDEXING_QUEUE_NAME = 'search-indexing'

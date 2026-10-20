import { BaseEvent } from '@adonisjs/core/events'

/**
 * Disparado após o commit de uma transação que deixou arquivos sem
 * referência (imagem substituída, post/projeto removido, imagem excedente ao
 * limite por missionário) — a remoção no storage roda no worker.
 */
export default class MediaAssetsDiscarded extends BaseEvent {
  constructor(readonly mediaAssetIds: string[]) {
    super()
  }
}

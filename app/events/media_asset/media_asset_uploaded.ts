import { BaseEvent } from '@adonisjs/core/events'

/**
 * Disparado quando o cliente confirma que concluiu o upload direto ao
 * storage — a validação do conteúdo real e a compressão acontecem no worker,
 * fora do ciclo da requisição HTTP.
 */
export default class MediaAssetUploaded extends BaseEvent {
  constructor(readonly mediaAssetId: string) {
    super()
  }
}

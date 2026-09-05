import { BaseEvent } from '@adonisjs/core/events'

/**
 * Disparado após um apoiador começar a seguir um missionário, permitindo o
 * recálculo assíncrono dos contadores em cache (`followers_count`/
 * `following_count`) sem acoplar o fluxo HTTP ao Postgres extra.
 */
export default class UserFollowed extends BaseEvent {
  constructor(
    readonly followerId: string,
    readonly followingId: string
  ) {
    super()
  }
}

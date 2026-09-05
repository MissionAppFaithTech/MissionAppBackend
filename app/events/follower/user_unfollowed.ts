import { BaseEvent } from '@adonisjs/core/events'

/**
 * Disparado após um apoiador deixar de seguir um missionário, permitindo o
 * recálculo assíncrono dos contadores em cache (`followers_count`/
 * `following_count`) sem acoplar o fluxo HTTP ao Postgres extra.
 */
export default class UserUnfollowed extends BaseEvent {
  constructor(
    readonly followerId: string,
    readonly followingId: string
  ) {
    super()
  }
}

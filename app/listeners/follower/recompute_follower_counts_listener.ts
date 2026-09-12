import { RECOMPUTE_FOLLOWER_COUNTS_JOB_NAME } from '#constants/follower'
import type UserFollowed from '#events/follower/user_followed'
import type UserUnfollowed from '#events/follower/user_unfollowed'
import { followerQueue } from '#queues/follower_queue'

export default class RecomputeFollowerCountsListener {
  async handle(event: UserFollowed | UserUnfollowed): Promise<void> {
    await followerQueue.add(RECOMPUTE_FOLLOWER_COUNTS_JOB_NAME, { ...event })
  }
}

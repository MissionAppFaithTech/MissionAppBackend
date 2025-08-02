import type { UserRole } from '@prisma/client'
import type { UserWithDetails } from '@/@types/user-with-details'

interface HTTPUserDetails {
  id: string
  name: string
  username: string
  email: string
  biography: string | null
  role: UserRole
  phoneNumber: string
  profilePicture: string | null
  followersCount: number
  followingCount: number
}

interface HTTPMissionary {
  publicEmail: string | null | undefined
  publicPhoneNumber: string | null | undefined
  missionaryAgencyName: string
}

interface HTTPFaithCommunity {
  name: string
  phoneNumber: string
}

interface HTTPUser {
  user: HTTPUserDetails
  missionary: HTTPMissionary | null
  faithCommunity: HTTPFaithCommunity | null
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class UserPresenter {
  static toHTTP(user: UserWithDetails): HTTPUser
  static toHTTP(users: UserWithDetails[]): HTTPUser[]
  static toHTTP(
    input: UserWithDetails | UserWithDetails[],
  ): HTTPUser | HTTPUser[] {
    if (Array.isArray(input)) {
      return input.map((user) => this.toHTTP(user))
    }

    return {
      user: {
        id: input.publicId,
        name: input.name,
        username: input.username,
        email: input.email,
        biography: input.biography,
        role: input.role,
        phoneNumber: input.phoneNumber,
        profilePicture: input.profilePicture,
        followersCount: input.followersCount,
        followingCount: input.followingCount,
      },

      missionary:
        input.Missionary !== null
          ? {
              publicEmail: input.Missionary?.publicEmail,
              publicPhoneNumber: input.Missionary?.publicPhoneNumber,
              missionaryAgencyName: input.Missionary.MissionaryAgency.name,
            }
          : null,

      faithCommunity:
        input.FaithCommunity !== null
          ? {
              name: input.FaithCommunity.name,
              phoneNumber: input.FaithCommunity.phoneNumber,
            }
          : null,
    }
  }
}

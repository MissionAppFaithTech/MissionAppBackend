import type { User, UserRoleType } from "@prisma/client";

interface HTTPUser {
	id: string;
	name: string;
	username: string;
	email: string;
	biography: string | null;
	role: UserRoleType;
	phoneNumber: string;
	profilePicture: string | null;
	followersCount: number;
	followingCount: number;
}

// interface HTTPMissionary {
//   publicEmail: string | null | undefined
//   publicPhoneNumber: string | null | undefined
//   missionaryAgencyName: string
// }

// interface HTTPFaithCommunity {
//   name: string
//   phoneNumber: string
// }

// interface HTTPUser {
//   user: HTTPUserDetails
// }

export class UserPresenter {
	static toHTTP(user: User): HTTPUser;
	static toHTTP(users: User[]): HTTPUser[];
	static toHTTP(input: User | User[]): HTTPUser | HTTPUser[] {
		if (Array.isArray(input)) {
			return input.map((user) => UserPresenter.toHTTP(user));
		}

		return {
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
		};
	}
}

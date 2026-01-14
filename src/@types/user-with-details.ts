import { Prisma } from "@prisma/client";

export const userWithDetails = Prisma.validator<Prisma.UserDefaultArgs>()({
	include: {
		FaithCommunity: true,
		Missionary: {
			include: {
				MissionaryAgency: true,
			},
		},
	},
});

export type UserWithDetails = Prisma.UserGetPayload<typeof userWithDetails>;

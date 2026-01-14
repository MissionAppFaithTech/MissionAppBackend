import type { Prisma, User } from "@prisma/client";
import type { UserWithDetails } from "src/@types/user-with-details";

export interface FindByEmailOrUsernameQuery {
	email: string;
	username: string;
}

export interface UsersRepository {
	create: (data: Prisma.UserCreateInput) => Promise<UserWithDetails>;
	findById: (id: number) => Promise<UserWithDetails | null>;
	findByPublicId: (publicId: string) => Promise<UserWithDetails | null>;
	findByEmail: (email: string) => Promise<User | null>;
	findByUsername: (username: string) => Promise<User | null>;
	findByEmailOrUsername: (
		data: FindByEmailOrUsernameQuery,
	) => Promise<User | null>;
	incrementLoginAttempts: (id: number) => Promise<void>;
	setLastLogin: (id: number) => Promise<void>;
}

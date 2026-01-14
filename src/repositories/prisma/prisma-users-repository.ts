import { prisma } from "@lib/prisma";
import type { Prisma } from "@prisma/client";
import { userWithDetails } from "src/@types/user-with-details";
import type {
	FindByEmailOrUsernameQuery,
	UsersRepository,
} from "../users-repository";

export class PrismaUsersRepository implements UsersRepository {
	async findById(id: number) {
		const user = await prisma.user.findUnique({
			where: { id },
			include: userWithDetails.include,
		});
		return user;
	}

	async findByPublicId(publicId: string) {
		const user = await prisma.user.findUnique({
			where: { publicId },
			include: userWithDetails.include,
		});
		return user;
	}

	async findByEmailOrUsername({ email, username }: FindByEmailOrUsernameQuery) {
		const user = await prisma.user.findFirst({
			where: {
				OR: [{ email }, { username }],
			},
		});
		return user;
	}

	async findByEmail(email: string) {
		const user = await prisma.user.findUnique({
			where: { email },
		});
		return user;
	}

	async findByUsername(username: string) {
		const user = await prisma.user.findUnique({
			where: { username },
		});
		return user;
	}

	async incrementLoginAttempts(id: number) {
		await prisma.user.update({
			where: { id },
			data: {
				loginAttempts: {
					increment: 1,
				},
			},
		});
	}

	async create(data: Prisma.UserCreateInput) {
		const user = await prisma.user.create({
			data,
			include: userWithDetails.include,
		});
		return user;
	}

	async setLastLogin(id: number) {
		await prisma.user.update({
			where: { id },
			data: { lastLogin: new Date() },
		});
	}
}

import "@fastify/jwt";
import "fastify";
import type { UserRoleType } from "@prisma/client";

declare module "@fastify/jwt" {
	export interface FastifyJWT {
		user: {
			role: UserRoleType;
			sub: string;
		};
	}
}

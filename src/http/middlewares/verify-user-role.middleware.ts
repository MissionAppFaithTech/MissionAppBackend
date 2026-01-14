import { FORBIDDEN } from "@messages/response";
import type { UserRoleType } from "@prisma/client";
import type { FastifyReply, FastifyRequest } from "fastify";

export function verifyUserRole(allowedRoles: UserRoleType[]) {
	return async (request: FastifyRequest, reply: FastifyReply) => {
		const { role } = request.user;

		if (!allowedRoles.includes(role)) {
			return await reply.status(FORBIDDEN.status).send(FORBIDDEN.body);
		}
	};
}

import { verifyJwt } from "@middlewares/verify-jwt.middleware";
import type { FastifyInstance } from "fastify";
import { authenticate } from "./authenticate.controller";
import { refreshToken } from "./refresh-token.controller";

export async function userRoutes(app: FastifyInstance) {
	app.post("/sessions", authenticate);

	app.post(
		"/sessions/refresh-token",
		{
			preHandler: [verifyJwt],
		},
		refreshToken,
	);
}

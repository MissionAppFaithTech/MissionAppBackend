import { env } from "@env/index";
import { logger } from "@lib/logger";
import { INVALID_OR_EXPIRED_TOKEN } from "@messages/response";
import type { FastifyReply, FastifyRequest } from "fastify";

export async function refreshToken(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		await request.jwtVerify({ onlyCookie: true });
	} catch (error) {
		logger.debug(INVALID_OR_EXPIRED_TOKEN.body);
		return await reply
			.status(INVALID_OR_EXPIRED_TOKEN.status)
			.send(INVALID_OR_EXPIRED_TOKEN.body);
	}

	const tokenPayload = {
		role: request.user.role,
	};

	const accessToken = await reply.jwtSign(tokenPayload, {
		sign: {
			sub: request.user.sub,
			expiresIn: env.JWT_EXPIRATION,
		},
	});

	const refreshToken = await reply.jwtSign(tokenPayload, {
		sign: {
			sub: request.user.sub,
			expiresIn: env.JWT_REFRESH_EXPIRATION,
		},
	});

	return await reply
		.setCookie("refreshToken", refreshToken, {
			path: "/",
			secure: env.NODE_ENV === "production",
			sameSite: env.NODE_ENV === "production" ? "strict" : "lax",
			httpOnly: true,
		})
		.status(200)
		.send({
			data: {
				accessToken,
			},
		});
}

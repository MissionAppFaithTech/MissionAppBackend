import { env } from "@env/index";
import { UserPresenter } from "@presenters/user-presenter";
import { authenticateBodySchema } from "@schemas/user/authenticate-body-schema";
import { makeAuthenticateUseCase } from "@use-cases/factories/user/make-authenticate-use-case";
import type { FastifyReply, FastifyRequest } from "fastify";

export async function authenticate(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const { login, password } = authenticateBodySchema.parse(request.body);
	const { ip: ipAddress } = request;
	const { "user-agent": browser } = request.headers;
	const { remotePort } = request.socket;
	const browserName = Array.isArray(browser) ? browser[0] : browser;

	const authenticateUseCase = makeAuthenticateUseCase();

	const { user } = await authenticateUseCase.execute({
		login,
		password,
		ipAddress,
		browser: browserName,
		remotePort: `${remotePort}`,
	});

	const tokenPayload = {
		role: user.role,
	};

	const accessToken = await reply.jwtSign(tokenPayload, {
		sign: {
			sub: user.publicId,
			expiresIn: env.JWT_EXPIRATION,
		},
	});

	const refreshToken = await reply.jwtSign(tokenPayload, {
		sign: {
			sub: user.publicId,
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
				user: UserPresenter.toHTTP(user),
			},
		});
}

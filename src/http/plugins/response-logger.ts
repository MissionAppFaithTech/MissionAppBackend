import { logger } from "@lib/logger";
import type {
	FastifyReply,
	FastifyRequest,
	HookHandlerDoneFunction,
} from "fastify";

export function logResponse(
	request: FastifyRequest,
	reply: FastifyReply,
	done: HookHandlerDoneFunction,
) {
	logger.info({
		statusCode: reply.statusCode,
		method: request.method,
		url: request.url,
		requestTime: reply.elapsedTime,
	});
}

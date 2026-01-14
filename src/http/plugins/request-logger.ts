import { logger } from "@lib/logger";
import { runWithRequestId } from "@lib/logger/helpers/run-with-request-id";
import { INCOMING_REQUEST } from "@messages/logger";
import { getClientIp } from "@utils/get-client-ip";
import type {
	FastifyReply,
	FastifyRequest,
	HookHandlerDoneFunction,
} from "fastify";
import { v7 as uuidv7 } from "uuid";

function logRequestDetails(request: FastifyRequest) {
	const clientIp = getClientIp(request);

	logger.info(
		{
			method: request.method,
			url: request.url,
			ip: clientIp,
			remotePort: request.socket.remotePort,
			userAgent: request.headers["user-agent"],
		},
		INCOMING_REQUEST,
	);
}

export function logRequest(
	request: FastifyRequest,
	_reply: FastifyReply,
	done: HookHandlerDoneFunction,
) {
	const requestId: string = uuidv7();

	runWithRequestId(requestId, async () => {
		logRequestDetails(request);
		done();
	});
}

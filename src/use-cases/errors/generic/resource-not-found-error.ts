import { RESOURCE_NOT_FOUND } from "@messages/response";
import { ApiError } from "../api-error";

export class ResourceNotFoundError extends ApiError {
	constructor(message?: string) {
		super({
			status: RESOURCE_NOT_FOUND.status,
			body: {
				...RESOURCE_NOT_FOUND.body,
				message: message ?? RESOURCE_NOT_FOUND.body.message,
			},
		});
	}
}

import { INVALID_OR_EXPIRED_TOKEN } from "@messages/response";
import { ApiError } from "../api-error";

export class InvalidTokenError extends ApiError {
	constructor() {
		super(INVALID_OR_EXPIRED_TOKEN);
	}
}

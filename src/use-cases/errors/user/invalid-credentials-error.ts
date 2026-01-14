import { INVALID_CREDENTIALS } from "@messages/response";
import { ApiError } from "../api-error";

export class InvalidCredentialsError extends ApiError {
	constructor() {
		super(INVALID_CREDENTIALS);
	}
}

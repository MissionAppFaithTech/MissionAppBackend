import { PASSWORD_RESET_IF_USER_EXISTS } from "@messages/response";
import { ApiError } from "../api-error";

export class UserNotFoundForPasswordResetError extends ApiError {
	constructor() {
		super(PASSWORD_RESET_IF_USER_EXISTS);
	}
}

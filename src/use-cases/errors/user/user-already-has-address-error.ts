import { USER_ALREADY_HAS_ADDRESS } from "@messages/response";
import { ApiError } from "../api-error";

export class UserAlreadyHasAddressError extends ApiError {
	constructor() {
		super(USER_ALREADY_HAS_ADDRESS);
	}
}

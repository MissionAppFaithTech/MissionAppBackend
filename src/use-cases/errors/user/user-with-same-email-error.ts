import { USER_WITH_SAME_EMAIL_OR_USERNAME } from "@messages/response";
import { UserAlreadyExistsError } from "./user-already-exists-error";

export class UserWithSameEmailOrUsernameError extends UserAlreadyExistsError {
	constructor() {
		super(USER_WITH_SAME_EMAIL_OR_USERNAME.body.message);
	}
}

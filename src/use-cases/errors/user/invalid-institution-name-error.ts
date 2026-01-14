import { INVALID_INSTITUTION_NAME } from "@messages/response";
import { ApiError } from "../api-error";

export class InvalidInstitutionName extends ApiError {
	constructor() {
		super(INVALID_INSTITUTION_NAME);
	}
}

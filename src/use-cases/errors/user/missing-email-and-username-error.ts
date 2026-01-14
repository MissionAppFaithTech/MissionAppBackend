import { MISSING_CHECK_AVAILABILITIES_INPUT } from "@messages/response";
import { ApiError } from "../api-error";

export class MissingCheckAvailabilitiesInput extends ApiError {
	constructor() {
		super(MISSING_CHECK_AVAILABILITIES_INPUT);
	}
}

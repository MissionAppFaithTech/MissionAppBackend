import { INVALID_AREA_OF_ACTIVITY } from "@messages/response";
import { ApiError } from "../api-error";

export class InvalidActivityArea extends ApiError {
	constructor(area?: string) {
		super({
			status: INVALID_AREA_OF_ACTIVITY.status,
			body: area
				? {
						...INVALID_AREA_OF_ACTIVITY.body,
						message: INVALID_AREA_OF_ACTIVITY.body.message + `: ${area}`,
					}
				: INVALID_AREA_OF_ACTIVITY.body,
		});
	}
}

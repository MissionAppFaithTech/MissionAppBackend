import { IMAGE_TOO_BIG } from "@messages/response";
import { ApiError } from "../api-error";

export class ImageTooBigError extends ApiError {
	constructor() {
		super(IMAGE_TOO_BIG);
	}
}

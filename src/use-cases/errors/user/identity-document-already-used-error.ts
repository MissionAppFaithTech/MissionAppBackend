import { IDENTITY_DOCUMENT_ALREADY_USED } from "@messages/response";
import { ApiError } from "../api-error";

export class IdentityDocumentAlreadyUsed extends ApiError {
	constructor() {
		super(IDENTITY_DOCUMENT_ALREADY_USED);
	}
}

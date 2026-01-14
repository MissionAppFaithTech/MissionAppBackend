import { ASYNC_LOCAL_STORAGE_NOT_INITIALIZED_ERROR } from "@messages/response";
import { ApiError } from "../api-error";

export class AsyncLocalStorageNotInitializedError extends ApiError {
	constructor() {
		super(ASYNC_LOCAL_STORAGE_NOT_INITIALIZED_ERROR);
	}
}

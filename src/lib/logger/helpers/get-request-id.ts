import { asyncLocalStorage } from "@lib/async-local-storage";

export function getRequestId() {
	return asyncLocalStorage.getStore()?.requestId;
}

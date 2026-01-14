import { asyncLocalStorage } from "@lib/async-local-storage";

export function getUserId() {
	return asyncLocalStorage.getStore()?.userId;
}

import { asyncLocalStorage } from "@lib/async-local-storage";
import { AsyncLocalStorageNotInitializedError } from "@use-cases/errors/generic/async-local-storage-not-initialized-error";

export function setUserId(userId: string) {
	const store = asyncLocalStorage.getStore();
	if (!store) {
		throw new AsyncLocalStorageNotInitializedError();
	}
	store.userId = userId;
}

import { asyncLocalStorage } from "@lib/async-local-storage";

export function runWithRequestId<T>(requestId: string, fn: () => T) {
	return asyncLocalStorage.run({ requestId }, fn);
}

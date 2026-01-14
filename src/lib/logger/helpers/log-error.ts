import { logger } from "..";

export function logError(
	error: unknown,
	context: Record<string, unknown> = {},
	message: string = "Unexpected error",
) {
	logger.error(
		{
			...(error instanceof Error
				? {
						message: error.message,
						stack: error.stack,
					}
				: {
						message: "Unknown error",
					}),
			...context,
		},
		message,
	);
}

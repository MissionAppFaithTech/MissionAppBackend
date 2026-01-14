import { limitedNonemptyTextSchema } from "@schemas/utils/utils/primitives/limited-nonempty-text-schema";
import { INVALID_AUTHENTICATION_INPUT } from "src/messages/validation";
import { z } from "zod";

export const authenticateBodySchema = z.object(
	{
		login: limitedNonemptyTextSchema,
		password: limitedNonemptyTextSchema,
	},
	{
		error: INVALID_AUTHENTICATION_INPUT,
	},
);

export type AuthenticateSchemaType = z.infer<typeof authenticateBodySchema>;

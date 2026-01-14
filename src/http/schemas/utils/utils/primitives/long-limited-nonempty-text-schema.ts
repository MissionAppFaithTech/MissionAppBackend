import { LONG_LIMITED_CHARACTERS_SIZE } from "@constants/validation-constants";
import { nonemptyTextSchema } from "./nonempty-text-schema";

export const longLimitedNonemptyTextSchema = nonemptyTextSchema.max(
	LONG_LIMITED_CHARACTERS_SIZE,
);

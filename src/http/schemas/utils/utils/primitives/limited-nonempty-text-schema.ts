import { LIMITED_CHARACTERS_SIZE } from "@constants/validation-constants";
import { nonemptyTextSchema } from "./nonempty-text-schema";

export const limitedNonemptyTextSchema = nonemptyTextSchema.max(
	LIMITED_CHARACTERS_SIZE,
);

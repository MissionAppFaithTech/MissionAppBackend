import { INNER_SPACES_REGEX } from "@constants/regex-constants";
import { INVALID_INNER_SPACES } from "src/messages/validation";
import { limitedNonemptyTextSchema } from "./limited-nonempty-text-schema";

export const textWithoutInnerSpacesSchema = limitedNonemptyTextSchema.regex(
	INNER_SPACES_REGEX,
	INVALID_INNER_SPACES,
);

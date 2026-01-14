import { INNER_SPACES_REGEX } from "@constants/regex-constants";
import { INVALID_INNER_SPACES } from "src/messages/validation";
import { upperCaseTextSchema } from "./uppercase-text-schema";

export const uppercaseTextWithoutInnerSpacesSchema = upperCaseTextSchema.regex(
	INNER_SPACES_REGEX,
	INVALID_INNER_SPACES,
);

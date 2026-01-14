import { textWithoutInnerSpacesSchema } from "../primitives/text-without-inner-spaces-schema";

export const usernameSchema = textWithoutInnerSpacesSchema.min(3);

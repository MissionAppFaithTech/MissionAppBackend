import z from "zod";

export const booleanSchema = z.preprocess(
	(data) => (typeof data === "string" ? data.toLowerCase() : data),
	z.union([
		z.enum(["true", "false"]).transform((data) => data === "true"),
		z.coerce.boolean(),
	]),
);

import z from "zod";

export const positiveIntegerSchema = z.coerce.number().int().positive();

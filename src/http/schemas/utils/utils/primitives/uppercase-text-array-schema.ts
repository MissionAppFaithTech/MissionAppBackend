import z from "zod";
import { upperCaseTextSchema } from "./uppercase-text-schema";

export const uppercaseTextArraySchema = z.array(upperCaseTextSchema);

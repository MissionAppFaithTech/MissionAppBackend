import { limitedNonemptyTextSchema } from "./limited-nonempty-text-schema";

export const upperCaseTextSchema = limitedNonemptyTextSchema.toUpperCase();

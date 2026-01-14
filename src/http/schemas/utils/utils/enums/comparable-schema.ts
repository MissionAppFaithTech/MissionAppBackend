import { COMPARISON_OPERATORS } from "@custom-types/orderable";
import z from "zod";

export const comparableSchema = z.enum(COMPARISON_OPERATORS);

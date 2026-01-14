import { LONG_LIMITED_CHARACTERS_SIZE } from "@constants/validation-constants";
import z from "zod";

export const urlSchema = z.url().max(LONG_LIMITED_CHARACTERS_SIZE);

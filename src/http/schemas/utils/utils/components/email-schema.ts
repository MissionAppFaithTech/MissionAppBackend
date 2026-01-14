import { LIMITED_CHARACTERS_SIZE } from "@constants/validation-constants";
import z from "zod";

export const emailSchema = z.email().max(LIMITED_CHARACTERS_SIZE).toLowerCase();

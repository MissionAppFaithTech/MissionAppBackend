import { RANDOM_BYTES_NUMBER } from "@constants/validation-constants";
import z from "zod";

export const resetPasswordTokenSchema = z.hex().length(RANDOM_BYTES_NUMBER * 2);

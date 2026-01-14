import { UserRoleType } from "@prisma/client";
import z from "zod";

export const userRoleSchema = z.enum(UserRoleType);

import { env } from "@env/index";
import { adapter } from "./helpers/adapter";
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({
	adapter,
	log: env.LOG_LEVEL === "debug" ? ["query", "info", "warn"] : [],
});

import { env } from "@env/index";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const pool = new Pool({
	connectionString: env.DATABASE_URL,
});

export const adapter = new PrismaPg(pool);
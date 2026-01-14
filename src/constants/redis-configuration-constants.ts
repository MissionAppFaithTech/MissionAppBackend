import { env } from "@env/index";
import type { RedisOptions } from "ioredis";
import ms from "ms";

export const redisConnection = {
	host: env.REDIS_HOST,
	port: env.REDIS_PORT,
	db: env.REDIS_DB,
	password: env.REDIS_PASSWORD,
} satisfies RedisOptions;

export const BLOG_IP_VIEW_TTL = ms("10m");

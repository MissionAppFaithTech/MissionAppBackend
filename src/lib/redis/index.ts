import { redisConnection } from "@constants/redis-configuration-constants";
import Redis from "ioredis";

export const redis = new Redis(redisConnection);

import { env } from "@env/index";

export const IS_DEV = env.NODE_ENV === "development";
export const IS_DEBUG = env.LOG_LEVEL === "debug";

import { z } from "zod";
import { TOKEN_DURATION_REGEX } from "../constants/regex-constants";

const envSchema = z.object({
	// Environment
	NODE_ENV: z
		.enum(["development", "staging", "production", "test"])
		.default("development"),
	LOG_LEVEL: z
		.enum(["info", "debug", "warn", "error", "trace"])
		.default("info"),

	// App:
	APP_NAME: z.string().trim().nonempty().default("MissionAPP"),
	APP_PORT: z.coerce.number().default(3333),
	JWT_SECRET: z
		.string()
		.trim()
		.min(60, "JWT secret must be at least 60 characters long"),
	HASH_SALT_ROUNDS: z.coerce.number().min(6).max(16).default(12),
	JWT_EXPIRATION: z
		.string()
		.trim()
		.nonempty()
		.regex(TOKEN_DURATION_REGEX)
		.default("2h"),
	JWT_REFRESH_EXPIRATION: z
		.string()
		.trim()
		.nonempty()
		.regex(TOKEN_DURATION_REGEX)
		.default("7d"),

	// REDIS:
	REDIS_HOST: z.string().trim().nonempty(),
	REDIS_PORT: z.coerce.number().int().positive().default(6379),
	REDIS_PASSWORD: z.string().trim().nonempty(),
	REDIS_DB: z.coerce.number().int().nonnegative().default(0),

	// URLs de Conexão:
	FRONTEND_URL: z.string().trim().nonempty().default("http://localhost:5173"),

	// Database:
	DATABASE_URL: z.string().trim().nonempty(),

	// SMTP:
	SMTP_EMAIL: z.email(),
	SMTP_PASSWORD: z.string().trim().nonempty(),
	SMTP_PORT: z.coerce.number(),
	SMTP_HOST: z.string().trim().nonempty(),
	SMTP_SECURE: z.enum(["true", "false"]).transform((data) => data === "true"),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
	// eslint-disable-next-line no-console
	console.error(
		"🚨 Invalid environment variables:",
		z.treeifyError(_env.error),
	);

	throw new Error(
		"Invalid environment variables! Please check your .env file or environment configuration.",
	);
}

export const env = _env.data;

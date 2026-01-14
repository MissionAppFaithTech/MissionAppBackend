import { env } from "@env/index";
import ms from "ms";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

export const transporterOptions: SMTPTransport.Options = {
	host: env.SMTP_HOST,
	port: env.SMTP_PORT,
	secure: env.SMTP_SECURE,
	auth: {
		user: env.SMTP_EMAIL,
		pass: env.SMTP_PASSWORD,
	},
	connectionTimeout: ms("10s"),
	greetingTimeout: ms("5s"),
	socketTimeout: ms("20s"),
};

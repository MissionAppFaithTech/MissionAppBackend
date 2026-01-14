import { transporterOptions } from "@constants/email-configuration";
import type { SendEmailRequest } from "@custom-types/send-email-request-type";
import { env } from "@env/index";
import type { SentMessageInfo } from "nodemailer";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport(transporterOptions);

export async function sendEmail({
	to,
	subject,
	message,
	html,
	attachments,
}: SendEmailRequest): Promise<SentMessageInfo> {
	const info = await transporter.sendMail({
		from: env.SMTP_EMAIL,
		to,
		subject,
		text: message,
		html,
		...(attachments !== undefined ? { attachments } : {}),
	});

	return info;
}

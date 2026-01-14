import { prisma } from "@lib/prisma";
import type { Prisma } from "@prisma/client";
import type { AuthenticationAuditsRepository } from "../authentication-audit-repository";

export class PrismaAuthenticationAuditsRepository
	implements AuthenticationAuditsRepository
{
	async create(data: Prisma.AuthenticationAuditUncheckedCreateInput) {
		const authenticationAudit = await prisma.authenticationAudit.create({
			data,
		});
		return authenticationAudit;
	}

	async findAll() {
		const authenticationAuditList = await prisma.authenticationAudit.findMany();
		return authenticationAuditList;
	}

	async getLast() {
		const authenticationAudit = await prisma.authenticationAudit.findMany({
			orderBy: {
				createdAt: "desc",
			},
			take: 1,
		});

		if (authenticationAudit.length === 0) return null;

		return authenticationAudit[0];
	}
}

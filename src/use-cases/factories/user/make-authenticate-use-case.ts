import { PrismaAuthenticationAuditsRepository } from "@repositories/prisma/prisma-authentication-audits-repository";
import { PrismaUsersRepository } from "@repositories/prisma/prisma-users-repository";
import { AuthenticateUseCase } from "@use-cases/user/authenticate";

export function makeAuthenticateUseCase() {
	const usersRepository = new PrismaUsersRepository();
	const AuthenticationAuditsRepository =
		new PrismaAuthenticationAuditsRepository();

	const authenticateUseCase = new AuthenticateUseCase(
		usersRepository,
		AuthenticationAuditsRepository,
	);

	return authenticateUseCase;
}

import type { User } from "@prisma/client";
import type { AuthenticationAuditsRepository } from "@repositories/authentication-audit-repository";
import type { UsersRepository } from "@repositories/users-repository";
import { emailSchema } from "@schemas/utils/utils/components/email-schema";
import { compare } from "bcryptjs";
import { InvalidCredentialsError } from "../errors/user/invalid-credentials-error";

interface AuthenticateUseCaseRequest {
	login: string;
	password: string;
	ipAddress?: string;
	remotePort?: string;
	browser?: string;
}

interface AuthenticateUseCaseResponse {
	user: User;
}

const DUMMY_HASH =
	"CR7&YqVb9zXfK2n4uP3tLsWhJcEg1ABvZdTQMiN0oGpUeCyxLr5HaDmZjSXFkwEt";

export class AuthenticateUseCase {
	constructor(
		private readonly usersRepository: UsersRepository,
		private readonly AuthenticationAuditsRepository: AuthenticationAuditsRepository,
	) {}

	async execute({
		login,
		password,
		ipAddress,
		remotePort,
		browser,
	}: AuthenticateUseCaseRequest): Promise<AuthenticateUseCaseResponse> {
		let user: User | null;

		if (emailSchema.safeParse(login).success) {
			user = await this.usersRepository.findByEmail(login);
		} else {
			user = await this.usersRepository.findByUsername(login);
		}

		const hashToCompare = user?.passwordHash ?? DUMMY_HASH;

		const doesPasswordMatch = await compare(password, hashToCompare);

		const auditAuthenticateObject = {
			browser: browser ?? null,
			ipAddress: ipAddress ?? null,
			remotePort: remotePort ?? null,
			userId: user?.id ?? null,
		};

		if (!doesPasswordMatch) {
			await this.AuthenticationAuditsRepository.create({
				...auditAuthenticateObject,
				status: "INCORRECT_PASSWORD",
			});

			throw new InvalidCredentialsError();
		}

		if (!user) {
			await this.AuthenticationAuditsRepository.create({
				...auditAuthenticateObject,
				status: "USER_NOT_EXISTS",
			});

			throw new InvalidCredentialsError();
		}

		await this.usersRepository.incrementLoginAttempts(user.id);

		await this.usersRepository.setLastLogin(user.id);

		await this.AuthenticationAuditsRepository.create({
			...auditAuthenticateObject,
			status: "SUCCESS",
			userId: user.id,
		});

		return { user };
	}
}

import { PrismaClient } from "@prisma/client";
import { faithCommunityData_1 } from "./seed-data/faith-communities";
import { missionaryData_1 } from "./seed-data/missionaries";
import { missionaryAgencyData_1 } from "./seed-data/missionary-agencies";
import { pastorData_1 } from "./seed-data/pastors";
import { userData_1 } from "./seed-data/users";
import { adapter } from "@lib/prisma/helpers/adapter";

const prisma = new PrismaClient({ adapter });

async function main() {
	// Criação da FaithCommunity:
	let faithCommunity = await prisma.faithCommunity.findFirst({
		where: faithCommunityData_1,
	});

	if (!faithCommunity) {
		faithCommunity = await prisma.faithCommunity.create({
			data: faithCommunityData_1,
		});
	}

	// Criação do Pastor:
	let pastor = await prisma.pastor.findFirst({
		where: pastorData_1,
	});

	if (!pastor) {
		pastor = await prisma.pastor.create({
			data: {
				...pastorData_1,
				faithCommunityId: faithCommunity.id,
			},
		});
	}

	// Criação do User:
	const user = await prisma.user.upsert({
		where: { email: userData_1.email },
		update: {},
		create: {
			...userData_1,
			faithCommunityId: faithCommunity.id,
		},
	});

	// Criação da MissionaryAgency:
	let missionaryAgency = await prisma.missionaryAgency.findFirst({
		where: missionaryAgencyData_1,
	});

	if (!missionaryAgency) {
		missionaryAgency = await prisma.missionaryAgency.create({
			data: missionaryAgencyData_1,
		});
	}

	// Adicionando informações de Missionary ao User:
	await prisma.missionary.upsert({
		where: { userId: user.id },
		update: { userId: user.id },
		create: {
			...missionaryData_1,
			userId: user.id,
			missionaryAgencyId: missionaryAgency.id,
		},
	});

	// Atualizando FaithCommunity para referenciar o User criador:
	await prisma.faithCommunity.update({
		where: { id: faithCommunity.id },
		data: {
			userId: user.id,
		},
	});
}

main()
	.then(async () => {
		await prisma.$disconnect();
	})
	.catch(async (error) => {
		// eslint-disable-next-line no-console
		console.error("Erro ao executar seed:", error);
		await prisma.$disconnect();
		process.exit(1);
	});

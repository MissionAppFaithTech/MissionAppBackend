import { PrismaClient } from "@prisma/client"
import { hash } from "bcryptjs"
import { env } from "src/env"

const prisma = new PrismaClient()

async function main() {
    // Criação da FaithCommunity:
    const faithCommunityData = {
        name: "Assembléia de Deus",
        phoneNumber: "+55 21 1234-5678",
    }

    let faithCommunity = await prisma.faithCommunity.findFirst({
        where: faithCommunityData
    })
    
    if (faithCommunity === null) {
        faithCommunity = await prisma.faithCommunity.create({
            data: faithCommunityData
        })
    }

    // Criação do Pastor:
    const pastorData = {
        name: "Pastor da Silva",
        phoneNumber: "+55 21 12345-6789",
    }

    let pastor = await prisma.pastor.findFirst({
        where: pastorData
    })
    
    if (pastor === null) {
        pastor = await prisma.pastor.create({
            data: {
                ...pastorData,
                faithCommunityId: faithCommunity.id
            }
        })
    }

    // Criação do User:
    const user = await prisma.user.upsert({
        where: { email: "admin@email.com" },
        update: {},
        create: {
            name: "admin",
            username: "admin.admin",
            email: "admin@email.com",
            passwordHash: await hash("123456789Az#", env.HASH_SALT_ROUNDS),
            phoneNumber: "+55 21 98765-4321",
            profilePicture: "https://wallpapersok.com/images/thumbnail/black-cross-glowing-eh5bxh6nyaffv4in.webp",
            role: 'ADMIN',
            faithCommunityId: faithCommunity.id
        }
    })

    // Criação da MissionaryAgency:
    const missionaryAgencyData = {
        name: "Agência de Missionários"
    }

    let missionaryAgency = await prisma.missionaryAgency.findFirst({
        where: missionaryAgencyData
    })

    if (missionaryAgency === null) {
        missionaryAgency = await prisma.missionaryAgency.create({
            data: missionaryAgencyData
        })
    }

    // Adicionando informações de Missionary ao User:
    const missionaryData = {
        publicEmail: "missionApp-missionary@email.com",
        publicPhoneNumber: "+55 21 98765-4321"
    }

    await prisma.missionary.upsert({
        where: { userId: user.id },
        update: { userId: user.id },
        create: {
            ...missionaryData,
            userId: user.id,
            missionaryAgencyId: missionaryAgency.id,
        }
    })

    // Atualizando FaithCommunity para referenciar o User criador:
    await prisma.faithCommunity.update({
        where: { id: faithCommunity.id },
        data: {
            userId: user.id
        }
    })
}

main().then(async () => { await prisma.$disconnect() }).catch(async error => {
    console.error("Error while running seed:", error)
    await prisma.$disconnect()
    process.exit(1)
})

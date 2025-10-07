import { env } from '@env/index'
import { UserRoleType } from '@prisma/client'
import { hashSync } from 'bcryptjs'

export const userData_1 = {
  name: 'admin',
  username: 'admin.admin',
  email: 'admin@email.com',
  passwordHash: hashSync('123456789Az#', env.HASH_SALT_ROUNDS),
  phoneNumber: '+55 21 98765-4321',
  profilePicture: 'https://wallpapersok.com/images/thumbnail/black-cross-glowing-eh5bxh6nyaffv4in.webp',
  role: UserRoleType.ADMIN,
}

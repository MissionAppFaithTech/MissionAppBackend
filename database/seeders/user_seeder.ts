import { Gender } from '#enums/user/gender'
import { MembershipStatus } from '#enums/user/membership_status'
import { UserRole } from '#enums/user/user_role'
import User from '#models/user'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { DateTime } from 'luxon'

/**
 * Senha compartilhada por todos os usuários deste seed — só pra login manual
 * em ambiente local, nunca usada fora de development/testing (ver
 * `static environment` abaixo).
 */
const SEED_PASSWORD = 'password123'

/**
 * Usuários de desenvolvimento — cobre os 3 roles (admin, missionário,
 * apoiador) com credenciais previsíveis pra login manual em dev/testing.
 *
 * `static environment` restringe a execução a development/testing — mesmo
 * que `node ace db:seed` seja chamado contra produção por engano, este
 * seeder não roda (guard nativo do Lucid, não uma checagem manual aqui).
 *
 * `updateOrCreateMany` (predicate: `email`) em vez de `createMany` —
 * idempotente: rodar o seeder de novo atualiza os registros existentes em
 * vez de duplicar ou falhar por violação de unique constraint. Passa pelo
 * ciclo de vida normal do model (`.save()` internamente), então o hook
 * `hashPassword` do `AuthFinder` hashea `passwordHash` normalmente — não
 * precisa fazer isso manualmente aqui.
 */
export default class UserSeeder extends BaseSeeder {
  static environment = ['development', 'testing']

  async run() {
    await User.updateOrCreateMany('email', [
      {
        fullName: 'Admin Seed',
        username: 'admin_seed',
        phoneNumber: '+5511900000001',
        gender: Gender.MALE,
        email: 'admin@missionapp.test',
        passwordHash: SEED_PASSWORD,
        role: UserRole.ADMIN,
        membershipStatus: MembershipStatus.ACTIVE,
        activedAt: DateTime.now(),
      },
      {
        fullName: 'Missionário Seed Um',
        username: 'missionary_seed_1',
        phoneNumber: '+5511900000002',
        gender: Gender.MALE,
        email: 'missionary1@missionapp.test',
        passwordHash: SEED_PASSWORD,
        role: UserRole.MISSIONARY,
        membershipStatus: MembershipStatus.ACTIVE,
        activedAt: DateTime.now(),
      },
      {
        fullName: 'Missionária Seed Dois',
        username: 'missionary_seed_2',
        phoneNumber: '+5511900000003',
        gender: Gender.FEMALE,
        email: 'missionary2@missionapp.test',
        passwordHash: SEED_PASSWORD,
        role: UserRole.MISSIONARY,
        membershipStatus: MembershipStatus.ACTIVE,
        activedAt: DateTime.now(),
      },
      {
        fullName: 'Apoiador Seed Um',
        username: 'supporter_seed_1',
        phoneNumber: '+5511900000004',
        gender: Gender.MALE,
        email: 'supporter1@missionapp.test',
        passwordHash: SEED_PASSWORD,
        role: UserRole.SUPPORTER,
        membershipStatus: MembershipStatus.ACTIVE,
        activedAt: DateTime.now(),
      },
      {
        fullName: 'Apoiadora Seed Dois',
        username: 'supporter_seed_2',
        phoneNumber: '+5511900000005',
        gender: Gender.FEMALE,
        email: 'supporter2@missionapp.test',
        passwordHash: SEED_PASSWORD,
        role: UserRole.SUPPORTER,
        membershipStatus: MembershipStatus.ACTIVE,
        activedAt: DateTime.now(),
      },
    ])
  }
}

import MissionaryAgency from '#models/missionary_agency'
import { createTestUser } from '#tests/functional/auth/helpers'
import { MissionaryStatus } from '#enums/missionary/missionary_status'
import Missionary from '#models/missionary'
import { UserRole } from '#enums/user/user_role'

export async function createMissionaryTestUser() {
  const { user, password } = await createTestUser()
  user.role = UserRole.MISSIONARY
  await user.save()

  const { user: registeredBy } = await createTestUser()
  const agency = await MissionaryAgency.create({
    name: 'Agência Teste',
    phoneNumber: '+5511999999999',
    userId: registeredBy.id,
  })

  const missionary = await Missionary.create({
    userId: user.id,
    status: MissionaryStatus.APPROVED,
    missionaryAgencyId: agency.id,
  })

  return { user, password, missionary, agency }
}

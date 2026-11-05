import { v7 as uuidv7 } from 'uuid'
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
  // NOTE: nome único por chamada — o catálogo não aceita dois nomes iguais na
  // mesma cidade (uq_missionary_agencies_name_normalized_city_normalized)
  const agency = await MissionaryAgency.create({
    name: `Agência Teste ${uuidv7()}`,
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

/**
 * Gera um IP público fictício (faixa de documentação 2001:db8::/32) para
 * enviar em `X-Forwarded-For`. Isola o contador do rate limit por IP entre
 * testes e entre execuções seguidas da suíte — sem isso todas as requisições
 * saem de 127.0.0.1 e dividem o mesmo orçamento na janela de 60s.
 */
export function uniqueClientIp(): string {
  const hex = uuidv7().replaceAll('-', '').slice(-16)
  return `2001:db8::${hex.match(/.{4}/g)!.join(':')}`
}

/**
 * CPF fictício (11 dígitos, sem dígito verificador) diferente a cada chamada:
 * `uq_missionaries_identity` não aceita o mesmo documento em dois perfis.
 */
export function uniqueCpf(): string {
  return Array.from({ length: 11 }, () => Math.floor(Math.random() * 10)).join('')
}

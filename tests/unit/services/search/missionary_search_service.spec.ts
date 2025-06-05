import { MissionarySearchService } from '#services/search/missionary_search_service'
import { v7 as uuidv7 } from 'uuid'
import { test } from '@japa/runner'

test.group('MissionarySearchService', () => {
  test('index() + searchByName() round-trip contra o Elasticsearch real', async ({ assert }) => {
    const service = new MissionarySearchService()
    const userId = uuidv7()
    const fullName = `Missionário Teste ${userId}`

    await service.index(userId, { fullName, email: `${userId}@example.com` })

    const results = await service.searchByName(fullName)

    assert.isTrue(results.some((doc) => doc.fullName === fullName))
  })

  test('searchByName() não retorna documento de outro nome', async ({ assert }) => {
    const service = new MissionarySearchService()
    const userId = uuidv7()
    // NOTE: nome sem fragmento de UUID de propósito — hex aleatório é curto
    // o bastante pra colidir por fuzzy match (`AUTO`) com outros fragmentos
    // hex acumulados no índice de rodadas de teste anteriores (índice não é
    // limpo entre execuções). Palavras reais e distintas evitam o falso positivo.
    const fullName = 'Zzyzx Corcunda Estripulia'

    await service.index(userId, { fullName, email: `${userId}@example.com` })

    const results = await service.searchByName('Frajola Bacamarte Xeretismo')

    assert.isFalse(results.some((doc) => doc.fullName === fullName))
  })
})

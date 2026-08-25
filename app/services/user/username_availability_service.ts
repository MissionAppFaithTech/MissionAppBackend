import User from '#models/user'

const USERNAME_MAX_LENGTH = 32
const SUGGESTION_COUNT = 3
const SUGGESTION_CANDIDATES = 5

type UsernameAvailability = {
  available: boolean
  username: string
  suggestions: string[]
}

/**
 * Verifica se um nome de usuário está livre para cadastro. Quando já está em
 * uso, sugere variações com sufixo numérico que ainda estão livres.
 */
export class UsernameAvailabilityService {
  async execute(username: string): Promise<UsernameAvailability> {
    const taken = await User.query().where('username', username).first()

    if (!taken) {
      return { available: true, username, suggestions: [] }
    }

    return { available: false, username, suggestions: await this.buildSuggestions(username) }
  }

  private async buildSuggestions(base: string): Promise<string[]> {
    const candidates = this.candidateUsernames(base)
    const rows = await User.query().whereIn('username', candidates).select('username')
    const taken = new Set(rows.map((row) => row.username))

    return candidates.filter((candidate) => !taken.has(candidate)).slice(0, SUGGESTION_COUNT)
  }

  private candidateUsernames(base: string): string[] {
    // NOTE: reserva espaço pro sufixo numérico sem estourar o maxLength do validator
    const trimmed = base.slice(0, USERNAME_MAX_LENGTH - String(SUGGESTION_CANDIDATES).length)

    return Array.from({ length: SUGGESTION_CANDIDATES }, (_, index) => `${trimmed}${index + 1}`)
  }
}

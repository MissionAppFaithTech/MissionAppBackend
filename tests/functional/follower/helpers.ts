import router from '@adonisjs/core/services/router'
import type { ApiClient } from '@japa/api-client'

type TokensBody = { data: { accessToken: string } }

/**
 * Autentica um usuário de teste e retorna o access token — evita repetir o
 * fluxo de login em cada teste de follower/supporter.
 */
export async function loginTestUser(
  client: ApiClient,
  email: string,
  password: string
): Promise<string> {
  const login = await client
    .post(router.builder().make('v1.auth.access_tokens.store')!)
    .json({ login: email, password })

  return (login.body() as TokensBody).data.accessToken
}

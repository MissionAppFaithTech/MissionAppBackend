/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  v1: {
    account: {
      store: typeof routes['v1.account.store']
    }
    auth: {
      accessTokens: {
        store: typeof routes['v1.auth.access_tokens.store']
        destroy: typeof routes['v1.auth.access_tokens.destroy']
      }
      refreshTokens: {
        store: typeof routes['v1.auth.refresh_tokens.store']
      }
    }
    profile: {
      show: typeof routes['v1.profile.show']
    }
    accountPassword: {
      update: typeof routes['v1.account_password.update']
    }
  }
}

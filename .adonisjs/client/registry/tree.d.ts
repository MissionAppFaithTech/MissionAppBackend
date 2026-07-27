/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  v1: {
    account: {
      store: typeof routes['v1.account.store']
    }
    mediaAssets: {
      store: typeof routes['v1.media_assets.store']
    }
    auth: {
      accessTokens: {
        store: typeof routes['v1.auth.access_tokens.store']
        destroy: typeof routes['v1.auth.access_tokens.destroy']
      }
      refreshTokens: {
        store: typeof routes['v1.auth.refresh_tokens.store']
      }
      forgotPassword: {
        store: typeof routes['v1.auth.forgot_password.store']
      }
      resetPassword: {
        update: typeof routes['v1.auth.reset_password.update']
      }
      sessions: {
        index: typeof routes['v1.auth.sessions.index']
        destroy: typeof routes['v1.auth.sessions.destroy']
      }
      allSessions: {
        destroy: typeof routes['v1.auth.all_sessions.destroy']
      }
    }
    profile: {
      show: typeof routes['v1.profile.show']
      update: typeof routes['v1.profile.update']
    }
    accountPassword: {
      update: typeof routes['v1.account_password.update']
    }
    missionary: {
      about: {
        update: typeof routes['v1.missionary.about.update']
      }
      profile: {
        store: typeof routes['v1.missionary.profile.store']
        update: typeof routes['v1.missionary.profile.update']
      }
      identity: {
        update: typeof routes['v1.missionary.identity.update']
      }
      workAddress: {
        update: typeof routes['v1.missionary.work_address.update']
      }
      admin: {
        about: {
          update: typeof routes['v1.missionary.admin.about.update']
        }
        profile: {
          update: typeof routes['v1.missionary.admin.profile.update']
        }
        identity: {
          update: typeof routes['v1.missionary.admin.identity.update']
        }
        workAddress: {
          update: typeof routes['v1.missionary.admin.work_address.update']
        }
      }
    }
  }
}

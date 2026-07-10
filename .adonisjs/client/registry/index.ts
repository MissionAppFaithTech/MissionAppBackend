/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

const placeholder: any = {}

const routes = {
  'v1.account.store': {
    methods: ["POST"],
    pattern: '/api/v1/accounts',
    tokens: [{"old":"/api/v1/accounts","type":0,"val":"api","end":""},{"old":"/api/v1/accounts","type":0,"val":"v1","end":""},{"old":"/api/v1/accounts","type":0,"val":"accounts","end":""}],
    types: placeholder as Registry['v1.account.store']['types'],
  },
  'v1.auth.access_tokens.store': {
    methods: ["POST"],
    pattern: '/api/v1/auth/login',
    tokens: [{"old":"/api/v1/auth/login","type":0,"val":"api","end":""},{"old":"/api/v1/auth/login","type":0,"val":"v1","end":""},{"old":"/api/v1/auth/login","type":0,"val":"auth","end":""},{"old":"/api/v1/auth/login","type":0,"val":"login","end":""}],
    types: placeholder as Registry['v1.auth.access_tokens.store']['types'],
  },
  'v1.auth.access_tokens.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/auth/logout',
    tokens: [{"old":"/api/v1/auth/logout","type":0,"val":"api","end":""},{"old":"/api/v1/auth/logout","type":0,"val":"v1","end":""},{"old":"/api/v1/auth/logout","type":0,"val":"auth","end":""},{"old":"/api/v1/auth/logout","type":0,"val":"logout","end":""}],
    types: placeholder as Registry['v1.auth.access_tokens.destroy']['types'],
  },
  'v1.auth.refresh_tokens.store': {
    methods: ["POST"],
    pattern: '/api/v1/auth/refresh',
    tokens: [{"old":"/api/v1/auth/refresh","type":0,"val":"api","end":""},{"old":"/api/v1/auth/refresh","type":0,"val":"v1","end":""},{"old":"/api/v1/auth/refresh","type":0,"val":"auth","end":""},{"old":"/api/v1/auth/refresh","type":0,"val":"refresh","end":""}],
    types: placeholder as Registry['v1.auth.refresh_tokens.store']['types'],
  },
  'v1.auth.forgot_password.store': {
    methods: ["POST"],
    pattern: '/api/v1/auth/forgot-password',
    tokens: [{"old":"/api/v1/auth/forgot-password","type":0,"val":"api","end":""},{"old":"/api/v1/auth/forgot-password","type":0,"val":"v1","end":""},{"old":"/api/v1/auth/forgot-password","type":0,"val":"auth","end":""},{"old":"/api/v1/auth/forgot-password","type":0,"val":"forgot-password","end":""}],
    types: placeholder as Registry['v1.auth.forgot_password.store']['types'],
  },
  'v1.auth.reset_password.update': {
    methods: ["PATCH"],
    pattern: '/api/v1/auth/reset-password',
    tokens: [{"old":"/api/v1/auth/reset-password","type":0,"val":"api","end":""},{"old":"/api/v1/auth/reset-password","type":0,"val":"v1","end":""},{"old":"/api/v1/auth/reset-password","type":0,"val":"auth","end":""},{"old":"/api/v1/auth/reset-password","type":0,"val":"reset-password","end":""}],
    types: placeholder as Registry['v1.auth.reset_password.update']['types'],
  },
  'v1.auth.sessions.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/auth/sessions',
    tokens: [{"old":"/api/v1/auth/sessions","type":0,"val":"api","end":""},{"old":"/api/v1/auth/sessions","type":0,"val":"v1","end":""},{"old":"/api/v1/auth/sessions","type":0,"val":"auth","end":""},{"old":"/api/v1/auth/sessions","type":0,"val":"sessions","end":""}],
    types: placeholder as Registry['v1.auth.sessions.index']['types'],
  },
  'v1.auth.all_sessions.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/auth/sessions',
    tokens: [{"old":"/api/v1/auth/sessions","type":0,"val":"api","end":""},{"old":"/api/v1/auth/sessions","type":0,"val":"v1","end":""},{"old":"/api/v1/auth/sessions","type":0,"val":"auth","end":""},{"old":"/api/v1/auth/sessions","type":0,"val":"sessions","end":""}],
    types: placeholder as Registry['v1.auth.all_sessions.destroy']['types'],
  },
  'v1.auth.sessions.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/auth/sessions/:familyId',
    tokens: [{"old":"/api/v1/auth/sessions/:familyId","type":0,"val":"api","end":""},{"old":"/api/v1/auth/sessions/:familyId","type":0,"val":"v1","end":""},{"old":"/api/v1/auth/sessions/:familyId","type":0,"val":"auth","end":""},{"old":"/api/v1/auth/sessions/:familyId","type":0,"val":"sessions","end":""},{"old":"/api/v1/auth/sessions/:familyId","type":1,"val":"familyId","end":""}],
    types: placeholder as Registry['v1.auth.sessions.destroy']['types'],
  },
  'v1.profile.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/account/profile',
    tokens: [{"old":"/api/v1/account/profile","type":0,"val":"api","end":""},{"old":"/api/v1/account/profile","type":0,"val":"v1","end":""},{"old":"/api/v1/account/profile","type":0,"val":"account","end":""},{"old":"/api/v1/account/profile","type":0,"val":"profile","end":""}],
    types: placeholder as Registry['v1.profile.show']['types'],
  },
  'v1.account_password.update': {
    methods: ["PATCH"],
    pattern: '/api/v1/account/password',
    tokens: [{"old":"/api/v1/account/password","type":0,"val":"api","end":""},{"old":"/api/v1/account/password","type":0,"val":"v1","end":""},{"old":"/api/v1/account/password","type":0,"val":"account","end":""},{"old":"/api/v1/account/password","type":0,"val":"password","end":""}],
    types: placeholder as Registry['v1.account_password.update']['types'],
  },
} as const satisfies Record<string, AdonisEndpoint>

export { routes }

export const registry = {
  routes,
  $tree: {} as ApiDefinition,
}

declare module '@tuyau/core/types' {
  export interface UserRegistry {
    routes: typeof routes
    $tree: ApiDefinition
  }
}

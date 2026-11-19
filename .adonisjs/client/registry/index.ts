/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

const placeholder: any = {}

const routes = {
  'v1.account.store': {
    methods: ["POST"],
    pattern: '/api/v1/accounts',
    tokens: [[0,"api"],[0,"v1"],[0,"accounts"]],
    types: placeholder as Registry['v1.account.store']['types'],
  },
  'v1.missionary_accounts.store': {
    methods: ["POST"],
    pattern: '/api/v1/accounts/missionaries',
    tokens: [[0,"api"],[0,"v1"],[0,"accounts"],[0,"missionaries"]],
    types: placeholder as Registry['v1.missionary_accounts.store']['types'],
  },
  'v1.username_availability.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/accounts/username-availability',
    tokens: [[0,"api"],[0,"v1"],[0,"accounts"],[0,"username-availability"]],
    types: placeholder as Registry['v1.username_availability.show']['types'],
  },
  'v1.media_assets.store': {
    methods: ["POST"],
    pattern: '/api/v1/media-assets',
    tokens: [[0,"api"],[0,"v1"],[0,"media-assets"]],
    types: placeholder as Registry['v1.media_assets.store']['types'],
  },
  'v1.media_assets.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/media-assets/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"media-assets"],[1,"id"]],
    types: placeholder as Registry['v1.media_assets.show']['types'],
  },
  'v1.media_uploads.store': {
    methods: ["POST"],
    pattern: '/api/v1/media-assets/uploads',
    tokens: [[0,"api"],[0,"v1"],[0,"media-assets"],[0,"uploads"]],
    types: placeholder as Registry['v1.media_uploads.store']['types'],
  },
  'v1.media_upload_completions.store': {
    methods: ["POST"],
    pattern: '/api/v1/media-assets/:id/completion',
    tokens: [[0,"api"],[0,"v1"],[0,"media-assets"],[1,"id"],[0,"completion"]],
    types: placeholder as Registry['v1.media_upload_completions.store']['types'],
  },
  'v1.impact_projects.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/impact-projects',
    tokens: [[0,"api"],[0,"v1"],[0,"impact-projects"]],
    types: placeholder as Registry['v1.impact_projects.index']['types'],
  },
  'v1.impact_projects.store': {
    methods: ["POST"],
    pattern: '/api/v1/impact-projects',
    tokens: [[0,"api"],[0,"v1"],[0,"impact-projects"]],
    types: placeholder as Registry['v1.impact_projects.store']['types'],
  },
  'v1.impact_projects.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/impact-projects/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"impact-projects"],[1,"id"]],
    types: placeholder as Registry['v1.impact_projects.show']['types'],
  },
  'v1.impact_projects.update': {
    methods: ["PUT","PATCH"],
    pattern: '/api/v1/impact-projects/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"impact-projects"],[1,"id"]],
    types: placeholder as Registry['v1.impact_projects.update']['types'],
  },
  'v1.impact_projects.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/impact-projects/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"impact-projects"],[1,"id"]],
    types: placeholder as Registry['v1.impact_projects.destroy']['types'],
  },
  'v1.posts.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/posts',
    tokens: [[0,"api"],[0,"v1"],[0,"posts"]],
    types: placeholder as Registry['v1.posts.index']['types'],
  },
  'v1.posts.store': {
    methods: ["POST"],
    pattern: '/api/v1/posts',
    tokens: [[0,"api"],[0,"v1"],[0,"posts"]],
    types: placeholder as Registry['v1.posts.store']['types'],
  },
  'v1.posts.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/posts/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"posts"],[1,"id"]],
    types: placeholder as Registry['v1.posts.show']['types'],
  },
  'v1.posts.update': {
    methods: ["PUT","PATCH"],
    pattern: '/api/v1/posts/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"posts"],[1,"id"]],
    types: placeholder as Registry['v1.posts.update']['types'],
  },
  'v1.posts.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/posts/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"posts"],[1,"id"]],
    types: placeholder as Registry['v1.posts.destroy']['types'],
  },
  'v1.missionary_agencies.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/missionary-agencies',
    tokens: [[0,"api"],[0,"v1"],[0,"missionary-agencies"]],
    types: placeholder as Registry['v1.missionary_agencies.index']['types'],
  },
  'v1.missionary_agencies.store': {
    methods: ["POST"],
    pattern: '/api/v1/missionary-agencies',
    tokens: [[0,"api"],[0,"v1"],[0,"missionary-agencies"]],
    types: placeholder as Registry['v1.missionary_agencies.store']['types'],
  },
  'v1.missionary_agencies.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/missionary-agencies/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"missionary-agencies"],[1,"id"]],
    types: placeholder as Registry['v1.missionary_agencies.show']['types'],
  },
  'v1.missionary_agencies.update': {
    methods: ["PUT","PATCH"],
    pattern: '/api/v1/missionary-agencies/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"missionary-agencies"],[1,"id"]],
    types: placeholder as Registry['v1.missionary_agencies.update']['types'],
  },
  'v1.missionary_agencies.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/missionary-agencies/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"missionary-agencies"],[1,"id"]],
    types: placeholder as Registry['v1.missionary_agencies.destroy']['types'],
  },
  'v1.faith_communities.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/faith-communities',
    tokens: [[0,"api"],[0,"v1"],[0,"faith-communities"]],
    types: placeholder as Registry['v1.faith_communities.index']['types'],
  },
  'v1.faith_communities.store': {
    methods: ["POST"],
    pattern: '/api/v1/faith-communities',
    tokens: [[0,"api"],[0,"v1"],[0,"faith-communities"]],
    types: placeholder as Registry['v1.faith_communities.store']['types'],
  },
  'v1.faith_communities.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/faith-communities/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"faith-communities"],[1,"id"]],
    types: placeholder as Registry['v1.faith_communities.show']['types'],
  },
  'v1.faith_communities.update': {
    methods: ["PUT","PATCH"],
    pattern: '/api/v1/faith-communities/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"faith-communities"],[1,"id"]],
    types: placeholder as Registry['v1.faith_communities.update']['types'],
  },
  'v1.faith_communities.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/faith-communities/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"faith-communities"],[1,"id"]],
    types: placeholder as Registry['v1.faith_communities.destroy']['types'],
  },
  'v1.public.missionaries.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/public/missionaries/:username',
    tokens: [[0,"api"],[0,"v1"],[0,"public"],[0,"missionaries"],[1,"username"]],
    types: placeholder as Registry['v1.public.missionaries.show']['types'],
  },
  'v1.auth.access_tokens.store': {
    methods: ["POST"],
    pattern: '/api/v1/auth/login',
    tokens: [[0,"api"],[0,"v1"],[0,"auth"],[0,"login"]],
    types: placeholder as Registry['v1.auth.access_tokens.store']['types'],
  },
  'v1.auth.access_tokens.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/auth/logout',
    tokens: [[0,"api"],[0,"v1"],[0,"auth"],[0,"logout"]],
    types: placeholder as Registry['v1.auth.access_tokens.destroy']['types'],
  },
  'v1.auth.refresh_tokens.store': {
    methods: ["POST"],
    pattern: '/api/v1/auth/refresh',
    tokens: [[0,"api"],[0,"v1"],[0,"auth"],[0,"refresh"]],
    types: placeholder as Registry['v1.auth.refresh_tokens.store']['types'],
  },
  'v1.auth.forgot_password.store': {
    methods: ["POST"],
    pattern: '/api/v1/auth/forgot-password',
    tokens: [[0,"api"],[0,"v1"],[0,"auth"],[0,"forgot-password"]],
    types: placeholder as Registry['v1.auth.forgot_password.store']['types'],
  },
  'v1.auth.reset_password.update': {
    methods: ["PATCH"],
    pattern: '/api/v1/auth/reset-password',
    tokens: [[0,"api"],[0,"v1"],[0,"auth"],[0,"reset-password"]],
    types: placeholder as Registry['v1.auth.reset_password.update']['types'],
  },
  'v1.auth.sessions.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/auth/sessions',
    tokens: [[0,"api"],[0,"v1"],[0,"auth"],[0,"sessions"]],
    types: placeholder as Registry['v1.auth.sessions.index']['types'],
  },
  'v1.auth.all_sessions.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/auth/sessions',
    tokens: [[0,"api"],[0,"v1"],[0,"auth"],[0,"sessions"]],
    types: placeholder as Registry['v1.auth.all_sessions.destroy']['types'],
  },
  'v1.auth.sessions.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/auth/sessions/:familyId',
    tokens: [[0,"api"],[0,"v1"],[0,"auth"],[0,"sessions"],[1,"familyId"]],
    types: placeholder as Registry['v1.auth.sessions.destroy']['types'],
  },
  'v1.profile.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/account/profile',
    tokens: [[0,"api"],[0,"v1"],[0,"account"],[0,"profile"]],
    types: placeholder as Registry['v1.profile.show']['types'],
  },
  'v1.profile.update': {
    methods: ["PATCH"],
    pattern: '/api/v1/account/profile',
    tokens: [[0,"api"],[0,"v1"],[0,"account"],[0,"profile"]],
    types: placeholder as Registry['v1.profile.update']['types'],
  },
  'v1.account_password.update': {
    methods: ["PATCH"],
    pattern: '/api/v1/account/password',
    tokens: [[0,"api"],[0,"v1"],[0,"account"],[0,"password"]],
    types: placeholder as Registry['v1.account_password.update']['types'],
  },
  'v1.missionary.about.update': {
    methods: ["PATCH"],
    pattern: '/api/v1/missionaries/about',
    tokens: [[0,"api"],[0,"v1"],[0,"missionaries"],[0,"about"]],
    types: placeholder as Registry['v1.missionary.about.update']['types'],
  },
  'v1.missionary.profile.store': {
    methods: ["POST"],
    pattern: '/api/v1/missionaries/profile',
    tokens: [[0,"api"],[0,"v1"],[0,"missionaries"],[0,"profile"]],
    types: placeholder as Registry['v1.missionary.profile.store']['types'],
  },
  'v1.missionary.profile.update': {
    methods: ["PATCH"],
    pattern: '/api/v1/missionaries/profile',
    tokens: [[0,"api"],[0,"v1"],[0,"missionaries"],[0,"profile"]],
    types: placeholder as Registry['v1.missionary.profile.update']['types'],
  },
  'v1.missionary.identity.update': {
    methods: ["PATCH"],
    pattern: '/api/v1/missionaries/identity',
    tokens: [[0,"api"],[0,"v1"],[0,"missionaries"],[0,"identity"]],
    types: placeholder as Registry['v1.missionary.identity.update']['types'],
  },
  'v1.missionary.work_address.update': {
    methods: ["PATCH"],
    pattern: '/api/v1/missionaries/work-address',
    tokens: [[0,"api"],[0,"v1"],[0,"missionaries"],[0,"work-address"]],
    types: placeholder as Registry['v1.missionary.work_address.update']['types'],
  },
  'v1.missionary.admin.about.update': {
    methods: ["PATCH"],
    pattern: '/api/v1/missionaries/:id/about',
    tokens: [[0,"api"],[0,"v1"],[0,"missionaries"],[1,"id"],[0,"about"]],
    types: placeholder as Registry['v1.missionary.admin.about.update']['types'],
  },
  'v1.missionary.admin.profile.update': {
    methods: ["PATCH"],
    pattern: '/api/v1/missionaries/:id/profile',
    tokens: [[0,"api"],[0,"v1"],[0,"missionaries"],[1,"id"],[0,"profile"]],
    types: placeholder as Registry['v1.missionary.admin.profile.update']['types'],
  },
  'v1.missionary.admin.identity.update': {
    methods: ["PATCH"],
    pattern: '/api/v1/missionaries/:id/identity',
    tokens: [[0,"api"],[0,"v1"],[0,"missionaries"],[1,"id"],[0,"identity"]],
    types: placeholder as Registry['v1.missionary.admin.identity.update']['types'],
  },
  'v1.missionary.admin.work_address.update': {
    methods: ["PATCH"],
    pattern: '/api/v1/missionaries/:id/work-address',
    tokens: [[0,"api"],[0,"v1"],[0,"missionaries"],[1,"id"],[0,"work-address"]],
    types: placeholder as Registry['v1.missionary.admin.work_address.update']['types'],
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

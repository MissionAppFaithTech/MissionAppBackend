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
  'v1.username_availability.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/accounts/username-availability',
    tokens: [{"old":"/api/v1/accounts/username-availability","type":0,"val":"api","end":""},{"old":"/api/v1/accounts/username-availability","type":0,"val":"v1","end":""},{"old":"/api/v1/accounts/username-availability","type":0,"val":"accounts","end":""},{"old":"/api/v1/accounts/username-availability","type":0,"val":"username-availability","end":""}],
    types: placeholder as Registry['v1.username_availability.show']['types'],
  },
  'v1.media_assets.store': {
    methods: ["POST"],
    pattern: '/api/v1/media-assets',
    tokens: [{"old":"/api/v1/media-assets","type":0,"val":"api","end":""},{"old":"/api/v1/media-assets","type":0,"val":"v1","end":""},{"old":"/api/v1/media-assets","type":0,"val":"media-assets","end":""}],
    types: placeholder as Registry['v1.media_assets.store']['types'],
  },
  'v1.media_assets.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/media-assets/:id',
    tokens: [{"old":"/api/v1/media-assets/:id","type":0,"val":"api","end":""},{"old":"/api/v1/media-assets/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/media-assets/:id","type":0,"val":"media-assets","end":""},{"old":"/api/v1/media-assets/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['v1.media_assets.show']['types'],
  },
  'v1.media_uploads.store': {
    methods: ["POST"],
    pattern: '/api/v1/media-assets/uploads',
    tokens: [{"old":"/api/v1/media-assets/uploads","type":0,"val":"api","end":""},{"old":"/api/v1/media-assets/uploads","type":0,"val":"v1","end":""},{"old":"/api/v1/media-assets/uploads","type":0,"val":"media-assets","end":""},{"old":"/api/v1/media-assets/uploads","type":0,"val":"uploads","end":""}],
    types: placeholder as Registry['v1.media_uploads.store']['types'],
  },
  'v1.media_upload_completions.store': {
    methods: ["POST"],
    pattern: '/api/v1/media-assets/:id/completion',
    tokens: [{"old":"/api/v1/media-assets/:id/completion","type":0,"val":"api","end":""},{"old":"/api/v1/media-assets/:id/completion","type":0,"val":"v1","end":""},{"old":"/api/v1/media-assets/:id/completion","type":0,"val":"media-assets","end":""},{"old":"/api/v1/media-assets/:id/completion","type":1,"val":"id","end":""},{"old":"/api/v1/media-assets/:id/completion","type":0,"val":"completion","end":""}],
    types: placeholder as Registry['v1.media_upload_completions.store']['types'],
  },
  'v1.impact_projects.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/impact-projects',
    tokens: [{"old":"/api/v1/impact-projects","type":0,"val":"api","end":""},{"old":"/api/v1/impact-projects","type":0,"val":"v1","end":""},{"old":"/api/v1/impact-projects","type":0,"val":"impact-projects","end":""}],
    types: placeholder as Registry['v1.impact_projects.index']['types'],
  },
  'v1.impact_projects.store': {
    methods: ["POST"],
    pattern: '/api/v1/impact-projects',
    tokens: [{"old":"/api/v1/impact-projects","type":0,"val":"api","end":""},{"old":"/api/v1/impact-projects","type":0,"val":"v1","end":""},{"old":"/api/v1/impact-projects","type":0,"val":"impact-projects","end":""}],
    types: placeholder as Registry['v1.impact_projects.store']['types'],
  },
  'v1.impact_projects.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/impact-projects/:id',
    tokens: [{"old":"/api/v1/impact-projects/:id","type":0,"val":"api","end":""},{"old":"/api/v1/impact-projects/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/impact-projects/:id","type":0,"val":"impact-projects","end":""},{"old":"/api/v1/impact-projects/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['v1.impact_projects.show']['types'],
  },
  'v1.impact_projects.update': {
    methods: ["PUT","PATCH"],
    pattern: '/api/v1/impact-projects/:id',
    tokens: [{"old":"/api/v1/impact-projects/:id","type":0,"val":"api","end":""},{"old":"/api/v1/impact-projects/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/impact-projects/:id","type":0,"val":"impact-projects","end":""},{"old":"/api/v1/impact-projects/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['v1.impact_projects.update']['types'],
  },
  'v1.impact_projects.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/impact-projects/:id',
    tokens: [{"old":"/api/v1/impact-projects/:id","type":0,"val":"api","end":""},{"old":"/api/v1/impact-projects/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/impact-projects/:id","type":0,"val":"impact-projects","end":""},{"old":"/api/v1/impact-projects/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['v1.impact_projects.destroy']['types'],
  },
  'v1.posts.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/posts',
    tokens: [{"old":"/api/v1/posts","type":0,"val":"api","end":""},{"old":"/api/v1/posts","type":0,"val":"v1","end":""},{"old":"/api/v1/posts","type":0,"val":"posts","end":""}],
    types: placeholder as Registry['v1.posts.index']['types'],
  },
  'v1.posts.store': {
    methods: ["POST"],
    pattern: '/api/v1/posts',
    tokens: [{"old":"/api/v1/posts","type":0,"val":"api","end":""},{"old":"/api/v1/posts","type":0,"val":"v1","end":""},{"old":"/api/v1/posts","type":0,"val":"posts","end":""}],
    types: placeholder as Registry['v1.posts.store']['types'],
  },
  'v1.posts.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/posts/:id',
    tokens: [{"old":"/api/v1/posts/:id","type":0,"val":"api","end":""},{"old":"/api/v1/posts/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/posts/:id","type":0,"val":"posts","end":""},{"old":"/api/v1/posts/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['v1.posts.show']['types'],
  },
  'v1.posts.update': {
    methods: ["PUT","PATCH"],
    pattern: '/api/v1/posts/:id',
    tokens: [{"old":"/api/v1/posts/:id","type":0,"val":"api","end":""},{"old":"/api/v1/posts/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/posts/:id","type":0,"val":"posts","end":""},{"old":"/api/v1/posts/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['v1.posts.update']['types'],
  },
  'v1.posts.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/posts/:id',
    tokens: [{"old":"/api/v1/posts/:id","type":0,"val":"api","end":""},{"old":"/api/v1/posts/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/posts/:id","type":0,"val":"posts","end":""},{"old":"/api/v1/posts/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['v1.posts.destroy']['types'],
  },
  'v1.missionary_agencies.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/missionary-agencies',
    tokens: [{"old":"/api/v1/missionary-agencies","type":0,"val":"api","end":""},{"old":"/api/v1/missionary-agencies","type":0,"val":"v1","end":""},{"old":"/api/v1/missionary-agencies","type":0,"val":"missionary-agencies","end":""}],
    types: placeholder as Registry['v1.missionary_agencies.index']['types'],
  },
  'v1.missionary_agencies.store': {
    methods: ["POST"],
    pattern: '/api/v1/missionary-agencies',
    tokens: [{"old":"/api/v1/missionary-agencies","type":0,"val":"api","end":""},{"old":"/api/v1/missionary-agencies","type":0,"val":"v1","end":""},{"old":"/api/v1/missionary-agencies","type":0,"val":"missionary-agencies","end":""}],
    types: placeholder as Registry['v1.missionary_agencies.store']['types'],
  },
  'v1.missionary_agencies.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/missionary-agencies/:id',
    tokens: [{"old":"/api/v1/missionary-agencies/:id","type":0,"val":"api","end":""},{"old":"/api/v1/missionary-agencies/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/missionary-agencies/:id","type":0,"val":"missionary-agencies","end":""},{"old":"/api/v1/missionary-agencies/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['v1.missionary_agencies.show']['types'],
  },
  'v1.missionary_agencies.update': {
    methods: ["PUT","PATCH"],
    pattern: '/api/v1/missionary-agencies/:id',
    tokens: [{"old":"/api/v1/missionary-agencies/:id","type":0,"val":"api","end":""},{"old":"/api/v1/missionary-agencies/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/missionary-agencies/:id","type":0,"val":"missionary-agencies","end":""},{"old":"/api/v1/missionary-agencies/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['v1.missionary_agencies.update']['types'],
  },
  'v1.missionary_agencies.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/missionary-agencies/:id',
    tokens: [{"old":"/api/v1/missionary-agencies/:id","type":0,"val":"api","end":""},{"old":"/api/v1/missionary-agencies/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/missionary-agencies/:id","type":0,"val":"missionary-agencies","end":""},{"old":"/api/v1/missionary-agencies/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['v1.missionary_agencies.destroy']['types'],
  },
  'v1.faith_communities.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/faith-communities',
    tokens: [{"old":"/api/v1/faith-communities","type":0,"val":"api","end":""},{"old":"/api/v1/faith-communities","type":0,"val":"v1","end":""},{"old":"/api/v1/faith-communities","type":0,"val":"faith-communities","end":""}],
    types: placeholder as Registry['v1.faith_communities.index']['types'],
  },
  'v1.faith_communities.store': {
    methods: ["POST"],
    pattern: '/api/v1/faith-communities',
    tokens: [{"old":"/api/v1/faith-communities","type":0,"val":"api","end":""},{"old":"/api/v1/faith-communities","type":0,"val":"v1","end":""},{"old":"/api/v1/faith-communities","type":0,"val":"faith-communities","end":""}],
    types: placeholder as Registry['v1.faith_communities.store']['types'],
  },
  'v1.faith_communities.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/faith-communities/:id',
    tokens: [{"old":"/api/v1/faith-communities/:id","type":0,"val":"api","end":""},{"old":"/api/v1/faith-communities/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/faith-communities/:id","type":0,"val":"faith-communities","end":""},{"old":"/api/v1/faith-communities/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['v1.faith_communities.show']['types'],
  },
  'v1.faith_communities.update': {
    methods: ["PUT","PATCH"],
    pattern: '/api/v1/faith-communities/:id',
    tokens: [{"old":"/api/v1/faith-communities/:id","type":0,"val":"api","end":""},{"old":"/api/v1/faith-communities/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/faith-communities/:id","type":0,"val":"faith-communities","end":""},{"old":"/api/v1/faith-communities/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['v1.faith_communities.update']['types'],
  },
  'v1.faith_communities.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/faith-communities/:id',
    tokens: [{"old":"/api/v1/faith-communities/:id","type":0,"val":"api","end":""},{"old":"/api/v1/faith-communities/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/faith-communities/:id","type":0,"val":"faith-communities","end":""},{"old":"/api/v1/faith-communities/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['v1.faith_communities.destroy']['types'],
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
  'v1.profile.update': {
    methods: ["PATCH"],
    pattern: '/api/v1/account/profile',
    tokens: [{"old":"/api/v1/account/profile","type":0,"val":"api","end":""},{"old":"/api/v1/account/profile","type":0,"val":"v1","end":""},{"old":"/api/v1/account/profile","type":0,"val":"account","end":""},{"old":"/api/v1/account/profile","type":0,"val":"profile","end":""}],
    types: placeholder as Registry['v1.profile.update']['types'],
  },
  'v1.account_password.update': {
    methods: ["PATCH"],
    pattern: '/api/v1/account/password',
    tokens: [{"old":"/api/v1/account/password","type":0,"val":"api","end":""},{"old":"/api/v1/account/password","type":0,"val":"v1","end":""},{"old":"/api/v1/account/password","type":0,"val":"account","end":""},{"old":"/api/v1/account/password","type":0,"val":"password","end":""}],
    types: placeholder as Registry['v1.account_password.update']['types'],
  },
  'v1.missionary.about.update': {
    methods: ["PATCH"],
    pattern: '/api/v1/missionaries/about',
    tokens: [{"old":"/api/v1/missionaries/about","type":0,"val":"api","end":""},{"old":"/api/v1/missionaries/about","type":0,"val":"v1","end":""},{"old":"/api/v1/missionaries/about","type":0,"val":"missionaries","end":""},{"old":"/api/v1/missionaries/about","type":0,"val":"about","end":""}],
    types: placeholder as Registry['v1.missionary.about.update']['types'],
  },
  'v1.missionary.profile.store': {
    methods: ["POST"],
    pattern: '/api/v1/missionaries/profile',
    tokens: [{"old":"/api/v1/missionaries/profile","type":0,"val":"api","end":""},{"old":"/api/v1/missionaries/profile","type":0,"val":"v1","end":""},{"old":"/api/v1/missionaries/profile","type":0,"val":"missionaries","end":""},{"old":"/api/v1/missionaries/profile","type":0,"val":"profile","end":""}],
    types: placeholder as Registry['v1.missionary.profile.store']['types'],
  },
  'v1.missionary.profile.update': {
    methods: ["PATCH"],
    pattern: '/api/v1/missionaries/profile',
    tokens: [{"old":"/api/v1/missionaries/profile","type":0,"val":"api","end":""},{"old":"/api/v1/missionaries/profile","type":0,"val":"v1","end":""},{"old":"/api/v1/missionaries/profile","type":0,"val":"missionaries","end":""},{"old":"/api/v1/missionaries/profile","type":0,"val":"profile","end":""}],
    types: placeholder as Registry['v1.missionary.profile.update']['types'],
  },
  'v1.missionary.identity.update': {
    methods: ["PATCH"],
    pattern: '/api/v1/missionaries/identity',
    tokens: [{"old":"/api/v1/missionaries/identity","type":0,"val":"api","end":""},{"old":"/api/v1/missionaries/identity","type":0,"val":"v1","end":""},{"old":"/api/v1/missionaries/identity","type":0,"val":"missionaries","end":""},{"old":"/api/v1/missionaries/identity","type":0,"val":"identity","end":""}],
    types: placeholder as Registry['v1.missionary.identity.update']['types'],
  },
  'v1.missionary.work_address.update': {
    methods: ["PATCH"],
    pattern: '/api/v1/missionaries/work-address',
    tokens: [{"old":"/api/v1/missionaries/work-address","type":0,"val":"api","end":""},{"old":"/api/v1/missionaries/work-address","type":0,"val":"v1","end":""},{"old":"/api/v1/missionaries/work-address","type":0,"val":"missionaries","end":""},{"old":"/api/v1/missionaries/work-address","type":0,"val":"work-address","end":""}],
    types: placeholder as Registry['v1.missionary.work_address.update']['types'],
  },
  'v1.missionary.admin.about.update': {
    methods: ["PATCH"],
    pattern: '/api/v1/missionaries/:id/about',
    tokens: [{"old":"/api/v1/missionaries/:id/about","type":0,"val":"api","end":""},{"old":"/api/v1/missionaries/:id/about","type":0,"val":"v1","end":""},{"old":"/api/v1/missionaries/:id/about","type":0,"val":"missionaries","end":""},{"old":"/api/v1/missionaries/:id/about","type":1,"val":"id","end":""},{"old":"/api/v1/missionaries/:id/about","type":0,"val":"about","end":""}],
    types: placeholder as Registry['v1.missionary.admin.about.update']['types'],
  },
  'v1.missionary.admin.profile.update': {
    methods: ["PATCH"],
    pattern: '/api/v1/missionaries/:id/profile',
    tokens: [{"old":"/api/v1/missionaries/:id/profile","type":0,"val":"api","end":""},{"old":"/api/v1/missionaries/:id/profile","type":0,"val":"v1","end":""},{"old":"/api/v1/missionaries/:id/profile","type":0,"val":"missionaries","end":""},{"old":"/api/v1/missionaries/:id/profile","type":1,"val":"id","end":""},{"old":"/api/v1/missionaries/:id/profile","type":0,"val":"profile","end":""}],
    types: placeholder as Registry['v1.missionary.admin.profile.update']['types'],
  },
  'v1.missionary.admin.identity.update': {
    methods: ["PATCH"],
    pattern: '/api/v1/missionaries/:id/identity',
    tokens: [{"old":"/api/v1/missionaries/:id/identity","type":0,"val":"api","end":""},{"old":"/api/v1/missionaries/:id/identity","type":0,"val":"v1","end":""},{"old":"/api/v1/missionaries/:id/identity","type":0,"val":"missionaries","end":""},{"old":"/api/v1/missionaries/:id/identity","type":1,"val":"id","end":""},{"old":"/api/v1/missionaries/:id/identity","type":0,"val":"identity","end":""}],
    types: placeholder as Registry['v1.missionary.admin.identity.update']['types'],
  },
  'v1.missionary.admin.work_address.update': {
    methods: ["PATCH"],
    pattern: '/api/v1/missionaries/:id/work-address',
    tokens: [{"old":"/api/v1/missionaries/:id/work-address","type":0,"val":"api","end":""},{"old":"/api/v1/missionaries/:id/work-address","type":0,"val":"v1","end":""},{"old":"/api/v1/missionaries/:id/work-address","type":0,"val":"missionaries","end":""},{"old":"/api/v1/missionaries/:id/work-address","type":1,"val":"id","end":""},{"old":"/api/v1/missionaries/:id/work-address","type":0,"val":"work-address","end":""}],
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

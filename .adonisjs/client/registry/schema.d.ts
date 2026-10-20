/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type { ExtractBody, ExtractErrorResponse, ExtractQuery, ExtractQueryForGet, ExtractResponse } from '@tuyau/core/types'
import type { InferInput, SimpleError } from '@vinejs/vine/types'

export type ParamValue = string | number | bigint | boolean

export interface Registry {
  'v1.account.store': {
    methods: ["POST"]
    pattern: '/api/v1/accounts'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user/signup').signupValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user/signup').signupValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/user/account_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/user/account_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'v1.username_availability.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/accounts/username-availability'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/user/username_availability').usernameAvailabilityValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/user/username_availability_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/user/username_availability_controller').default['show']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'v1.media_assets.store': {
    methods: ["POST"]
    pattern: '/api/v1/media-assets'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/media_asset/register_media_asset').registerMediaAssetValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/media_asset/register_media_asset').registerMediaAssetValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/media_asset/media_assets_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/media_asset/media_assets_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'v1.media_assets.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/media-assets/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/media_asset/media_asset_id').mediaAssetIdValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/media_asset/media_assets_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/media_asset/media_assets_controller').default['show']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'v1.media_uploads.store': {
    methods: ["POST"]
    pattern: '/api/v1/media-assets/uploads'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/media_asset/request_media_upload').requestMediaUploadValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/media_asset/request_media_upload').requestMediaUploadValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/media_asset/media_uploads_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/media_asset/media_uploads_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'v1.media_upload_completions.store': {
    methods: ["POST"]
    pattern: '/api/v1/media-assets/:id/completion'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/media_asset/media_asset_id').mediaAssetIdValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/media_asset/media_asset_id').mediaAssetIdValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/media_asset/media_upload_completions_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/media_asset/media_upload_completions_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'v1.impact_projects.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/impact-projects'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/impact_project/list_impact_projects').listImpactProjectsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/impact_project/impact_projects_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/impact_project/impact_projects_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'v1.impact_projects.store': {
    methods: ["POST"]
    pattern: '/api/v1/impact-projects'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/impact_project/create_impact_project').createImpactProjectValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/impact_project/create_impact_project').createImpactProjectValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/impact_project/impact_projects_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/impact_project/impact_projects_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'v1.impact_projects.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/impact-projects/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/impact_project/impact_project_id').impactProjectIdValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/impact_project/impact_projects_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/impact_project/impact_projects_controller').default['show']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'v1.impact_projects.update': {
    methods: ["PUT","PATCH"]
    pattern: '/api/v1/impact-projects/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/impact_project/update_impact_project').updateImpactProjectValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/impact_project/update_impact_project').updateImpactProjectValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/impact_project/impact_projects_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/impact_project/impact_projects_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'v1.impact_projects.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/impact-projects/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/impact_project/impact_project_id').impactProjectIdValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/impact_project/impact_project_id').impactProjectIdValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/impact_project/impact_projects_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/impact_project/impact_projects_controller').default['destroy']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'v1.posts.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/posts'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/post/list_posts').listPostsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/post/posts_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/post/posts_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'v1.posts.store': {
    methods: ["POST"]
    pattern: '/api/v1/posts'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/post/create_post').createPostValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/post/create_post').createPostValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/post/posts_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/post/posts_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'v1.posts.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/posts/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/post/post_id').postIdValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/post/posts_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/post/posts_controller').default['show']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'v1.posts.update': {
    methods: ["PUT","PATCH"]
    pattern: '/api/v1/posts/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/post/update_post').updatePostValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/post/update_post').updatePostValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/post/posts_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/post/posts_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'v1.posts.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/posts/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/post/post_id').postIdValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/post/post_id').postIdValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/post/posts_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/post/posts_controller').default['destroy']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'v1.missionary_agencies.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/missionary-agencies'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/missionary/list_missionary_agencies').listMissionaryAgenciesValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/missionary/missionary_agencies_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/missionary/missionary_agencies_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'v1.missionary_agencies.store': {
    methods: ["POST"]
    pattern: '/api/v1/missionary-agencies'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/missionary/create_missionary_agency').createMissionaryAgencyValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/missionary/create_missionary_agency').createMissionaryAgencyValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/missionary/missionary_agencies_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/missionary/missionary_agencies_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'v1.missionary_agencies.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/missionary-agencies/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/missionary/missionary_agency_id').missionaryAgencyIdValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/missionary/missionary_agencies_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/missionary/missionary_agencies_controller').default['show']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'v1.missionary_agencies.update': {
    methods: ["PUT","PATCH"]
    pattern: '/api/v1/missionary-agencies/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/missionary/update_missionary_agency').updateMissionaryAgencyValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/missionary/update_missionary_agency').updateMissionaryAgencyValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/missionary/missionary_agencies_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/missionary/missionary_agencies_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'v1.missionary_agencies.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/missionary-agencies/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/missionary/missionary_agency_id').missionaryAgencyIdValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/missionary/missionary_agency_id').missionaryAgencyIdValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/missionary/missionary_agencies_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/missionary/missionary_agencies_controller').default['destroy']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'v1.faith_communities.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/faith-communities'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/missionary/list_faith_communities').listFaithCommunitiesValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/missionary/faith_communities_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/missionary/faith_communities_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'v1.faith_communities.store': {
    methods: ["POST"]
    pattern: '/api/v1/faith-communities'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/missionary/create_faith_community').createFaithCommunityValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/missionary/create_faith_community').createFaithCommunityValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/missionary/faith_communities_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/missionary/faith_communities_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'v1.faith_communities.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/faith-communities/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/missionary/faith_community_id').faithCommunityIdValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/missionary/faith_communities_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/missionary/faith_communities_controller').default['show']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'v1.faith_communities.update': {
    methods: ["PUT","PATCH"]
    pattern: '/api/v1/faith-communities/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/missionary/update_faith_community').updateFaithCommunityValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/missionary/update_faith_community').updateFaithCommunityValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/missionary/faith_communities_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/missionary/faith_communities_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'v1.faith_communities.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/faith-communities/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/missionary/faith_community_id').faithCommunityIdValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/missionary/faith_community_id').faithCommunityIdValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/missionary/faith_communities_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/missionary/faith_communities_controller').default['destroy']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'v1.auth.access_tokens.store': {
    methods: ["POST"]
    pattern: '/api/v1/auth/login'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user/login').loginValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user/login').loginValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth/access_tokens_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth/access_tokens_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'v1.auth.access_tokens.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/auth/logout'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user/refresh').refreshValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user/refresh').refreshValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth/access_tokens_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth/access_tokens_controller').default['destroy']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'v1.auth.refresh_tokens.store': {
    methods: ["POST"]
    pattern: '/api/v1/auth/refresh'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user/refresh').refreshValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user/refresh').refreshValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth/refresh_tokens_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth/refresh_tokens_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'v1.auth.forgot_password.store': {
    methods: ["POST"]
    pattern: '/api/v1/auth/forgot-password'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user/forgot_password').forgotPasswordValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user/forgot_password').forgotPasswordValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth/forgot_password_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth/forgot_password_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'v1.auth.reset_password.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/auth/reset-password'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user/reset_password').resetPasswordValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user/reset_password').resetPasswordValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth/reset_password_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth/reset_password_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'v1.auth.sessions.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/auth/sessions'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth/sessions_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth/sessions_controller').default['index']>>>
    }
  }
  'v1.auth.all_sessions.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/auth/sessions'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth/all_sessions_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth/all_sessions_controller').default['destroy']>>>
    }
  }
  'v1.auth.sessions.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/auth/sessions/:familyId'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user/session').sessionValidator)>>
      paramsTuple: [ParamValue]
      params: { familyId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/user/session').sessionValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth/sessions_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth/sessions_controller').default['destroy']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'v1.profile.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/account/profile'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/user/profile_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/user/profile_controller').default['show']>>>
    }
  }
  'v1.profile.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/account/profile'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user/update_profile').updateProfileValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user/update_profile').updateProfileValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/user/profile_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/user/profile_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'v1.account_password.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/account/password'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user/change_password').changePasswordValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user/change_password').changePasswordValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/user/account_password_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/user/account_password_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'v1.missionary.about.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/missionaries/about'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/missionary/update_about').updateAboutValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/missionary/update_about').updateAboutValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/missionary/about_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/missionary/about_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'v1.missionary.profile.store': {
    methods: ["POST"]
    pattern: '/api/v1/missionaries/profile'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/missionary/create_profile').createMissionaryProfileValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/missionary/create_profile').createMissionaryProfileValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/missionary/profile_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/missionary/profile_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'v1.missionary.profile.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/missionaries/profile'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/missionary/update_profile').updateProfileValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/missionary/update_profile').updateProfileValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/missionary/profile_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/missionary/profile_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'v1.missionary.identity.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/missionaries/identity'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/missionary/update_identity').updateIdentityValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/missionary/update_identity').updateIdentityValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/missionary/identity_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/missionary/identity_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'v1.missionary.work_address.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/missionaries/work-address'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/missionary/update_work_address').updateWorkAddressValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/missionary/update_work_address').updateWorkAddressValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/missionary/work_address_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/missionary/work_address_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'v1.missionary.admin.about.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/missionaries/:id/about'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/missionary/update_about').updateAboutValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/missionary/update_about').updateAboutValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/missionary/about_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/missionary/about_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'v1.missionary.admin.profile.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/missionaries/:id/profile'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/missionary/update_profile').updateProfileValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/missionary/update_profile').updateProfileValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/missionary/profile_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/missionary/profile_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'v1.missionary.admin.identity.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/missionaries/:id/identity'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/missionary/update_identity').updateIdentityValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/missionary/update_identity').updateIdentityValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/missionary/identity_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/missionary/identity_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'v1.missionary.admin.work_address.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/missionaries/:id/work-address'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/missionary/update_work_address').updateWorkAddressValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/missionary/update_work_address').updateWorkAddressValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/missionary/work_address_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/missionary/work_address_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
}

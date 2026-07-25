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

import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'v1.account.store': { paramsTuple?: []; params?: {} }
    'v1.media_assets.store': { paramsTuple?: []; params?: {} }
    'v1.auth.access_tokens.store': { paramsTuple?: []; params?: {} }
    'v1.auth.access_tokens.destroy': { paramsTuple?: []; params?: {} }
    'v1.auth.refresh_tokens.store': { paramsTuple?: []; params?: {} }
    'v1.auth.forgot_password.store': { paramsTuple?: []; params?: {} }
    'v1.auth.reset_password.update': { paramsTuple?: []; params?: {} }
    'v1.auth.sessions.index': { paramsTuple?: []; params?: {} }
    'v1.auth.all_sessions.destroy': { paramsTuple?: []; params?: {} }
    'v1.auth.sessions.destroy': { paramsTuple: [ParamValue]; params: {'familyId': ParamValue} }
    'v1.profile.show': { paramsTuple?: []; params?: {} }
    'v1.profile.update': { paramsTuple?: []; params?: {} }
    'v1.account_password.update': { paramsTuple?: []; params?: {} }
    'v1.missionary.about.update': { paramsTuple?: []; params?: {} }
    'v1.missionary.profile.store': { paramsTuple?: []; params?: {} }
    'v1.missionary.profile.update': { paramsTuple?: []; params?: {} }
    'v1.missionary.identity.update': { paramsTuple?: []; params?: {} }
    'v1.missionary.work_address.update': { paramsTuple?: []; params?: {} }
    'v1.missionary.admin.about.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'v1.missionary.admin.profile.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'v1.missionary.admin.identity.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'v1.missionary.admin.work_address.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  GET: {
    'v1.auth.sessions.index': { paramsTuple?: []; params?: {} }
    'v1.profile.show': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'v1.auth.sessions.index': { paramsTuple?: []; params?: {} }
    'v1.profile.show': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'v1.account.store': { paramsTuple?: []; params?: {} }
    'v1.media_assets.store': { paramsTuple?: []; params?: {} }
    'v1.auth.access_tokens.store': { paramsTuple?: []; params?: {} }
    'v1.auth.refresh_tokens.store': { paramsTuple?: []; params?: {} }
    'v1.auth.forgot_password.store': { paramsTuple?: []; params?: {} }
    'v1.missionary.profile.store': { paramsTuple?: []; params?: {} }
  }
  DELETE: {
    'v1.auth.access_tokens.destroy': { paramsTuple?: []; params?: {} }
    'v1.auth.all_sessions.destroy': { paramsTuple?: []; params?: {} }
    'v1.auth.sessions.destroy': { paramsTuple: [ParamValue]; params: {'familyId': ParamValue} }
  }
  PATCH: {
    'v1.auth.reset_password.update': { paramsTuple?: []; params?: {} }
    'v1.profile.update': { paramsTuple?: []; params?: {} }
    'v1.account_password.update': { paramsTuple?: []; params?: {} }
    'v1.missionary.about.update': { paramsTuple?: []; params?: {} }
    'v1.missionary.profile.update': { paramsTuple?: []; params?: {} }
    'v1.missionary.identity.update': { paramsTuple?: []; params?: {} }
    'v1.missionary.work_address.update': { paramsTuple?: []; params?: {} }
    'v1.missionary.admin.about.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'v1.missionary.admin.profile.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'v1.missionary.admin.identity.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'v1.missionary.admin.work_address.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}
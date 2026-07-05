import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'v1.account.store': { paramsTuple?: []; params?: {} }
    'v1.auth.access_tokens.store': { paramsTuple?: []; params?: {} }
    'v1.auth.access_tokens.destroy': { paramsTuple?: []; params?: {} }
    'v1.auth.refresh_tokens.store': { paramsTuple?: []; params?: {} }
    'v1.auth.sessions.index': { paramsTuple?: []; params?: {} }
    'v1.auth.all_sessions.destroy': { paramsTuple?: []; params?: {} }
    'v1.auth.sessions.destroy': { paramsTuple?: [familyId: ParamValue]; params?: { familyId: ParamValue } }
    'v1.profile.show': { paramsTuple?: []; params?: {} }
    'v1.account_password.update': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'v1.profile.show': { paramsTuple?: []; params?: {} }
    'v1.auth.sessions.index': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'v1.profile.show': { paramsTuple?: []; params?: {} }
    'v1.auth.sessions.index': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'v1.account.store': { paramsTuple?: []; params?: {} }
    'v1.auth.access_tokens.store': { paramsTuple?: []; params?: {} }
    'v1.auth.refresh_tokens.store': { paramsTuple?: []; params?: {} }
  }
  DELETE: {
    'v1.auth.access_tokens.destroy': { paramsTuple?: []; params?: {} }
    'v1.auth.all_sessions.destroy': { paramsTuple?: []; params?: {} }
    'v1.auth.sessions.destroy': { paramsTuple?: [familyId: ParamValue]; params?: { familyId: ParamValue } }
  }
  PATCH: {
    'v1.account_password.update': { paramsTuple?: []; params?: {} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}
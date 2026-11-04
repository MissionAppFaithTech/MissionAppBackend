/**
 * Tipo de aparelho de uma sessão (ADR-0038), informado pelo cliente no header
 * `x-device-kind` — o BFF web deriva do user agent; apps nativos informam o
 * próprio. Só para exibição na listagem de sessões ("Computador", "Celular").
 */
export enum DeviceKind {
  DESKTOP = 'desktop',
  MOBILE = 'mobile',
  TABLET = 'tablet',
  UNKNOWN = 'unknown',
}

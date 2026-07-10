import type { HttpContext } from '@adonisjs/core/http'

/** Recorte de `HttpContext` para serviços que só precisam autenticar/gerar tokens */
export type AuthContext = HttpContext['auth']

/** Recorte de `HttpContext` para funções que só precisam ler dados da requisição. */
export type RequestContext = HttpContext['request']

import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { defineConfig } from '@adonisjs/core/http'

/**
 * A app key é usada para criptografar cookies, gerar URLs assinadas,
 * e pelo módulo de "encryption".
 *
 * O módulo de encryption falhará ao descriptografar dados se a chave for
 * perdida ou alterada. Portanto, é recomendado manter a app key segura.
 */
export const appKey = env.get('APP_KEY')

/**
 * A app URL pode ser usada em vários lugares onde você quer criar URLs
 * absolutas para sua aplicação. Por exemplo, ao enviar emails, imagens
 * devem usar URLs absolutas.
 */
export const appUrl = env.get('APP_URL')

/**
 * As configurações usadas pelo servidor HTTP
 */
export const http = defineConfig({
  /**
   * Gera um id único de requisição para cada requisição recebida.
   * Útil para correlacionar logs e debugar o fluxo de uma requisição.
   */
  generateRequestId: true,

  /**
   * Permite spoofing do método HTTP via o parâmetro de form/query "_method".
   * Isso permite que formulários HTML acessem rotas PUT/PATCH/DELETE
   * mesmo enviando via POST.
   */
  allowMethodSpoofing: false,

  /**
   * Habilitar async local storage permite acessar o contexto HTTP
   * de qualquer lugar dentro da aplicação.
   */
  useAsyncLocalStorage: false,

  /**
   * A configuração de redirect controla o comportamento de
   * response.redirect().back() e do encaminhamento da query string.
   */
  redirect: {
    /**
     * Quando habilitado, todos os redirects carregam automaticamente os
     * parâmetros da query string da requisição atual para o destino do
     * redirect. Use withQs(false) para desativar em um redirect específico.
     */
    forwardQueryString: true,
  },

  /**
   * Gerencia a configuração de cookies. As configurações do cookie de
   * session id são definidas no arquivo "config/session.ts".
   */
  cookie: {
    /**
     * Restringe o cookie a um domínio específico.
     * Deixe vazio para usar o host atual.
     */
    domain: '',

    /**
     * Restringe o cookie a um path de URL. '/' significa todas as rotas.
     */
    path: '/',

    /**
     * Tempo de vida padrão para cookies gerenciados pela camada HTTP.
     */
    maxAge: '2h',

    /**
     * Impede acesso via JavaScript ao cookie no browser.
     */
    httpOnly: true,

    /**
     * Envia cookies apenas via HTTPS em produção.
     */
    secure: app.inProduction,

    /**
     * Política cross-site para envio de cookies.
     */
    sameSite: 'lax',
  },
})

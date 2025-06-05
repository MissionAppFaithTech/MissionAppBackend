import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { defineConfig, stores } from '@adonisjs/session'

const sessionConfig = defineConfig({
  /**
   * Habilita ou desabilita o suporte a session globalmente.
   */
  enabled: true,

  /**
   * Nome do cookie que armazena o identificador da session.
   */
  cookieName: 'adonis-session',

  /**
   * Quando definido como true, o cookie de session id será deletado
   * assim que o usuário fechar o browser.
   */
  clearWithBrowser: false,

  /**
   * Define por quanto tempo manter os dados da session vivos sem
   * nenhuma atividade.
   */
  age: '2h',

  /**
   * Configuração do cookie de session e do
   * store de cookie.
   */
  cookie: {
    /**
     * Restringe o cookie a um path de URL. '/' significa todas as rotas.
     */
    path: '/',

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

  /**
   * O store a ser usado. Certifique-se de validar a variável de
   * ambiente para inferir o nome do store sem erros.
   */
  store: env.get('SESSION_DRIVER'),

  /**
   * Lista de stores configurados. Consulte a documentação para ver
   * a lista de stores disponíveis e suas configurações.
   */
  stores: {
    /**
     * Armazena os dados da session dentro de cookies criptografados.
     */
    cookie: stores.cookie(),

    /**
     * Armazena os dados da session no banco de dados configurado.
     */
    database: stores.database(),
  },
})

export default sessionConfig

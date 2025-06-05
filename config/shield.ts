import { defineConfig } from '@adonisjs/shield'

const shieldConfig = defineConfig({
  /**
   * Configure as políticas de CSP da sua app. Consulte a documentação
   * para saber mais.
   */
  csp: {
    /**
     * Habilita o header Content-Security-Policy.
     */
    enabled: false,

    /**
     * Diretivas de CSP por recurso.
     */
    directives: {},

    /**
     * Reporta violações sem bloquear recursos.
     */
    reportOnly: false,
  },

  /**
   * Configure as opções de proteção CSRF. Consulte a documentação
   * para saber mais.
   */
  csrf: {
    /**
     * Habilita a verificação de token CSRF para requisições que alteram estado.
     */
    enabled: false,

    /**
     * Padrões de rota excluídos das checagens de CSRF.
     * Útil para webhooks externos ou endpoints de API.
     */
    exceptRoutes: [],

    /**
     * Expõe um cookie XSRF-TOKEN criptografado para clientes HTTP do frontend.
     */
    enableXsrfCookie: true,

    /**
     * Métodos HTTP protegidos pela validação de CSRF.
     */
    methods: ['POST', 'PUT', 'PATCH', 'DELETE'],
  },

  /**
   * Controla como seu site pode ser embutido dentro de
   * iframes.
   */
  xFrame: {
    /**
     * Habilita o header X-Frame-Options.
     */
    enabled: true,

    /**
     * Bloqueia todas as tentativas de framing. Valor padrão é DENY.
     */
    action: 'DENY',
  },

  /**
   * Força o browser a sempre usar HTTPS.
   */
  hsts: {
    /**
     * Habilita o header Strict-Transport-Security.
     */
    enabled: true,

    /**
     * Duração da política HSTS lembrada pelos browsers.
     */
    maxAge: '180 days',
  },

  /**
   * Impede que browsers façam sniffing de content type e dependam apenas
   * do header content-type da resposta.
   */
  contentTypeSniffing: {
    /**
     * Habilita X-Content-Type-Options: nosniff.
     */
    enabled: true,
  },
})

export default shieldConfig

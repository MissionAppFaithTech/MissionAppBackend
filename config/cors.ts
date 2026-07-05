import app from '@adonisjs/core/services/app'
import { defineConfig } from '@adonisjs/cors'

/**
 * Opções de configuração para ajustar a política de CORS. As opções
 * a seguir estão documentadas no site oficial de documentação.
 *
 * https://docs.adonisjs.com/guides/security/cors
 */
const corsConfig = defineConfig({
  /**
   * Habilita ou desabilita o tratamento de CORS globalmente.
   */
  enabled: true,

  /**
   * Em desenvolvimento, permite qualquer origem para simplificar o setup
   * local front/backend. Em produção, mantém um allowlist explícito (vazio
   * por padrão, então nenhum acesso cross-origin do browser é permitido até
   * ser configurado).
   */
  origin: app.inDev ? true : [],

  /**
   * Métodos HTTP aceitos para requisições cross-origin.
   */
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],

  /**
   * Reflete os headers da requisição por padrão. Use um array de strings
   * para restringir os headers permitidos.
   */
  headers: true,

  /**
   * Headers de resposta expostos ao browser.
   */
  exposeHeaders: [],

  /**
   * Permite cookies/headers de autorização em requisições cross-origin.
   */
  credentials: true,

  /**
   * Cacheia a resposta de preflight do CORS por N segundos.
   */
  maxAge: 90,
})

export default corsConfig

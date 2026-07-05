import { defineConfig } from '@adonisjs/core/bodyparser'

const bodyParserConfig = defineConfig({
  /**
   * Faz parse do corpo da requisição para estes métodos HTTP.
   * Mantenha alinhado com os métodos que recebem payload nas suas rotas.
   */
  allowedMethods: ['POST', 'PUT', 'PATCH', 'DELETE'],

  /**
   * Configuração do parser de content-type
   * "application/x-www-form-urlencoded".
   */
  form: {
    /**
     * Normaliza valores de string vazia para null.
     */
    convertEmptyStringsToNull: true,

    /**
     * Content types tratados pelo parser de form.
     */
    types: ['application/x-www-form-urlencoded'],
  },

  /**
   * Configuração do parser de JSON.
   */
  json: {
    /**
     * Normaliza valores de string vazia para null.
     */
    convertEmptyStringsToNull: true,

    /**
     * Content types tratados pelo parser de JSON.
     */
    types: [
      'application/json',
      'application/json-patch+json',
      'application/vnd.api+json',
      'application/csp-report',
    ],
  },

  /**
   * Configuração do parser de content-type "multipart/form-data".
   * Uploads de arquivo são tratados pelo parser de multipart.
   */
  multipart: {
    /**
     * Processa automaticamente os arquivos enviados no diretório
     * tmp do sistema.
     */
    autoProcess: true,

    /**
     * Normaliza valores de string vazia para null.
     */
    convertEmptyStringsToNull: true,

    /**
     * Rotas onde o processamento de multipart é feito manualmente.
     */
    processManually: [],

    /**
     * Tamanho máximo aceito de payload para requisições multipart.
     */
    limit: '20mb',

    /**
     * Content types tratados pelo parser de multipart.
     */
    types: ['multipart/form-data'],
  },
})

export default bodyParserConfig

import env from '#start/env'
import { defineConfig, drivers } from '@adonisjs/core/encryption'

const encryptionConfig = defineConfig({
  /**
   * Driver de encryption padrão usado pela aplicação.
   */
  default: 'gcm',

  list: {
    gcm: drivers.aes256gcm({
      /**
       * Chaves usadas para encryption/decryption.
       * A primeira chave criptografa, todas as chaves são testadas
       * para descriptografar.
       */
      keys: [env.get('APP_KEY')],

      /**
       * Identificador estável para este driver.
       */
      id: 'gcm',
    }),
  },
})

export default encryptionConfig

/**
 * Inferência de tipos para a lista de encryptors configurados
 * na aplicação.
 */
declare module '@adonisjs/core/types' {
  export interface EncryptorsList extends InferEncryptors<typeof encryptionConfig> {}
}

import { defineConfig, drivers } from '@adonisjs/core/hash'

/**
 * Configuração de hashing.
 *
 * Este starter usa scrypt do Node.js por baixo dos panos.
 * Referência do Node.js: https://nodejs.org/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback
 */
const hashConfig = defineConfig({
  /**
   * Hasher padrão usado pela aplicação.
   */
  default: 'argon',

  list: {
    argon: drivers.argon2({
      variant: 'id',
      iterations: 3,
      memory: 65536,
      parallelism: 4,
      saltSize: 16,
      hashLength: 32,
    }),

    /**
     * Scrypt é memory-hard, o que torna ataques de força bruta mais caros.
     */
    scrypt: drivers.scrypt({
      /**
       * Fator de trabalho (alias no Node: N / cost).
       * Valores mais altos aumentam segurança e uso de CPU+memória.
       *
       * Guia de ajuste:
       * - Comece com 16384.
       * - Aumente gradualmente (por exemplo 32768) e faça benchmark da
       *   latência de login/signup.
       * - Mantenha valores práticos para a máquina mais lenta em produção.
       *
       * Restrição do Node: o valor deve ser uma potência de dois maior que 1.
       */
      cost: 16384,

      /**
       * Tamanho do bloco (alias no Node: r / blockSize).
       * Aumenta memória e CPU linearmente.
       *
       * Guia de ajuste:
       * - Mantenha 8 a menos que haja um motivo medido para mudar.
       * - Aumente só com dados de benchmark, pois o uso de memória cresce rápido.
       */
      blockSize: 8,

      /**
       * Paralelização (alias no Node: p / parallelization).
       * Controla quantas computações independentes são realizadas.
       *
       * Guia de ajuste:
       * - Mantenha 1 para a maioria das aplicações.
       * - Aumente só após teste de carga, se sua infraestrutura se beneficiar.
       */
      parallelization: 1,

      /**
       * Limite máximo de memória em bytes (alias no Node: maxmem / maxMemory).
       * O hashing lança erro se o uso estimado de memória ultrapassar esse limite.
       * O Node documenta a verificação como aproximadamente: 128 * N * r > maxmem.
       *
       * Guia de ajuste:
       * - Mantenha alinhado com suas escolhas de cost/blockSize.
       * - Aumente com cuidado em ambientes com restrição de memória.
       */
      maxMemory: 33554432,
    }),
  },
})

export default hashConfig

/**
 * Inferência de tipos para a lista de hashers configurados
 * na aplicação.
 */
declare module '@adonisjs/core/types' {
  export interface HashersList extends InferHashers<typeof hashConfig> {}
}

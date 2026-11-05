import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Busca de catálogos tolerante a erros (ADR-0042): `levenshtein_less_equal`, do
 * `fuzzystrmatch` (contrib do PostgreSQL), acha palavras com letras invertidas
 * ("batsita" → "batista"), que o trigrama pontua baixo.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.raw('CREATE EXTENSION IF NOT EXISTS fuzzystrmatch')
  }

  async down() {
    this.schema.raw('DROP EXTENSION IF EXISTS fuzzystrmatch')
  }
}

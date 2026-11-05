import { BaseSchema } from '@adonisjs/lucid/schema'

const TABLES = ['missionary_agencies', 'faith_communities'] as const

/**
 * Busca e deduplicação de catálogos no banco (ADR-0041).
 *
 * `catalog_normalize` é a única definição de "mesmo nome": sem acentos,
 * minúsculo, sem espaços nas pontas e com espaços internos únicos. As colunas
 * geradas guardam o nome e a cidade normalizados, e sobre elas ficam:
 * - GIN `gin_trgm_ops`: busca por trecho (`%termo%`), com 3+ caracteres;
 * - B-tree `text_pattern_ops`: busca por prefixo (termos de 2 caracteres não
 *   geram trigramas) e ordenação;
 * - único (nome, cidade): deduplicação garantida pelo banco, inclusive sob
 *   concorrência, no lugar do `translate()` sem índice.
 *
 * `unaccent()` é STABLE (depende do dicionário); a função usa o dicionário
 * qualificado (`public.unaccent`), que não muda, e por isso pode ser IMMUTABLE —
 * condição para coluna gerada e índice.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.raw('CREATE EXTENSION IF NOT EXISTS unaccent')
    this.schema.raw('CREATE EXTENSION IF NOT EXISTS pg_trgm')
    this.schema.raw(`
      CREATE OR REPLACE FUNCTION catalog_normalize(value text) RETURNS text
      LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
      AS $$
        SELECT lower(regexp_replace(btrim(public.unaccent('public.unaccent'::regdictionary, value)), '\\s+', ' ', 'g'))
      $$
    `)
    this.schema.raw(
      "COMMENT ON FUNCTION catalog_normalize(text) IS 'Normaliza nomes de catálogo para busca e deduplicação: sem acentos, minúsculo, espaços únicos (ADR-0041)'"
    )

    for (const table of TABLES) {
      this.schema.raw(`
        ALTER TABLE ${table}
          ADD COLUMN name_normalized text GENERATED ALWAYS AS (catalog_normalize(name)) STORED,
          ADD COLUMN city_normalized text GENERATED ALWAYS AS (coalesce(catalog_normalize(city), '')) STORED
      `)
      this.schema.raw(
        `COMMENT ON COLUMN ${table}.name_normalized IS 'Nome normalizado por catalog_normalize (gerado); usado na busca e na deduplicação'`
      )
      this.schema.raw(
        `COMMENT ON COLUMN ${table}.city_normalized IS 'Cidade normalizada por catalog_normalize, vazia quando não informada (gerada); parte da chave de deduplicação'`
      )
      this.schema.raw(
        `CREATE INDEX idx_${table}_name_normalized_trgm ON ${table} USING gin (name_normalized gin_trgm_ops)`
      )
      this.schema.raw(
        `CREATE INDEX idx_${table}_name_normalized_prefix ON ${table} (name_normalized text_pattern_ops)`
      )
      this.schema.raw(
        `CREATE UNIQUE INDEX uq_${table}_name_normalized_city_normalized ON ${table} (name_normalized, city_normalized)`
      )
      // NOTE: o B-tree simples em `name` não serve à busca normalizada
      this.schema.raw(`DROP INDEX IF EXISTS idx_${table}_name`)
    }
  }

  async down() {
    for (const table of TABLES) {
      this.schema.raw(`CREATE INDEX IF NOT EXISTS idx_${table}_name ON ${table} (name)`)
      this.schema.raw(`DROP INDEX IF EXISTS uq_${table}_name_normalized_city_normalized`)
      this.schema.raw(`DROP INDEX IF EXISTS idx_${table}_name_normalized_prefix`)
      this.schema.raw(`DROP INDEX IF EXISTS idx_${table}_name_normalized_trgm`)
      this.schema.raw(
        `ALTER TABLE ${table} DROP COLUMN IF EXISTS name_normalized, DROP COLUMN IF EXISTS city_normalized`
      )
    }
    this.schema.raw('DROP FUNCTION IF EXISTS catalog_normalize(text)')
    this.schema.raw('DROP EXTENSION IF EXISTS pg_trgm')
    this.schema.raw('DROP EXTENSION IF EXISTS unaccent')
  }
}

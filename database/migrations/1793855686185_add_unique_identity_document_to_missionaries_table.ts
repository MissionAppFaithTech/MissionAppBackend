import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * CPF e passaporte únicos: um documento pertence a um só missionário.
 *
 * O documento é salvo sempre normalizado (CPF só com dígitos, passaporte em
 * maiúsculas só com letras e números), garantido por check, para que
 * `123.456.789-09` e `12345678909` colidam no índice único. Não há validação de
 * dígito verificador: um passaporte estrangeiro pode ter 11 dígitos.
 */
export default class extends BaseSchema {
  protected tableName = 'missionaries'

  async up() {
    // NOTE: dados anteriores podem ter pontuação ou minúsculas; normaliza antes do check
    this.schema.raw(`
      UPDATE missionaries
      SET identity_document = CASE identity_type
        WHEN 'CPF' THEN regexp_replace(identity_document, '[^0-9]', '', 'g')
        ELSE regexp_replace(upper(identity_document), '[^A-Z0-9]', '', 'g')
      END
      WHERE identity_document IS NOT NULL
    `)

    this.schema.alterTable(this.tableName, (table) => {
      table.check(
        `identity_document IS NULL OR (identity_type = 'CPF' AND identity_document ~ '^[0-9]{11}$') OR (identity_type = 'PASSPORT' AND identity_document ~ '^[A-Z0-9]+$')`,
        [],
        'chk_missionaries_identity_document_format'
      )
    })

    // NOTE: parcial — perfis sem documento (convertidos de apoiador) não colidem
    this.schema.raw(
      'CREATE UNIQUE INDEX uq_missionaries_identity ON missionaries (identity_type, identity_document) WHERE identity_document IS NOT NULL'
    )
  }

  async down() {
    this.schema.raw('DROP INDEX IF EXISTS uq_missionaries_identity')
    this.schema.alterTable(this.tableName, (table) => {
      table.dropChecks(['chk_missionaries_identity_document_format'])
    })
  }
}

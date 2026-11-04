import { BaseSchema } from '@adonisjs/lucid/schema'

// NOTE: valores fixos (sem importar o enum) para o down restaurar exatamente a
// regra anterior; DDL não aceita parâmetros, então os valores vão como literais
const PREVIOUS_PURPOSES = ['IMPACT_PROJECT_COVER', 'POST_IMAGE']
const PURPOSES = [...PREVIOUS_PURPOSES, 'PROFILE_PICTURE']

const purposeCheck = (values: string[]) =>
  `purpose in (${values.map((value) => `'${value}'`).join(', ')})`

/**
 * Aceita a foto de perfil como finalidade de upload direto. O `.enum()` do
 * Knex criou a check `media_assets_purpose_check`, que é recriada com o novo
 * valor.
 */
export default class extends BaseSchema {
  protected tableName = 'media_assets'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropChecks(['media_assets_purpose_check'])
      table.check(purposeCheck(PURPOSES), [], 'media_assets_purpose_check')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropChecks(['media_assets_purpose_check'])
      table.check(purposeCheck(PREVIOUS_PURPOSES), [], 'media_assets_purpose_check')
    })
  }
}

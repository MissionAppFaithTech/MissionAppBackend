import { BaseSchema } from '@adonisjs/lucid/schema'
import { Gender } from '../../app/enums/user/gender.ts'
import { MembershipStatus } from '../../app/enums/user/membership_status.ts'
import { UserRole } from '../../app/enums/user/user_role.ts'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.comment(
        'Entidade central da plataforma. Representa apoiadores, missionários e administradores. Toda autenticação, auditoria e conteúdo parte desta tabela.'
      )
      table.uuid('id').primary().comment('Identificador único UUID v7')

      table.string('full_name').nullable().comment('Nome completo do usuário')
      table
        .string('username')
        .notNullable()
        .comment('Nome de usuário único para identificação pública na plataforma')
      table
        .string('phone_number')
        .notNullable()
        .comment(
          'Número de telefone pessoal privado do usuário; formato internacional E.164 (ex: +5511912345678)'
        )
      table
        .uuid('profile_picture_id')
        .nullable()
        .comment(
          'FK para media_assets; foto de perfil exibida no cabeçalho do perfil; null até primeiro upload'
        )
      table
        .string('biography', 200)
        .nullable()
        .comment('Minibiografia exibida no cabeçalho do perfil; max 200 chars')
      table.enum('gender', Object.values(Gender)).notNullable().comment('Gênero do usuário')

      table
        .enum('membership_status', Object.values(MembershipStatus))
        .notNullable()
        .defaultTo(MembershipStatus.PENDING_EMAIL)
        .comment('Status da conta: pendente de verificação de email, ativo, inativo ou suspenso')
      table
        .timestamp('actived_at', { precision: 3, useTz: true })
        .nullable()
        .comment(
          'Data e hora em que a conta foi ativada após verificação de email ou aprovação (missionário); null indica conta ainda não verificada ou aprovada'
        )

      table
        .enum('role', Object.values(UserRole))
        .notNullable()
        .defaultTo(UserRole.SUPPORTER)
        .comment('Papel do usuário na plataforma: ADMIN, MISSIONARY ou SUPPORTER')

      table
        .string('email')
        .notNullable()
        .comment('Endereço de email utilizado para login e notificações; único na plataforma')
      table
        .timestamp('email_verified_at', { precision: 3, useTz: true })
        .nullable()
        .comment(
          'Data de verificação do email; null indica email não confirmado; resetado para null quando o usuário troca de email'
        )
      table
        .string('password_hash')
        .notNullable()
        .comment('Hash Argon2id da senha; nunca armazenada em texto plano')

      table
        .string('recovery_password_token')
        .nullable()
        .comment('Token gerado para fluxo de redefinição de senha via email')
      table
        .timestamp('recovery_password_token_expires_at', { precision: 3, useTz: true })
        .nullable()
        .comment('Expiração do token de recuperação de senha; token inválido após este momento')

      table
        .string('pending_email')
        .nullable()
        .comment('Novo email aguardando confirmação antes de substituir o email atual')
      table
        .string('pending_email_token')
        .nullable()
        .comment('Token enviado para verificar o novo email pendente')
      table
        .timestamp('pending_email_token_expires_at', { precision: 3, useTz: true })
        .nullable()
        .comment('Expiração do token de verificação de email pendente')

      table
        .integer('followers_count')
        .unsigned()
        .notNullable()
        .defaultTo(0)
        .comment('Contador em cache do número de seguidores; atualizado via job')
      table
        .integer('following_count')
        .unsigned()
        .notNullable()
        .defaultTo(0)
        .comment('Contador em cache do número de usuários seguidos; atualizado via job')

      table
        .integer('login_attempts')
        .unsigned()
        .notNullable()
        .defaultTo(0)
        .comment(
          'Contador de tentativas de login falhadas consecutivas; base para bloqueio por força bruta'
        )
      table
        .timestamp('last_login', { precision: 3, useTz: true })
        .nullable()
        .comment(
          'Data e hora do último login bem-sucedido; útil para auditoria e detecção de inatividade; atualizado via job'
        )

      table
        .timestamp('created_at', { precision: 3, useTz: true })
        .notNullable()
        .comment('Data e hora de criação do registro')
      table
        .timestamp('updated_at', { precision: 3, useTz: true })
        .notNullable()
        .comment('Data e hora da última atualização do registro')
      table
        .timestamp('deleted_at', { precision: 3, useTz: true })
        .nullable()
        .comment('Data de exclusão lógica (soft delete); null indica conta ativa')

      table
        .foreign('profile_picture_id', 'fk_users_profile_picture_id')
        .references('id')
        .inTable('media_assets')
        .onDelete('SET NULL')
        .onUpdate('CASCADE')

      // garantias de unicidade de identificadores primários de acesso e recuperação
      table.unique(['username'], { indexName: 'uq_users_username' })
      table.unique(['email'], { indexName: 'uq_users_email' })
      table.unique(['recovery_password_token'], { indexName: 'uq_users_recovery_password_token' })

      table.check('?? >= 0', ['followers_count'], 'chk_users_followers_count_non_negative')
      table.check('?? >= 0', ['following_count'], 'chk_users_following_count_non_negative')
      table.check('?? >= 0', ['login_attempts'], 'chk_users_login_attempts_non_negative')

      // painel admin filtra por membership_status e role; busca de login usa email
      table.index(['membership_status'], 'idx_users_membership_status')
      table.index(['role'], 'idx_users_role')
      table.index(['email'], 'idx_users_email')
      // lookup do token durante verificação de email pendente
      table.index(['pending_email_token'], 'idx_users_pending_email_token')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

/*
|--------------------------------------------------------------------------
| Serviço de variáveis de ambiente
|--------------------------------------------------------------------------
|
| O método `Env.create` cria uma instância do serviço Env. O serviço
| valida as variáveis de ambiente e também converte os valores
| para tipos de dados do JavaScript.
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  // Node
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string(),

  // App
  APP_KEY: Env.schema.secret(),
  APP_URL: Env.schema.string({ format: 'url', tld: false }),

  // Session
  SESSION_DRIVER: Env.schema.enum(['cookie', 'memory', 'database'] as const),

  /*
  |----------------------------------------------------------
  | Variáveis de configuração da conexão com o banco de dados
  |----------------------------------------------------------
  */
  DB_HOST: Env.schema.string({ format: 'host' }),
  DB_PORT: Env.schema.number(),
  DB_USER: Env.schema.string(),
  DB_PASSWORD: Env.schema.string.optional(),
  DB_DATABASE: Env.schema.string(),

  REDIS_HOST: Env.schema.string({ format: 'host' }),
  REDIS_PORT: Env.schema.number(),
  REDIS_PASSWORD: Env.schema.string(),
  // NOTE: banco lógico do Dragonfly (0-15). O .env.test usa outro banco para
  // que workers/cache de desenvolvimento não disputem filas e chaves dos testes.
  REDIS_DB: Env.schema.number.optional(),

  /*
  |----------------------------------------------------------
  | Storage de objetos (@adonisjs/drive) — ADR-0008 e ADR-0013
  |----------------------------------------------------------
  */
  DRIVE_DISK: Env.schema.enum(['s3_public', 's3_private', 'r2_public', 'r2_private'] as const),

  S3_ENDPOINT: Env.schema.string({ format: 'url', tld: false }),
  S3_REGION: Env.schema.string(),
  S3_PUBLIC_BUCKET: Env.schema.string(),
  S3_PRIVATE_BUCKET: Env.schema.string(),
  S3_ACCESS_KEY: Env.schema.string(),
  S3_SECRET_KEY: Env.schema.string(),

  // NOTE: opcionais — só são exigidas no boot quando DRIVE_DISK aponta para
  // um disco R2 (ver config/drive.ts).
  R2_ENDPOINT: Env.schema.string.optional({ format: 'url', tld: false }),
  R2_ACCESS_KEY: Env.schema.string.optional(),
  R2_SECRET_KEY: Env.schema.string.optional(),
  R2_PUBLIC_BUCKET: Env.schema.string.optional(),
  R2_PRIVATE_BUCKET: Env.schema.string.optional(),
  R2_PUBLIC_URL: Env.schema.string.optional({ format: 'url', tld: false }),

  ELASTIC_NODE: Env.schema.string(),

  JWT_SECRET: Env.schema.string(),

  JWT_ACCESS_EXPIRES_IN: Env.schema.string(),

  // NOTE: TTL do refresh token por tipo de cliente — sliding window
  // recalculado a cada rotação. Mobile fica mais tempo (ADR-0023): app usado
  // com frequência nunca desautentica; só pede login após período real de
  // inatividade.
  JWT_REFRESH_EXPIRES_IN_WEB: Env.schema.string(),
  JWT_REFRESH_EXPIRES_IN_MOBILE: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for configuring the mail package
  |----------------------------------------------------------
  */
  MAIL_MAILER: Env.schema.enum(['resend'] as const),
  MAIL_FROM_NAME: Env.schema.string(),
  MAIL_FROM_ADDRESS: Env.schema.string(),
  RESEND_API_KEY: Env.schema.string(),

  // NOTE: base do BFF (Next.js), usada para montar links de email
  // transacional (ex: recuperação de senha) — ver ADR-0023.
  FRONTEND_URL: Env.schema.string({ format: 'url', tld: false }),
})

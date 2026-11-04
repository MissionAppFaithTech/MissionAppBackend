/**
 * Lê uma variável de ambiente opcional que passa a ser obrigatória em um
 * contexto específico (ex.: credenciais R2 quando `DRIVE_DISK=r2_*`). Falha
 * cedo, no boot, em vez de deixar o erro surgir só na primeira operação de
 * storage.
 *
 * @param key Nome da variável, usado na mensagem de erro.
 * @param value Valor lido do `env` (pode estar ausente).
 * @param required Se a variável é obrigatória no contexto atual.
 * @returns O valor, ou string vazia quando ausente e não obrigatória.
 * @throws Error quando `required` é verdadeiro e o valor está ausente ou vazio.
 * @example
 * requireEnvWhen('R2_BUCKET', env.get('R2_BUCKET'), usesR2) // 'missionapp-prod-public-assets'
 */
export function requireEnvWhen(key: string, value: string | undefined, required: boolean): string {
  if (!value && required) {
    throw new Error(`Missing environment variable "${key}"`)
  }

  return value ?? ''
}

/**
 * Policy S3 que libera leitura anônima (`s3:GetObject`) de todos os objetos de
 * um bucket — a forma de tornar um bucket `public` (ADR-0013) sem depender de
 * ACL por objeto, que o MinIO ignora e o R2 não implementa.
 *
 * @param bucket Nome do bucket público.
 * @returns Policy serializada em JSON, pronta para `PutBucketPolicy`.
 * @example
 * buildPublicReadBucketPolicy('missionapp-dev-public-assets')
 */
export function buildPublicReadBucketPolicy(bucket: string): string {
  return JSON.stringify({
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: { AWS: ['*'] },
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${bucket}/*`],
      },
    ],
  })
}

/** Discos públicos do Drive, onde ficam as mídias exibidas no app (ADR-0013). */
export type PublicMediaDisk = 's3_public' | 'r2_public'

/**
 * Disco público usado pelas mídias enviadas pelos usuários (capas, imagens de
 * post): o público do mesmo provedor de `DRIVE_DISK`. Mesmo com `DRIVE_DISK`
 * apontando para um disco privado, mídia exibida no app vai para o público.
 *
 * @param driveDisk Valor de `DRIVE_DISK`.
 * @returns `r2_public` quando o provedor padrão é o R2, senão `s3_public`.
 * @example
 * publicMediaDisk('s3_private') // 's3_public'
 */
export function publicMediaDisk(driveDisk: string): PublicMediaDisk {
  return driveDisk.startsWith('r2_') ? 'r2_public' : 's3_public'
}

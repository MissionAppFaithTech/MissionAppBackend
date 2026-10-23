import { buildPublicReadBucketPolicy } from '#utils/storage'
import type { S3Client } from '@aws-sdk/client-s3'
import {
  CreateBucketCommand,
  HeadBucketCommand,
  NotFound,
  PutBucketPolicyCommand,
} from '@aws-sdk/client-s3'

type EnsureBucketsPayload = {
  publicBucket: string
  privateBucket: string
}

/**
 * Provisiona os buckets do storage S3-compatível (ADR-0008/ADR-0013): cria os
 * que não existem e aplica leitura anônima ao bucket público. Idempotente —
 * pode rodar a cada `just start` sem efeitos colaterais.
 */
export class EnsureBucketsService {
  #client: S3Client

  constructor(client: S3Client) {
    this.#client = client
  }

  /**
   * Garante a existência dos buckets público e privado e a policy de leitura
   * pública. O bucket privado nunca recebe policy — acesso só via URL assinada.
   *
   * @param payload Nomes dos buckets público e privado.
   * @returns Nomes dos buckets criados nesta execução (vazio se já existiam).
   * @example
   * await new EnsureBucketsService(client).execute({
   *   publicBucket: 'missionapp-dev-public-assets',
   *   privateBucket: 'missionapp-dev-private-docs',
   * }) // ['missionapp-dev-public-assets', 'missionapp-dev-private-docs']
   */
  async execute(payload: EnsureBucketsPayload): Promise<string[]> {
    if (payload.publicBucket === payload.privateBucket) {
      throw new Error('Os buckets público e privado devem ser diferentes')
    }

    const created: string[] = []

    for (const bucket of [payload.publicBucket, payload.privateBucket]) {
      if (!(await this.#exists(bucket))) {
        await this.#client.send(new CreateBucketCommand({ Bucket: bucket }))
        created.push(bucket)
      }
    }

    await this.#client.send(
      new PutBucketPolicyCommand({
        Bucket: payload.publicBucket,
        Policy: buildPublicReadBucketPolicy(payload.publicBucket),
      })
    )

    return created
  }

  async #exists(bucket: string): Promise<boolean> {
    try {
      await this.#client.send(new HeadBucketCommand({ Bucket: bucket }))
      return true
    } catch (error) {
      if (error instanceof NotFound) {
        return false
      }
      throw error
    }
  }
}

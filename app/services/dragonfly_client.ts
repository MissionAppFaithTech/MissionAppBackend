import { redisConnection } from '#config/redis'
import { Redis } from 'ioredis'

let client: Redis | undefined

// TODO: Criar uma classe dedicada para este serviço

/**
 * Conexão ioredis compartilhada com o DragonflyDB, para operações não
 * bloqueantes (GET/SET/INCR/EXISTS). Instanciada uma única vez por processo —
 * não usar para BullMQ, que exige sua própria conexão com
 * `maxRetriesPerRequest: null` (ver `#config/redis`).
 */
export function dragonflyClient(): Redis {
  client ??= new Redis(redisConnection)
  return client
}

/**
 * Fecha a conexão compartilhada — necessário em processos que devem encerrar
 * sozinhos (ex: suíte de testes com forceExit: false), já que uma conexão
 * ioredis aberta mantém o event loop vivo indefinidamente.
 */
export async function closeDragonflyClient(): Promise<void> {
  if (!client) return
  await client.quit()
  client = undefined
}

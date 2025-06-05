import env from '#start/env'
import type { Client } from '@elastic/elasticsearch'

// NOTE: `ClientOptions` não resolve como import nomeado sob a resolução de
// módulo deste projeto (`moduleResolution: NodeNext` + pacote CJS aninhando
// re-exports sem extensão) — deriva o tipo direto do construtor do `Client`,
// mesmo tipo, sem depender do re-export quebrado.
export const elasticsearchConnection: ConstructorParameters<typeof Client>[0] = {
  node: env.get('ELASTIC_NODE'),
}

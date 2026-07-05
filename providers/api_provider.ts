import { HttpContext } from '@adonisjs/core/http'
import { BaseSerializer } from '@adonisjs/core/transformers'
import { type SimplePaginatorMetaKeys } from '@adonisjs/lucid/types/querybuilder'

/**
 * Serializer customizado para respostas de API que garante estrutura JSON
 * consistente em todos os endpoints. Envolve os dados da resposta em uma
 * propriedade 'data' e trata os metadados de paginação dos resultados de
 * query do Lucid ORM.
 */
class ApiSerializer extends BaseSerializer<{
  Wrap: 'data'
  PaginationMetaData: SimplePaginatorMetaKeys
}> {
  /**
   * Envolve todos os dados serializados sob esta chave no objeto de resposta.
   * Exemplo: { data: [...] } em vez de retornar arrays/objetos crus
   */
  wrap: 'data' = 'data'

  /**
   * Valida e define a estrutura de metadados de paginação para respostas
   * paginadas. Garante que as informações de paginação das queries do Lucid
   * estejam formatadas corretamente.
   *
   * @throws Error se os metadados não corresponderem à estrutura de
   * paginação do Lucid
   */
  definePaginationMetaData(metaData: unknown): SimplePaginatorMetaKeys {
    if (!this.isLucidPaginatorMetaData(metaData)) {
      throw new Error(
        'Invalid pagination metadata. Expected metadata to contain Lucid pagination keys'
      )
    }
    return metaData
  }
}

/**
 * Instância única de ApiSerializer usada em toda a aplicação
 */
const serializer = new ApiSerializer()
const serialize = Object.assign(
  function (this: HttpContext, ...[data, resolver]: Parameters<ApiSerializer['serialize']>) {
    return serializer.serialize(data, resolver ?? this.containerResolver)
  },
  {
    withoutWrapping(
      this: HttpContext,
      ...[data, resolver]: Parameters<ApiSerializer['serializeWithoutWrapping']>
    ) {
      return serializer.serializeWithoutWrapping(data, resolver ?? this.containerResolver)
    },
  }
) as ApiSerializer['serialize'] & { withoutWrapping: ApiSerializer['serializeWithoutWrapping'] }

/**
 * Adiciona o método serialize a todas as instâncias de HttpContext.
 * Uso em controllers: return ctx.serialize(data)
 * Isso garante que todas as respostas de API sigam a mesma estrutura com
 * o wrapping de data.
 */
HttpContext.instanceProperty('serialize', serialize)

/**
 * Module augmentation para adicionar o método serialize ao HttpContext.
 * Isso permite que controllers usem ctx.serialize() para respostas de
 * API consistentes.
 */
declare module '@adonisjs/core/http' {
  export interface HttpContext {
    serialize: typeof serialize
  }
}

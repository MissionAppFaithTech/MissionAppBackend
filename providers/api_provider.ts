import { HttpContext } from '@adonisjs/core/http'
import type { BaseTransformer, Item, Paginator } from '@adonisjs/core/transformers'
import { BaseSerializer } from '@adonisjs/core/transformers'
import type { ExtractTransformerVariants } from '@adonisjs/core/types/transformers'
import type { SimplePaginatorMetaKeys } from '@adonisjs/lucid/types/querybuilder'

/**
 * Classe concreta (não abstrata) de um transformer — restringe `T` nos
 * sugars `serialize.transform`/`serialize.paginate` a subclasses reais de
 * `BaseTransformer`, nunca a base abstrata em si. O construtor concreto
 * (`new`, não `abstract new`) é exigido pelas assinaturas estáticas
 * polimórficas (`this: Self`) de `transform`/`paginate` na lib.
 */
type TransformerClass = { new (resource: any, ...rest: any[]): BaseTransformer<any> } & Pick<
  typeof BaseTransformer,
  'transform' | 'paginate'
>

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

/**
 * Resolver do container associado à request atual (`ctx.containerResolver`)
 * — usado como fallback quando nenhum resolver explícito é passado.
 */
type Resolver = HttpContext['containerResolver']

/**
 * Formato mínimo de um paginator (Lucid `SimplePaginator`/`ModelPaginator`)
 * aceito por `serialize.paginate` — qualquer objeto com `all()`/`getMeta()`
 * serve, sem acoplar ao tipo concreto do Lucid.
 */
type LucidPaginatorLike<Row> = { all(): Row[]; getMeta(): SimplePaginatorMetaKeys }

/**
 * Função exposta em `ctx.serialize` (via `HttpContext.instanceProperty`) —
 * embrulha `ApiSerializer.serialize` sob a chave `data`. `Object.assign`
 * anexa `withoutWrapping`/`transform`/`paginate` como propriedades próprias
 * desta function antes de virar instance property: o construtor do
 * `Macroable` (base do `HttpContext`) itera `Object.keys(value)` e faz bind
 * de cada uma pro `ctx` da request atual — sem isso elas não seriam
 * descobertas nem bindadas, e quebrariam ao acessar `this.containerResolver`
 * depois de desestruturadas (`const { serialize } = ctx`).
 *
 * @param data Item/Collection/Paginator (já produzido por
 *             `Transformer.transform()`/`.paginate()`) ou valor genérico a
 *             serializar. Ver overloads de `ApiSerializer['serialize']`.
 * @param resolver Resolver do container a usar. Omitido usa
 *                  `ctx.containerResolver` da request atual.
 * @returns Resultado serializado, embrulhado em `{ data: ... }`.
 * @example
 * return serialize(UserTransformer.transform(user))
 */
const serialize = Object.assign(
  function (this: HttpContext, ...[data, resolver]: Parameters<ApiSerializer['serialize']>) {
    return serializer.serialize(data, resolver ?? this.containerResolver)
  },
  {
    /**
     * Variante de `serialize` sem o envelope `{ data: ... }` — mesma
     * pipeline de resolução (`ApiSerializer.serializeWithoutWrapping`),
     * só pula o wrapping final.
     *
     * @param data Item/Collection/Paginator ou valor genérico a serializar.
     * @param resolver Resolver do container a usar. Omitido usa
     *                  `ctx.containerResolver` da request atual.
     * @returns Resultado serializado, sem envelope.
     * @example
     * return serialize.withoutWrapping(tokens) // → { accessToken, refreshToken }
     */
    withoutWrapping(
      this: HttpContext,
      ...[data, resolver]: Parameters<ApiSerializer['serializeWithoutWrapping']>
    ) {
      return serializer.serializeWithoutWrapping(data, resolver ?? this.containerResolver)
    },

    /**
     * Serializa um único recurso a partir do transformer e do resource
     * crus, com seleção opcional de variant — evita a chamada manual
     * `Transformer.transform(resource).useVariant(variant)`.
     *
     * @param Transformer Classe do transformer (ex: `UserTransformer`).
     * @param resource Resource cru esperado pelo construtor do transformer.
     * @param variant Nome do método variant a usar (autocompletado/validado
     *                pelo TS a partir dos métodos próprios do transformer).
     *                Omitido usa o variant padrão (`toObject`).
     * @example
     * serialize.transform(UserTransformer, user, 'toPublic')
     */
    transform<T extends TransformerClass, V extends ExtractTransformerVariants<InstanceType<T>>>(
      this: HttpContext,
      Transformer: T,
      resource: ConstructorParameters<T>[0],
      variant?: V,
      resolver?: Resolver
    ) {
      // `this: Self` polimórfico + rest-type condicional de `transform()`
      // não resolvem genericamente contra `T` (limitação do TS com
      // overloads + conditional types sobre type params genéricos) — cast
      // interno pro tipo concreto da base pra chamar, depois recupera o
      // tipo específico da subclasse pro `.useVariant()` seguir type-safe.
      const item = (Transformer as unknown as TransformerClass).transform(resource) as Item<
        InstanceType<T>,
        1,
        'toObject'
      >

      // Cast na chamada: unir `Item<..., 'toObject'>` e `Item<..., V>` no
      // ternário faz o TS recursar demais dentro do `serialize()` sobrecarregado
      // da lib (`UnpackAsTopLevelItem` etc). Os dois lados já são `Item` válido
      // e tipado — só a instanciação genérica do overload explode, não a
      // segurança de tipo real.
      const resolved = (variant ? item.useVariant(variant) : item) as Parameters<
        ApiSerializer['serialize']
      >[0]

      return serializer.serialize(resolved, resolver ?? this.containerResolver)
    },

    /**
     * Serializa um paginator do Lucid a partir do transformer, com seleção
     * opcional de variant — evita a chamada manual `Transformer.paginate(
     * paginator.all(), paginator.getMeta()).useVariant(variant)`.
     *
     * @param Transformer Classe do transformer (ex: `UserTransformer`).
     * @param paginator Paginator do Lucid (`SimplePaginator`/
     *                  `ModelPaginator`) já resolvido pelo controller —
     *                  esta função não executa query, só lê `all()`/`getMeta()`.
     * @param variant Nome do método variant a usar. Omitido usa o padrão
     *                (`toObject`).
     * @example
     * const users = await User.query().paginate(page, perPage)
     * serialize.paginate(UserTransformer, users, 'toPublic')
     */
    paginate<T extends TransformerClass, V extends ExtractTransformerVariants<InstanceType<T>>>(
      this: HttpContext,
      Transformer: T,
      paginator: LucidPaginatorLike<ConstructorParameters<T>[0]>,
      variant?: V,
      resolver?: Resolver
    ) {
      // Mesmo motivo do cast em `transform` acima.
      const result = (Transformer as unknown as TransformerClass).paginate(
        paginator.all(),
        paginator.getMeta()
      ) as Paginator<InstanceType<T>, 1, 'toObject'>
      // Mesmo motivo do cast em `transform` acima.

      const resolved = (variant ? result.useVariant(variant) : result) as Parameters<
        ApiSerializer['serialize']
      >[0]

      return serializer.serialize(resolved, resolver ?? this.containerResolver)
    },
  }
) as ApiSerializer['serialize'] & {
  withoutWrapping: ApiSerializer['serializeWithoutWrapping']
  transform: <T extends TransformerClass, V extends ExtractTransformerVariants<InstanceType<T>>>(
    this: HttpContext,
    Transformer: T,
    resource: ConstructorParameters<T>[0],
    variant?: V,
    resolver?: Resolver
  ) => ReturnType<ApiSerializer['serialize']>
  paginate: <T extends TransformerClass, V extends ExtractTransformerVariants<InstanceType<T>>>(
    this: HttpContext,
    Transformer: T,
    paginator: LucidPaginatorLike<ConstructorParameters<T>[0]>,
    variant?: V,
    resolver?: Resolver
  ) => ReturnType<ApiSerializer['serialize']>
}

/**
 * Adiciona o método serialize a todas as instâncias de HttpContext.
 * Uso em controllers: return ctx.serialize(data)
 * Isso garante que todas as respostas de API sigam a mesma estrutura com
 * o wrapping de data.
 */
HttpContext.instanceProperty('serialize', serialize)

/**
 * Module augmentation para adicionar o método serialize ao HttpContext.
 * Isso permite que controllers usem ctx.serialize() e sua respectiva tipagem
 * para respostas de API consistentes.
 */
declare module '@adonisjs/core/http' {
  export interface HttpContext {
    serialize: typeof serialize
  }
}

import { UserRole } from '#enums/user/user_role'
import type User from '#models/user'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

/**
 * Peças comuns aos dois catálogos (agências missionárias e comunidades de fé),
 * para que os services não repitam a mesma lógica.
 */

/** Endereço/contato opcionais de um item de catálogo. */
export type CatalogAddress = {
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
  website?: string
}

/** Só os campos de endereço do payload (o resto fica com cada service). */
export function catalogAddressOf(payload: CatalogAddress): CatalogAddress {
  return {
    addressLine1: payload.addressLine1,
    addressLine2: payload.addressLine2,
    city: payload.city,
    state: payload.state,
    country: payload.country,
    postalCode: payload.postalCode,
    website: payload.website,
  }
}

/** Quem cadastrou o item, ou um administrador, pode alterá-lo ou removê-lo. */
export function canManageCatalog(actor: User, ownerId: string | null): boolean {
  return actor.role === UserRole.ADMIN || (ownerId !== null && ownerId === actor.id)
}

/**
 * Roda `work` na transação recebida ou, sem ela, numa transação própria — o
 * cadastro de missionário cria o item dentro da transação da conta.
 */
export function withCatalogTransaction<Result>(
  trx: TransactionClientContract | undefined,
  work: (trx: TransactionClientContract) => Promise<Result>
): Promise<Result> {
  return trx ? work(trx) : db.transaction(work)
}

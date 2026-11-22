import type Missionary from '#models/missionary'
import { mediaAssetUrl } from '#utils/media_asset_url'
import { BaseTransformer } from '@adonisjs/core/transformers'

/**
 * Perfil público de missionário (ADR-0036): só os campos aprovados pelo produto.
 * Sem nada do visitante (ex.: se ele segue o perfil): a resposta é cacheada e
 * compartilhada no BFF.
 * Nunca expõe documento de identidade, e-mail/telefone da conta, status,
 * dados financeiros nem CEP/bairro do local de atuação.
 */
export default class PublicMissionaryProfileTransformer extends BaseTransformer<Missionary> {
  constructor(
    resource: Missionary,
    private counters: { followersCount: number; followingCount: number }
  ) {
    super(resource)
  }

  toObject() {
    const missionary = this.resource
    const { user, agency, faithCommunity, workAddresses: address } = missionary

    return {
      // NOTE: id do usuário (não do perfil de missionário) — alvo de `users/:id/follow`
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      biography: user.biography ?? null,
      profilePictureUrl: user.profilePicture ? mediaAssetUrl(user.profilePicture) : null,
      role: user.role,
      missionaryAgency: agency ? { id: agency.id, name: agency.name } : null,
      faithCommunity: faithCommunity ? { id: faithCommunity.id, name: faithCommunity.name } : null,
      about: {
        aboutMe: missionary.aboutMe ?? null,
        missionStorySummary: missionary.missionStorySummary ?? null,
        originLocation: missionary.originLocation ?? null,
        prayerRequest: missionary.prayerRequest ?? null,
        lifeVerse: missionary.lifeVerse ?? null,
      },
      workLocation: address
        ? { city: address.city, state: address.state, country: address.country }
        : null,
      followersCount: this.counters.followersCount,
      followingCount: this.counters.followingCount,
      contact: {
        publicEmail: missionary.publicEmail ?? null,
        publicPhone: missionary.publicPhone ?? null,
        publicPhoneIsWhatsapp: missionary.publicPhoneIsWhatsapp ?? false,
      },
    }
  }
}

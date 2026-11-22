import type { CounterOverlay } from '#types/services/shared/counter_buffer'

/**
 * Engajamento de uma página de posts para quem está vendo: quais ele curtiu e
 * os deltas de curtidas ainda não aplicados no banco.
 */
export type PostEngagement = { likedPostIds: Set<string>; likesOverlay: CounterOverlay }

/** Estado do follow entre quem está vendo e um perfil. */
export type FollowState = { following: boolean; followersCount: number }

/** Lado da relação exibido numa lista de follows. */
export type FollowSide = 'follower' | 'following'

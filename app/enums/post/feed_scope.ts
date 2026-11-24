export enum FeedScope {
  /** Postagens próprias (missionário) e de quem o usuário segue. */
  ALL = 'all',
  /** Só as de quem o usuário segue. */
  FOLLOWING = 'following',
  /** Só as próprias — vazio para quem não é missionário. */
  OWN = 'own',
}

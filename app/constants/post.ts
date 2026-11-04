/**
 * Máximo de imagens mantidas por missionário somando todas as suas
 * postagens (RF 8.1). Ultrapassar exige confirmação explícita (RF 8.2): só
 * então as imagens mais antigas são desvinculadas dos posts e seus arquivos
 * removidos do storage (o texto do post permanece).
 */
export const POST_IMAGES_PER_MISSIONARY_LIMIT = 50

/** Máximo de imagens em uma única postagem (RF 8.1). */
export const POST_IMAGES_PER_POST_LIMIT = 3

/** Quantidade de caracteres do conteúdo aproveitada na parte legível do slug. */
export const POST_SLUG_CONTENT_LENGTH = 60

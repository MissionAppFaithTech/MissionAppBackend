import { isSupportedVideoUrl, toVideoEmbedUrl } from '#utils/video_embed'
import { test } from '@japa/runner'

const YOUTUBE = 'https://www.youtube.com/embed/dQw4w9WgXcQ'

test.group('toVideoEmbedUrl', () => {
  test('converte link do YouTube ({url})')
    .with([
      { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      { url: 'https://youtube.com/watch?feature=share&v=dQw4w9WgXcQ&t=10' },
      { url: 'https://m.youtube.com/watch?v=dQw4w9WgXcQ' },
      { url: 'https://youtu.be/dQw4w9WgXcQ?si=abc' },
      { url: 'https://www.youtube.com/shorts/dQw4w9WgXcQ' },
      { url: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
      { url: 'https://www.youtube.com/live/dQw4w9WgXcQ?feature=share' },
      { url: '  http://youtu.be/dQw4w9WgXcQ  ' },
    ])
    .run(({ assert }, { url }) => {
      assert.equal(toVideoEmbedUrl(url), YOUTUBE)
    })

  test('converte link do Vimeo ({url})')
    .with([
      { url: 'https://vimeo.com/76979871' },
      { url: 'https://www.vimeo.com/76979871?share=copy' },
      { url: 'https://player.vimeo.com/video/76979871' },
    ])
    .run(({ assert }, { url }) => {
      assert.equal(toVideoEmbedUrl(url), 'https://player.vimeo.com/video/76979871')
    })

  test('converte link de canal, grupo e showcase do Vimeo ({url})')
    .with([
      { url: 'https://vimeo.com/channels/staffpicks/76979871' },
      { url: 'https://vimeo.com/groups/motion/videos/76979871' },
      { url: 'https://vimeo.com/showcase/9876543/video/76979871' },
    ])
    .run(({ assert }, { url }) => {
      assert.equal(toVideoEmbedUrl(url), 'https://player.vimeo.com/video/76979871')
    })

  test('mantém o código de acesso de vídeo não listado do Vimeo ({url})')
    .with([
      { url: 'https://vimeo.com/76979871/8272103f6e' },
      { url: 'https://vimeo.com/76979871/8272103F6E?share=copy' },
      { url: 'https://player.vimeo.com/video/76979871?h=8272103f6e&badge=0' },
    ])
    .run(({ assert }, { url }) => {
      assert.equal(toVideoEmbedUrl(url), 'https://player.vimeo.com/video/76979871?h=8272103f6e')
    })

  test('recusa link que não é de vídeo suportado ({url})')
    .with([
      { url: 'https://www.tiktok.com/@user/video/123' },
      { url: 'https://www.instagram.com/reel/abc/' },
      { url: 'https://www.youtube.com/watch?v=curto' },
      { url: 'https://www.youtube.com/channel/UC123' },
      { url: 'https://vimeo.com/canal/abc' },
      { url: 'https://vimeo.com/76979871/nao-hex' },
      { url: 'https://vimeo.com/channels/staffpicks' },
      { url: 'https://evil.com/?u=https://youtu.be/dQw4w9WgXcQ' },
      { url: 'ftp://youtu.be/dQw4w9WgXcQ' },
      { url: 'não é link' },
      { url: '' },
    ])
    .run(({ assert }, { url }) => {
      assert.isNull(toVideoEmbedUrl(url))
      assert.isFalse(isSupportedVideoUrl(url))
    })
})

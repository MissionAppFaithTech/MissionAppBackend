import type { UserConfig } from '@commitlint/types'

const Configuration = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [2, 'always', 512],
    'body-leading-blank': [2, 'always'],
    'scope-case': [1, 'always', 'lower-case'],
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert'],
    ],
  },
} as const satisfies UserConfig

export default Configuration

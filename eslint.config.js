// @ts-nocheck -- @adonisjs/eslint-config ships no type declarations
import { configApp } from '@adonisjs/eslint-config'
import { importX } from 'eslint-plugin-import-x'

export default [
  ...configApp(),
  {
    // `client/registry/**` é gerado pelo hook `generateRegistry()` do Tuyau
    // (adonisrc.ts) — o `*.d.ts` do ignore list base do @adonisjs/eslint-config
    // só cobre profundidade raiz, não pega arquivos gerados aninhados.
    ignores: ['client/registry/**'],
    plugins: {
      'import-x': importX,
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'separate-type-imports',
        },
      ],
      // `consistent-type-imports` só cobra marcar imports type-only; não
      // proíbe o estilo inline (`type Foo` dentro das chaves) — essa regra
      // força sempre um `import type { ... }` em statement separado.
      'import-x/consistent-type-specifier-style': ['error', 'prefer-top-level'],
    },
  },
]

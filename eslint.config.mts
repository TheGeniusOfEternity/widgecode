// eslint.config.mts
import * as js from '@eslint/js'
import tseslint from 'typescript-eslint'
import * as pluginVue from 'eslint-plugin-vue'
import * as globals from 'globals'
import * as vueParser from 'vue-eslint-parser'

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '*.config.ts',
      '*.config.js',
      '.vscode/**',
      'public/**'
    ]
  },

  js.configs.recommended,

  ...tseslint.configs.recommended.map(conf => ({
    ...conf,
    files: ['**/*.{ts,tsx,vue}']
  })),

  ...pluginVue.configs['flat/recommended'].map(conf => ({
    ...conf,
    files: ['**/*.vue']
  })),

  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        sourceType: 'module',
        ecmaVersion: 'latest',
        extraFileExtensions: ['.vue'],
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    rules: {
      'vue/no-reserved-component-names': 'off',
      'vue/multi-word-component-names': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      'object-curly-spacing': ['error', 'always'],
    }
  },

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.app.json',
        sourceType: 'module',
        ecmaVersion: 'latest',
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    rules: {
      '@typescript-eslint/no-unnecessary-type-parameters': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      'object-curly-spacing': ['error', 'always'],
    }
  },

  {
    files: ['vite.config.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.node.json',
        sourceType: 'module',
        ecmaVersion: 'latest',
      },
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    }
  }
]
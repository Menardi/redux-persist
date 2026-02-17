import stylistic from '@stylistic/eslint-plugin';
import { defineConfig } from 'eslint/config';
import importPlugin from 'eslint-plugin-import';
import tseslint from 'typescript-eslint';

export default defineConfig({
  ignores: ['node_modules', 'dist'],
}, {
  files: ['**/*.ts', '**/*.js'],
  plugins: {
    '@typescript-eslint': tseslint.plugin,
    'import': importPlugin,
    '@stylistic': stylistic,
  },
  languageOptions: {
    parser: tseslint.parser,
  },
  rules: {
    'comma-dangle': ['error', 'always-multiline'],
    'curly': ['error', 'multi-line'],
    'import/order': ['error', {
      alphabetize: {
        order: 'asc',
        caseInsensitive: true,
      },
      groups: [
        ['builtin', 'external'],
      ],
      'newlines-between': 'always',
    }],
    'no-var': 'error',
    'prefer-const': 'error',
    '@stylistic/brace-style': ['error', '1tbs', { allowSingleLine: true }],
    '@stylistic/eol-last': 'error',
    '@stylistic/indent': ['error', 2],
    '@stylistic/max-len': ['error', { code: 140, ignoreStrings: true, ignoreTemplateLiterals: true }],
    '@stylistic/member-delimiter-style': 'error',
    '@stylistic/no-extra-semi': 'error',
    '@stylistic/no-multiple-empty-lines': ['error', { max: 1, maxBOF: 0 }],
    '@stylistic/padding-line-between-statements': ['error',
      { blankLine: 'always', prev: 'block-like', next: '*' },
      // Exclude `case` and `default` from the above definition
      { blankLine: 'any', prev: 'block-like', next: ['case', 'default'] },
    ],
    '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
    '@stylistic/semi': ['error', 'always'],
    '@typescript-eslint/no-unused-vars': 'warn',
  },
});

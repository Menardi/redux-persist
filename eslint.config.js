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
    '@stylistic/max-len': ['error', { code: 140, ignoreStrings: true, ignoreTemplateLiterals: true }],
    '@stylistic/indent': ['error', 2],
    '@stylistic/no-extra-semi': 'error',
    '@stylistic/no-multiple-empty-lines': ['error', { max: 1, maxBOF: 0 }],
    '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
    '@stylistic/semi': ['error', 'always'],
    '@typescript-eslint/no-unused-vars': 'warn',
  },
});

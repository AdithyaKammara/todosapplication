import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/', '_backup-v4/', '_backup-v6/', 'dist/', 'docs/'] },
  js.configs.recommended,
  {
    // Browser code
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    rules: {
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'prefer-const': 'error',
      'no-var': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Node code: tests, tooling scripts and this config
    files: ['tests/**/*.js', 'scripts/**/*.{js,mjs}', 'eslint.config.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },
];

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig, globalIgnores } from 'eslint/config';

// Extension explicite : le même code tourne sous Node, Vite et Deno (ADR 0005).
const EXTENSION_REQUIRED = {
  regex: '^\\.{1,2}/.*(?<!\\.ts|\\.json)$',
  message: 'Import relatif avec son extension (.ts) : requis par Deno.',
};

export default defineConfig([
  globalIgnores(['**/dist', '**/coverage', '**/node_modules']),
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // Un `_` en tête signale un paramètre volontairement ignoré.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      // Les nombres s'interpolent sans surprise ; undefined et objets restent interdits.
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },
  {
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  // ADR 0001 : le domaine n'importe que lui-même (imports relatifs).
  // Seuls les tests ont droit à vitest.
  {
    files: ['packages/domain/src/**/*.ts'],
    ignores: ['packages/domain/src/**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^(?!\\.{1,2}/)',
              message: 'Le domaine est pur : uniquement des imports relatifs (ADR 0001).',
            },
            EXTENSION_REQUIRED,
          ],
        },
      ],
    },
  },
  // ADR 0023 : la couche application ne dépend que du domaine. Ses tests et
  // ses outils de test ont droit, en plus, à vitest.
  {
    files: ['packages/application/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^(?!\\.{1,2}/|@arrakis/domain$)',
              message: 'La couche application ne dépend que du domaine (ADR 0023).',
            },
            EXTENSION_REQUIRED,
          ],
        },
      ],
    },
  },
  {
    files: ['packages/application/src/**/*.test.ts', 'packages/application/src/testing/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^(?!\\.{1,2}/|@arrakis/domain$|vitest$)',
              message:
                'Les tests de la couche application : le domaine et vitest seulement (ADR 0023).',
            },
            EXTENSION_REQUIRED,
          ],
        },
      ],
    },
  },
  // ADR 0023 : l'adaptateur Postgres est à la périphérie, il ne dépend
  // d'aucun autre adaptateur ni du site.
  {
    files: ['packages/postgres/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@arrakis/migrate-v1',
                '@arrakis/migrate-v1/*',
                '@arrakis/web',
                '@arrakis/web/*',
              ],
              message: 'L’adaptateur Postgres ne dépend ni de la migration ni du site (ADR 0023).',
            },
            EXTENSION_REQUIRED,
          ],
        },
      ],
    },
  },
  // Le site : les règles des hooks React. La v1 a connu un appel conditionnel
  // de hook qu'aucun outil ne signalait (ADR 0006).
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended],
  },
  // Scripts lancés par Node, hors du navigateur.
  {
    files: ['apps/web/scripts/**/*.js'],
    languageOptions: { globals: { console: 'readonly', process: 'readonly' } },
  },
  prettier,
]);

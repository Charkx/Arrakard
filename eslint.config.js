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

// L'adaptateur Postgres ne dépend d'aucun autre adaptateur ni du site (ADR 0023).
const OTHER_ADAPTERS = {
  group: ['@arrakis/migrate-v1', '@arrakis/migrate-v1/*', '@arrakis/web', '@arrakis/web/*'],
  message: 'L’adaptateur Postgres ne dépend ni de la migration ni du site (ADR 0023).',
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
    files: ['core/domain/src/**/*.ts'],
    ignores: ['core/domain/src/**/*.test.ts'],
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
    files: ['core/application/src/**/*.ts'],
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
    files: ['core/application/src/**/*.test.ts', 'core/application/src/testing/**/*.ts'],
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
    files: ['adapters/postgres/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            OTHER_ADAPTERS,
            {
              group: ['@arrakis/application/testing'],
              message: 'Les ports en mémoire servent aux tests, pas au code (ADR 0023).',
            },
            EXTENSION_REQUIRED,
          ],
        },
      ],
    },
  },
  {
    files: ['adapters/postgres/src/**/*.test.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [OTHER_ADAPTERS, EXTENSION_REQUIRED] }],
    },
  },
  // Le site lit par `DataSource` (ADR 0019) : ni la base en direct, ni la migration.
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    ignores: ['apps/web/src/**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@arrakis/postgres',
                '@arrakis/postgres/*',
                '@arrakis/migrate-v1',
                '@arrakis/migrate-v1/*',
                '@arrakis/application/testing',
              ],
              message:
                'Le site ne dépend ni de l’adaptateur Postgres, ni de la migration, ni des outils de test (ADR 0023).',
            },
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

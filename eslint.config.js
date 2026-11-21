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

/** Une règle d'import : ce motif est refusé, avec ce message. */
const refuse = (regex, message) => ({ regex, message });

// La règle des dépendances (ADR 0023, ADR 0025) : chaque couche du back
// n'importe que celles plus au centre. Domaine ← application ← infrastructure.
const ONLY_RELATIVE = refuse(
  '^(?!\\.{1,2}/)',
  'Le domaine et l’application n’importent que des fichiers du back, en relatif (ADR 0025).',
);
const NOT_APPLICATION = refuse(
  '/application/',
  'Le domaine ne dépend de rien : ni de l’application, ni de l’infrastructure (ADR 0023).',
);
const NOT_INFRASTRUCTURE = refuse(
  '/infrastructure/',
  'Seule l’infrastructure parle à la base : le centre ne l’importe pas (ADR 0023).',
);
const NOT_TESTING = refuse(
  '/testing/',
  'Les ports en mémoire servent aux tests, pas au code (ADR 0023).',
);
const NOT_OUTSIDE = {
  group: [
    '@arrakis/frontend',
    '@arrakis/frontend/*',
    '@arrakis/migrate-v1',
    '@arrakis/migrate-v1/*',
  ],
  message: 'Le back ne dépend ni du site ni de la migration (ADR 0025).',
};
const imports = (...patterns) => ({
  'no-restricted-imports': ['error', { patterns: [...patterns, EXTENSION_REQUIRED] }],
});
const TESTS = '**/*.test.ts';
const TEST_TOOLS = ['backend/**/testing/**/*.ts', 'backend/**/*.test.ts'];

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
  // Le domaine : relatif seulement, rien d'une autre couche. Ses tests ont droit à vitest.
  {
    files: ['backend/domain/**/*.ts'],
    rules: imports(ONLY_RELATIVE, NOT_APPLICATION, NOT_INFRASTRUCTURE),
  },
  {
    files: TEST_TOOLS.map((glob) => glob.replace('backend/', 'backend/domain/')),
    rules: imports(
      refuse('^(?!\\.{1,2}/|vitest$)', ONLY_RELATIVE.message),
      NOT_APPLICATION,
      NOT_INFRASTRUCTURE,
    ),
  },
  // L'application : le domaine seulement. Ses tests et ses outils de test ont droit à vitest.
  {
    files: ['backend/application/**/*.ts'],
    rules: imports(ONLY_RELATIVE, NOT_INFRASTRUCTURE),
  },
  {
    files: TEST_TOOLS.map((glob) => glob.replace('backend/', 'backend/application/')),
    rules: imports(refuse('^(?!\\.{1,2}/|vitest$)', ONLY_RELATIVE.message), NOT_INFRASTRUCTURE),
  },
  // L'infrastructure : la périphérie. Ni le site, ni la migration, ni les faux en mémoire hors tests.
  {
    files: ['backend/infrastructure/**/*.ts'],
    rules: imports(NOT_OUTSIDE, NOT_TESTING),
  },
  {
    files: [`backend/infrastructure/${TESTS}`],
    rules: imports(NOT_OUTSIDE),
  },
  // Le site lit par `DataSource` (ADR 0019) : du back, il n'utilise que le domaine.
  {
    files: ['frontend/src/**/*.{ts,tsx}'],
    ignores: ['frontend/src/**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@arrakis/backend/application',
                '@arrakis/backend/application/*',
                '@arrakis/backend/infrastructure',
                '@arrakis/migrate-v1',
                '@arrakis/migrate-v1/*',
              ],
              message: 'Le site n’utilise du back que le domaine (ADR 0019, ADR 0025).',
            },
            refuse(
              '^\\.{1,2}/.*/backend/',
              'Le site importe le back par `@arrakis/backend/domain`.',
            ),
          ],
        },
      ],
    },
  },
  // Le site : les règles des hooks React. La v1 a connu un appel conditionnel
  // de hook qu'aucun outil ne signalait (ADR 0006).
  {
    files: ['frontend/src/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended],
  },
  // Scripts lancés par Node, hors du navigateur.
  {
    files: ['frontend/scripts/**/*.js'],
    languageOptions: { globals: { console: 'readonly', process: 'readonly' } },
  },
  prettier,
]);

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
const NOT_TESTS = refuse(
  '^#support/|(^|/)tests/',
  'Le code de `src/` n’importe jamais les tests ni leurs outils (ADR 0025).',
);
const NOT_OUTSIDE = refuse(
  '(^|/)(frontend|tools)/',
  'Le back ne dépend ni du site ni des outils (ADR 0025).',
);
const NOT_BY_PACKAGE_NAME = refuse(
  '^@arrakis/',
  'Dans le back, on importe en relatif : ni le site, ni la migration, ni le back par son nom (ADR 0025).',
);
const DOMAIN_BY_ITS_ENTRY = refuse(
  '/domain/(?!index\\.ts$)',
  'Le domaine s’importe par son point d’entrée, `domain/index.ts` (ADR 0025).',
);
const APPLICATION_BY_ITS_ENTRY = refuse(
  '/application/(?!index\\.ts$)',
  'L’application s’importe par son point d’entrée, `application/index.ts` (ADR 0025).',
);
const imports = (...patterns) => ({
  'no-restricted-imports': ['error', { patterns: [...patterns, EXTENSION_REQUIRED] }],
});

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
  // Les couches du back (ADR 0023, ADR 0025). Seul le code de `src/` est
  // contraint : les tests, dans `tests/`, importent ce qu'ils testent.
  // Le domaine : relatif seulement, rien d'une autre couche.
  {
    files: ['backend/src/domain/**/*.ts'],
    rules: imports(ONLY_RELATIVE, NOT_APPLICATION, NOT_INFRASTRUCTURE, NOT_TESTS, NOT_OUTSIDE),
  },
  // L'application : le domaine seulement, par son point d'entrée.
  {
    files: ['backend/src/application/**/*.ts'],
    rules: imports(ONLY_RELATIVE, NOT_INFRASTRUCTURE, NOT_TESTS, NOT_OUTSIDE, DOMAIN_BY_ITS_ENTRY),
  },
  // L'infrastructure : la périphérie. Ses paquets npm (postgres), mais rien du
  // dépôt par son nom, et le reste du back par ses points d'entrée.
  {
    files: ['backend/src/infrastructure/**/*.ts'],
    rules: imports(
      NOT_BY_PACKAGE_NAME,
      NOT_TESTS,
      NOT_OUTSIDE,
      DOMAIN_BY_ITS_ENTRY,
      APPLICATION_BY_ITS_ENTRY,
    ),
  },
  // L'outil de migration n'importe pas ses tests.
  {
    files: ['tools/migrate-v1/src/**/*.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: [NOT_TESTS] }] },
  },
  // Le site lit par `DataSource` (ADR 0019) : du back, il n'utilise que le domaine.
  {
    files: ['frontend/src/**/*.{ts,tsx}'],
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
            NOT_TESTS,
          ],
        },
      ],
    },
  },
  // Le site : les règles des hooks React. La v1 a connu un appel conditionnel
  // de hook qu'aucun outil ne signalait (ADR 0006).
  {
    files: ['frontend/{src,tests}/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended],
  },
  // Scripts lancés par Node, hors du navigateur.
  {
    files: ['frontend/scripts/**/*.js'],
    languageOptions: { globals: { console: 'readonly', process: 'readonly' } },
  },
  prettier,
]);

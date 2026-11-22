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
  '^#|(^|/)tests/',
  'Le code de `src/` importe en relatif, et jamais les tests : les alias `#…` sont réservés aux tests (ADR 0025).',
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
const CONTRACTS_BY_ITS_ENTRY = refuse(
  '/contracts/(?!index\\.ts$)',
  'Les contrats s’importent par leur point d’entrée, `contracts/index.ts` (ADR 0026).',
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
  // Les contrats : la forme des entrées, partagée avec le site. Zod seulement.
  {
    files: ['backend/src/contracts/**/*.ts'],
    rules: imports(
      refuse(
        '^(?!\\.{1,2}/|zod$)',
        'Un contrat n’importe que Zod et d’autres contrats (ADR 0026).',
      ),
      refuse(
        '/(domain|application|infrastructure)/',
        'Un contrat ne dépend d’aucune couche (ADR 0026).',
      ),
      NOT_TESTS,
    ),
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
      CONTRACTS_BY_ITS_ENTRY,
    ),
  },
  // Les Edge Functions : des points d'entrée HTTP minces (ADR 0023). Elles
  // importent le back par les points d'entrée de ses couches, rien d'autre.
  {
    files: ['supabase/functions/**/*.ts'],
    rules: imports(
      refuse(
        '^(?!(\\.\\./){3}backend/src/(application|contracts|infrastructure)/index\\.ts$)',
        'Une Edge Function n’importe que les points d’entrée du back (ADR 0026).',
      ),
    ),
  },
  // Les tests du domaine et leurs outils restent du côté du domaine.
  {
    files: ['backend/tests/unit/domain/**/*.ts', 'backend/tests/support/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            refuse(
              '^#(application|infrastructure)/',
              'Un test du domaine n’importe ni l’application ni l’infrastructure (ADR 0023).',
            ),
          ],
        },
      ],
    },
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

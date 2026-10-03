// @ts-check
import js from '@eslint/js'
import comments from '@eslint-community/eslint-plugin-eslint-comments/configs'
import vitest from '@vitest/eslint-plugin'
import { defineConfig, globalIgnores } from 'eslint/config'
import prettier from 'eslint-config-prettier'
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript'
import boundariesModule from 'eslint-plugin-boundaries'
import checkFile from 'eslint-plugin-check-file'
import importX from 'eslint-plugin-import-x'
import unicorn from 'eslint-plugin-unicorn'
import globals from 'globals'
import tseslint from 'typescript-eslint'

/**
 * Layers, top → bottom. A layer may import only layers below it.
 * @see docs/ARCHITECTURE.md
 */
const LAYERS = ['app', 'modules', 'core', 'common']

// The package's .d.ts says `export default`, but the CommonJS module exports the plugin itself.
const boundaries = /** @type {import('eslint').ESLint.Plugin} */ (
  /** @type {unknown} */ (boundariesModule)
)

const DATA_ACCESS_FILES = ['src/**/*.repository.ts', 'src/**/*.table.ts', 'src/core/database/**']

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'drizzle', '**/*.d.ts']),

  // ─── Base: every JS/TS file ──────────────────────────────────────────────
  {
    name: 'base',
    files: ['**/*.{js,mjs,ts}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      unicorn.configs.unopinionated,
      importX.flatConfigs.recommended,
      importX.flatConfigs.typescript,
      comments.recommended,
    ],
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
      reportUnusedInlineConfigs: 'error',
    },
    languageOptions: {
      globals: globals.node,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    settings: {
      'import-x/resolver-next': [createTypeScriptImportResolver({ alwaysTryTypes: true })],
    },
    rules: {
      // Code quality budgets
      complexity: ['error', 10],
      'max-depth': ['error', 3],
      'max-params': ['error', 4], // DI constructors are excluded below
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
      'max-nested-callbacks': ['error', 4],
      'no-console': 'error',
      'no-param-reassign': ['error', { props: true }],
      'no-implicit-coercion': 'error',
      'prefer-template': 'error',
      'object-shorthand': 'error',
      eqeqeq: ['error', 'always'],
      curly: ['error', 'multi-line'],

      // TypeScript
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        { allowExpressions: true, allowTypedFunctionExpressions: true },
      ],
      '@typescript-eslint/explicit-member-accessibility': [
        'error',
        { accessibility: 'no-public', overrides: { parameterProperties: 'explicit' } },
      ],
      // Nest modules are empty classes configured by decorators.
      '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],

      // Imports
      // File extensions in relative imports are enforced by TypeScript (module: nodenext).
      'import-x/no-cycle': ['error', { ignoreExternal: true }],
      'import-x/no-self-import': 'error',
      'import-x/no-useless-path-segments': 'error',
      'import-x/no-duplicates': ['error', { 'prefer-inline': true }],
      'import-x/no-default-export': 'error',
      'import-x/no-named-as-default-member': 'off',
      'import-x/first': 'error',
      'import-x/newline-after-import': 'error',
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', ['sibling', 'index']],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],

      // Unicorn: opinionated rules that do not fit this codebase
      'unicorn/no-null': 'off',
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/filename-case': 'off', // handled by check-file
      'unicorn/no-array-reduce': 'off',
      'unicorn/prefer-ternary': 'off',
      'unicorn/no-useless-undefined': 'off',
      'unicorn/no-top-level-side-effects': 'off',
      'unicorn/no-process-exit': 'off', // CLI entry points exit with a status code

      // Every eslint-disable must explain why
      '@eslint-community/eslint-comments/require-description': 'error',
      '@eslint-community/eslint-comments/no-unlimited-disable': 'error',
      '@eslint-community/eslint-comments/disable-enable-pair': ['error', { allowWholeFile: true }],
    },
  },

  // ─── Application code ────────────────────────────────────────────────────
  {
    name: 'src',
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='process'][property.name='env']",
          message: 'Read configuration through APP_CONFIG (src/core/config), not process.env.',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'pg',
              message: 'Use the Database provider from core/database.',
              allowTypeImports: true,
            },
            { name: 'dotenv', message: 'Node 24 reads .env natively (process.loadEnvFile).' },
            { name: 'class-validator', message: 'Validate with zod schemas: @Body({ schema }).' },
            {
              name: 'class-transformer',
              message: 'Shape responses with @ApiContract({ response }).',
            },
          ],
          patterns: [
            {
              group: ['drizzle-orm', 'drizzle-orm/*'],
              message:
                'SQL lives in *.repository.ts / *.table.ts only. Call the repository from a service.',
            },
            {
              group: ['*.repository.js', '*.table.js'],
              message: 'Only services (and the module) may use repositories and tables.',
            },
          ],
        },
      ],
    },
  },
  {
    name: 'data-access',
    files: DATA_ACCESS_FILES,
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    name: 'services-and-modules',
    files: ['src/**/*.service.ts', 'src/**/*.module.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['drizzle-orm', 'drizzle-orm/*'],
              message: 'SQL lives in *.repository.ts / *.table.ts only.',
            },
          ],
        },
      ],
    },
  },
  {
    name: 'composition-roots',
    // Only entry points and config loading may touch process.env.
    files: ['src/core/config/app-config.ts', 'src/app/*.ts'],
    rules: { 'no-restricted-syntax': 'off', 'no-console': 'off' },
  },
  {
    name: 'di-constructors',
    // Constructor injection may legitimately take many dependencies.
    files: ['src/**/*.{service,controller,guard,repository,health,module}.ts'],
    rules: { 'max-params': 'off' },
  },

  // ─── Naming ──────────────────────────────────────────────────────────────
  {
    name: 'naming',
    files: ['src/**/*.ts', 'test/**/*.ts'],
    plugins: { 'check-file': checkFile },
    rules: {
      'check-file/folder-naming-convention': ['error', { '{src,test}/**/': 'KEBAB_CASE' }],
      'check-file/filename-naming-convention': [
        'error',
        { '{src,test}/**/*.ts': 'KEBAB_CASE' },
        { ignoreMiddleExtensions: true },
      ],
    },
  },

  // ─── Architecture: layers and module boundaries ──────────────────────────
  {
    name: 'architecture',
    files: ['src/**/*.ts'],
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'app', pattern: 'src/app', partialMatch: false },
        { type: 'modules', pattern: 'src/modules/*', capture: ['slice'], partialMatch: false },
        { type: 'core', pattern: 'src/core/*', capture: ['slice'], partialMatch: false },
        { type: 'common', pattern: 'src/common', partialMatch: false },
      ],
      'boundaries/files': [{ category: 'test', pattern: '**/*.test.ts' }],
      // boundaries reads the legacy resolver setting.
      'import/resolver': { typescript: { alwaysTryTypes: true } },
    },
    rules: {
      'boundaries/no-unknown-files': 'error',
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          message:
            '{{from.element.type}} "{{from.element.captured.slice}}" must not import {{to.element.type}} "{{to.element.captured.slice}}" ({{to.fileInternalPath}}). See docs/ARCHITECTURE.md',
          policies: [
            // External packages and Node built-ins.
            { allow: { to: { module: { origin: 'external' } } } },
            { allow: { to: { module: { origin: 'core' } } } },

            // 1. Only downward imports.
            ...LAYERS.map((layer, index) => ({
              from: { element: { type: layer } },
              allow: { to: { element: { types: { anyOf: LAYERS.slice(index + 1) } } } },
            })),
            // Feature modules may depend on each other (e.g. auth → users)…
            {
              from: { element: { type: 'modules' } },
              allow: { to: { element: { type: 'modules' } } },
            },
            // …and core segments may use each other (database → config).
            { from: { element: { type: 'core' } }, allow: { to: { element: { type: 'core' } } } },

            // 2. Public API: another module/core segment only through its index.ts.
            {
              disallow: {
                to: {
                  element: { types: { anyOf: ['modules', 'core'] }, fileInternalPath: '!index.ts' },
                },
              },
            },

            // 3. Anything inside the same module / segment / layer.
            {
              allow: {
                to: {
                  element: {
                    type: '{{ from.element.types.[0] }}',
                    captured: { slice: '{{ from.element.captured.slice }}' },
                  },
                },
              },
            },
            { from: { element: { type: 'app' } }, allow: { to: { element: { type: 'app' } } } },
            {
              from: { element: { type: 'common' } },
              allow: { to: { element: { type: 'common' } } },
            },
          ],
        },
      ],
    },
  },

  // ─── Tests ───────────────────────────────────────────────────────────────
  {
    name: 'tests',
    files: ['src/**/*.test.ts', 'test/**/*.ts'],
    extends: [vitest.configs.recommended],
    rules: {
      'vitest/consistent-test-it': ['error', { fn: 'it' }],
      'vitest/no-focused-tests': 'error',
      'vitest/no-disabled-tests': 'error',
      'vitest/prefer-hooks-on-top': 'error',
      'vitest/require-top-level-describe': 'error',
      'max-lines': 'off',
      'max-nested-callbacks': 'off',
      'no-restricted-syntax': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/unbound-method': 'off', // expect(mock.method) is idiomatic
      '@typescript-eslint/explicit-function-return-type': 'off',
      // Asymmetric matchers (expect.any) are typed as `any`.
      '@typescript-eslint/no-unsafe-assignment': 'off',
      // Unit tests construct services with mocked repositories.
      'no-restricted-imports': 'off',
    },
  },

  // ─── Config files and scripts ────────────────────────────────────────────
  {
    name: 'tooling',
    files: ['*.config.{js,ts}', 'scripts/**'],
    rules: {
      'import-x/no-default-export': 'off',
      'import-x/default': 'off',
      'import-x/no-named-as-default': 'off',
      'max-lines': 'off',
      'no-console': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },

  // Must stay last: disables stylistic rules that conflict with Prettier.
  prettier,
])

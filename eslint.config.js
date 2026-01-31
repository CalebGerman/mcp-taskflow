import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import security from 'eslint-plugin-security';

export default [
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json',
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      security: security,
    },
    rules: {
      // ========================================================================
      // SECURITY RULES (OWASP Controls C1-C10)
      // ========================================================================

      // C5: Input Validation - Prevent code injection
      'no-eval': 'error',
      'no-new-func': 'error',
      'no-implied-eval': 'error',

      // C4: Encode and Escape Data - Prevent injection attacks
      'security/detect-unsafe-regex': 'error',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-buffer-noassert': 'error',

      // C3: Secure Database Access - Prevent SQL/NoSQL injection
      'security/detect-object-injection': 'warn',

      // C7: Access Controls - Prevent path traversal
      'security/detect-non-literal-fs-filename': 'warn',
      'security/detect-child-process': 'error',

      // C8: Protect Data - Prevent exposure of sensitive data
      'security/detect-pseudoRandomBytes': 'error',
      'security/detect-possible-timing-attacks': 'warn',

      // C10: Handle Errors Securely - No information disclosure
      'no-console': ['warn', { allow: ['error', 'warn', 'info'] }],

      // ========================================================================
      // TYPESCRIPT BEST PRACTICES
      // ========================================================================

      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/require-await': 'warn',
      '@typescript-eslint/no-deprecated': 'error', // Prevent use of deprecated imports/APIs
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],

      // ========================================================================
      // CODE QUALITY
      // ========================================================================

      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-arrow-callback': 'error',
      'no-return-await': 'off', // Turned off for TypeScript (conflicts with promises)
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', '**/*.config.ts', '**/*.config.js'],
  },
];

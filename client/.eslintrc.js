module.exports = {
    env: {
        browser: true,
        es6: true,
        node: true,
        jest: true,
    },
    extends: [
        'eslint:recommended',
        'plugin:import/errors',
        'plugin:import/typescript',
        'plugin:react/recommended',
        'plugin:jsx-a11y/recommended',
        'prettier',
    ],
    parserOptions: {
        ecmaFeatures: {
            jsx: true,
        },
        ecmaVersion: 2018,
        sourceType: 'module',
        project: './tsconfig.json',
    },
    plugins: ['react', 'import', 'jsx-a11y', 'react-hooks'],
    rules: {
        'react/prop-types': 'off',
        'no-console': 'off',
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'warn',
        'no-var': 'error',
        'import/no-cycle': ['error', { ignoreExternal: true }],
        'no-warning-comments': 'warn',
        eqeqeq: 'error',
        'func-style': ['warn', 'declaration'], // Declaration functions have obligatory names, which makes stack traces easier to read
        'no-inner-declarations': 'off',
    },
    settings: { react: { version: 'detect' } },
    overrides: [
        // typescript
        {
            files: ['*.ts', '*.tsx'],
            plugins: ['@typescript-eslint'],
            extends: [
                'plugin:@typescript-eslint/eslint-recommended',
                'plugin:@typescript-eslint/recommended',
                'plugin:@typescript-eslint/recommended-requiring-type-checking',
            ],
            rules: {
                '@typescript-eslint/consistent-type-assertions': [
                    'error',
                    { assertionStyle: 'never' },
                ],
                '@typescript-eslint/strict-boolean-expressions': [
                    'error',
                    {
                        allowString: false,
                        allowNumber: false,
                        allowNullableObject: false,
                    },
                ],
            },
            parser: '@typescript-eslint/parser',
        },

        // dev ui work
        {
            files: [
                'src/dev/ui/**/*.{ts,js}',
                'src/dev/ui/**/*.{tsx,jsx}',
                'src/exports-dev.tsx',
            ],
            rules: {
                '@typescript-eslint/strict-boolean-expressions': 'off',
                '@typescript-eslint/consistent-type-assertions': 'off',
                '@typescript-eslint/no-explicit-any': 'off',
                '@typescript-eslint/no-non-null-assertion': 'off',
                '@typescript-eslint/explicit-module-boundary-types': 'off',
                eqeqeq: 'off',
                'no-warning-comments': 'off',
                'func-style': 'off',
            },
        },

        // tests
        {
            files: ['**/*.test.ts'],
            extends: ['plugin:jest/recommended', 'plugin:jest/style'],
            rules: {
                '@typescript-eslint/strict-boolean-expressions': 'off',
                '@typescript-eslint/consistent-type-assertions': 'off',
                '@typescript-eslint/no-explicit-any': 'off',
                '@typescript-eslint/no-non-null-assertion': 'off',
                '@typescript-eslint/no-unsafe-argument': 'off',
                '@typescript-eslint/no-unsafe-assignment': 'off',
                '@typescript-eslint/no-unsafe-call': 'off',
                '@typescript-eslint/no-unsafe-member-access': 'off',
                '@typescript-eslint/no-unsafe-return': 'off',
            },
        },
    ],
};

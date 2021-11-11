module.exports = {
    env: {
        browser: true,
        es6: true,
        node: true,
        jest: true,
    },
    extends: [
        "eslint:recommended",
        "plugin:import/errors",
        "plugin:import/typescript",
        "plugin:react/recommended",
        "plugin:jsx-a11y/recommended",
        "prettier",
    ],
    parserOptions: {
        ecmaFeatures: {
            jsx: true,
        },
        ecmaVersion: 2018,
        sourceType: "module",
        project: "./tsconfig.json",
    },
    plugins: ["react", "import", "jsx-a11y", "react-hooks"],
    rules: {
        "react/prop-types": 0,
        "no-console": 0,
        "react-hooks/rules-of-hooks": 2,
        "react-hooks/exhaustive-deps": 1,
        "no-var": 2,
    },
    settings: { react: { version: "detect" } },
    overrides: [
        // typescript
        {
            files: ['*.ts', '*.tsx'],
            plugins: ['@typescript-eslint'],
            extends: [
                'plugin:@typescript-eslint/eslint-recommended',
                'plugin:@typescript-eslint/recommended',
                "plugin:@typescript-eslint/recommended-requiring-type-checking",
            ],
            rules: {
                '@typescript-eslint/consistent-type-assertions': ['error', { 'assertionStyle': 'never' }],
            },
            parser: '@typescript-eslint/parser',
        },

        // dev ui work
        {
            files: ['src/ui/**/*.ts', 'src/ui/**/*.tsx', 'src/exports-dev.tsx'],
            rules: {
                '@typescript-eslint/consistent-type-assertions': 'off',
                '@typescript-eslint/no-explicit-any': 'off',
                '@typescript-eslint/no-non-null-assertion': 'off',
                '@typescript-eslint/explicit-module-boundary-types': 'off',
            }
        },

        // tests
        {
            files: ['**/*.test.ts'],
            extends: [
                "plugin:jest/recommended",
                "plugin:jest/style",
            ],
            rules: {
                '@typescript-eslint/consistent-type-assertions': 'off',
                '@typescript-eslint/no-explicit-any': 'off',
                '@typescript-eslint/no-non-null-assertion': 'off',
                '@typescript-eslint/no-unsafe-assignment': 'off',
                '@typescript-eslint/no-unsafe-call': 'off',
                '@typescript-eslint/no-unsafe-member-access': 'off',
                '@typescript-eslint/no-unsafe-return': 'off',
            }
        },
    ]
};

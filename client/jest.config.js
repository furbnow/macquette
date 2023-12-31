module.exports = {
    preset: 'ts-jest/presets/js-with-ts',
    collectCoverage: Boolean(process.env['CI']) || Boolean(process.env['COVERAGE']),
    coverageProvider: 'v8',
    collectCoverageFrom: ['./src/**', './test/model/golden-master/*.js'],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'text-summary', 'cobertura', 'lcov'],
    transform: { '.(ts|tsx)': 'ts-jest' },
    testRegex: '\\.(test|spec)\\.(ts|tsx|js)$',
    moduleFileExtensions: ['ts', 'tsx', 'js'],
    testEnvironment: 'node',
    setupFilesAfterEnv: [
        '<rootDir>/test/helpers/jest/to-be-approximately.ts',
        '<rootDir>/test/helpers/jest/to-equal-by.ts',
        '<rootDir>/test/helpers/fast-check-stringify-enums.ts',
    ],
};

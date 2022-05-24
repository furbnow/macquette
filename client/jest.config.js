module.exports = {
    preset: 'ts-jest/presets/js-with-ts',
    testEnvironment: 'node',
    setupFilesAfterEnv: [
        '<rootDir>/test/helpers/jest/to-be-approximately.ts',
        '<rootDir>/test/helpers/jest/to-equal-by.ts',
        '<rootDir>/test/helpers/fast-check-stringify-enums.ts',
    ],
};

module.exports = {
    preset: 'ts-jest/presets/js-with-ts',
    testEnvironment: 'node',
    setupFilesAfterEnv: [
        '<rootDir>/test/helpers/toBeApproximately.ts',
        '<rootDir>/test/helpers/toEqualApproximately.ts',
    ],
};

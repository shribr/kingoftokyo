export default {
  testEnvironment: 'jsdom',
  transform: {},
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testMatch: [
    '**/src/services/__tests__/**/*.test.js'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/src/tests/' // Ignore old tests that use different module system
  ],
  collectCoverageFrom: [
    'src/services/*.js',
    '!src/services/**/*.test.js',
    '!src/services/__tests__/**'
  ],
  coverageDirectory: 'coverage',
  verbose: true
};

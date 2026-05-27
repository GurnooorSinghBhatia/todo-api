module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
  ],
  testMatch: [
    '**/tests/**/*.test.js',
  ],
  coverageThreshold: {
    global: {
      lines: 75,
      functions: 75,
      branches: 60,
    },
  },
  verbose: true,
};

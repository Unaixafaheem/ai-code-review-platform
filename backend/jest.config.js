module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 60000,
  verbose: true,
  moduleNameMapper: {
    '^@octokit/rest$': '<rootDir>/tests/mocks/octokit-rest.js',
    '^@octokit/auth-app$': '<rootDir>/tests/mocks/octokit-auth.js',
  },
};

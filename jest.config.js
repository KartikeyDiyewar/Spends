module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  transformIgnorePatterns: [
    "node_modules/(?!(react-native-url-polyfill|@supabase)/)"
  ],
  transform: {
    "^.+\\.(ts|tsx|js|jsx)$": "ts-jest"
  }
};

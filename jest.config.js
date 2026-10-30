module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^react-native$': '<rootDir>/__mocks__/react-native.js',
    '^@react-native-async-storage/async-storage$': '<rootDir>/__mocks__/async-storage-2.js',
    '^react-native-url-polyfill/auto$': '<rootDir>/__mocks__/url-polyfill.js'
  },
  transformIgnorePatterns: [
    "node_modules/(?!(@react-native|react-native|react-native-url-polyfill)/)"
  ],
  setupFiles: ['<rootDir>/jest.setup.js'],
  testMatch: ["**/__tests__/**/*.test.[jt]s?(x)"],
  testPathIgnorePatterns: ["__tests__/debt-engine.test.ts"]
};

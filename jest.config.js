/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleDirectories: ['node_modules', 'src'],
  moduleNameMapper: {
    'src/(.*)': '<rootDir>/src/$1'
  },
  'transform': {
    'node_modules/variables/.+\\.(j|t)sx?$': 'ts-jest'
  },
  transformIgnorePatterns: [
    'node_modules/(?!' +
    [
      'ganache-core',
      // 'ethereum-cryptography',
      'node-fetch',
      'fetch-blob',
      'data-uri-to-buffer',
      'jest-runtime',
      'formdata-polyfill'
    ].join('|') +
    ')',
  ],
};

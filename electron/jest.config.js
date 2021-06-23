module.exports = {
  displayName: 'Backend',

  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/electron/tsconfig.json'
    }
  },

  moduleDirectories: [
    'node_modules',
    '<rootDir>'
  ],
  // Module file extensions for importing
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],

  resetMocks: true,

  rootDir: '..',

  // The root of your source code, typically /src
  // `<rootDir>` is a token Jest substitutes
  roots: ['<rootDir>/electron'],

  // Test spec file resolution pattern
  // should contain `test` or `spec`.
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
  // Jest transformations -- this adds support for TypeScript
  // using ts-jest
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  }
};


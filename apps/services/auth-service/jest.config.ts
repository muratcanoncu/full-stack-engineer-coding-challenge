import type { Config } from 'jest';

const config: Config = {
  displayName: 'auth-service',
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  moduleNameMapper: {
    '^@sandbox/types$': '<rootDir>/../../../libs/shared/types/src/index.ts',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.spec.ts', '!src/main.ts', '!src/seed.ts'],
};

export default config;

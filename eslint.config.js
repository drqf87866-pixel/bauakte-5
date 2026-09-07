export default [
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'warn',
      'no-undef': 'off',
    },
  },
  {
    ignores: ['public/', 'dist/', 'node_modules/', '*.d.ts', 'worker-configuration.d.ts'],
  },
];

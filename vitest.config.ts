import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/index.ts',
      ],
      // Security-critical paths require high coverage
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
    // Test isolation (like C# xUnit)
    isolate: true,
    // Parallel execution
    threads: true,
    // Run test files sequentially to avoid file system race conditions
    fileParallelism: false,
  },
});

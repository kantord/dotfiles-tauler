import { defineConfig } from 'vitest/config';

// d3.timeFormat uses local time; pin it so snapshots match on any machine.
process.env.TZ = 'UTC';

// The timing gates (bench.js) time dozens of compiles each; under a parallel full run they pass but exceed 5 s.
export default defineConfig({
  // tauler's classic JSX: `h(type, props, ...children)`, defined by test/tauler.js.
  oxc: { jsx: { runtime: 'classic', pragma: 'h', pragmaFrag: 'Fragment' } },
  test: { include: ['**/*.test.{js,jsx}'], isolate: false, testTimeout: 30000 },
});

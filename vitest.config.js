import { defineConfig } from 'vitest/config';

// d3.timeFormat uses local time; pin it so snapshots match on any machine.
process.env.TZ = 'UTC';

export default defineConfig({
  // tauler's classic JSX: `h(type, props, ...children)`, defined by test/tauler.js.
  oxc: { jsx: { runtime: 'classic', pragma: 'h', pragmaFrag: 'Fragment' } },
  test: { include: ['**/*.test.{js,jsx}'], isolate: false },
});

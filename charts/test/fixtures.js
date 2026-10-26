// Deterministic data for the tests: no clock, no randomness.
export const series = Array.from({ length: 30 }, (_, i) => ({
  t: new Date(Date.UTC(2026, 9, 24, 14, i)),
  cpu: 30 + 20 * Math.sin(i / 6),
  mem: 55 + 5 * Math.sin(i / 20),
}));

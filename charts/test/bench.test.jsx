import { test, expect } from 'vitest';
import { compile } from '../core.jsx';
import { BUDGET, costOf, median, referenceProps } from './bench.js';

test('the reference plot compiles and has the shapes SPEC 10 names', () => {
  const { scene } = compile(referenceProps());
  expect(scene.marks.map(s => s.t)).toEqual(['path', 'path']);
  expect(scene.back.length).toBeGreaterThan(0);
});

test('costOf is stable enough to gate on: a stage that does the reference work costs about 1', () => {
  const props = referenceProps();
  const ratio = costOf(() => compile(props));
  expect(ratio).toBeGreaterThan(0.5);
  expect(ratio).toBeLessThan(2);
});

test('a stage costing more than the budget fails the gate; a cheap one passes', () => {
  const cheap = costOf(() => { let s = 0; for (let i = 0; i < 500; i++) s += Math.sqrt(i); return s; });
  expect(cheap).toBeLessThan(BUDGET);
  const props = referenceProps();
  const heavy = costOf(() => { compile(props); compile(props); });
  expect(heavy).toBeGreaterThan(BUDGET);
});

test('median ignores one slow outlier', () => {
  let n = 0;
  const t = median(() => { if (++n === 10) for (let i = 0; i < 5e6; i++); }, 15);
  expect(t).toBeLessThan(5);
});

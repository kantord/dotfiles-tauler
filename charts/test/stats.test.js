import { test, expect } from 'vitest';
import assert from 'node:assert/strict';
import { bin, bin2d, group, rolling, cumsum, kde, ecdf, boxStats } from '../stats.jsx';

const xs = [1, 2, 2, 3, 3, 3, 4, 4, 5, 20].map(v => ({ v, k: v > 3 ? 'hi' : 'lo' }));

test('given edges, bin keeps them: the first bin starts at the first edge, the max is not a bin of its own', () => {
  const bins = bin([{ v: 13 }, { v: 17 }, { v: 20 }], { value: 'v', thresholds: [10, 15, 20] });
  expect(bins).toEqual([{ x0: 10, x1: 15, count: 1 }, { x0: 15, x1: 20, count: 2 }]);
});

test('bin2d keeps only non-empty cells, and they cover every datum', () => {
  const pts = [{ a: 0, b: 0 }, { a: 0.1, b: 0.1 }, { a: 9, b: 9 }];
  const cells = bin2d(pts, { x: 'a', y: 'b', thresholds: 3 });
  assert.equal(cells.reduce((s, c) => s + c.count, 0), 3);
  assert.ok(cells.every(c => c.count > 0 && c.x0 < c.x1 && c.y0 < c.y1));
});

test('group counts by key, or reduces as told', () => {
  assert.deepEqual(group(xs, 'k'), [{ key: 'lo', value: 6 }, { key: 'hi', value: 4 }]);
  assert.deepEqual(group(xs, 'k', rows => Math.max(...rows.map(r => r.v)))[1], { key: 'hi', value: 20 });
});

test('rolling averages the trailing window', () => {
  assert.deepEqual(rolling([{ v: 2 }, { v: 4 }, { v: 6 }], { value: 'v', window: 2 }).map(d => d.rolling), [2, 3, 5]);
});

test('cumsum gives each step its from and to', () => {
  assert.deepEqual(cumsum([{ v: 5 }, { v: -2 }], { value: 'v' }).map(d => [d.from, d.to]), [[0, 5], [5, 3]]);
});

test('kde integrates to about 1', () => {
  const curve = kde(xs, { value: 'v', points: 200 });
  const step = curve[1].x - curve[0].x;
  const area = curve.reduce((s, p) => s + p.density * step, 0);
  assert.ok(Math.abs(area - 1) < 0.02, String(area));
});

test('boxStats: quartiles, whiskers within 1.5 IQR, and the outliers beyond', () => {
  const [all] = boxStats(xs, { by: () => 'all', value: 'v' });
  assert.equal(all.med, 3);
  assert.equal(all.hi, 5);
  assert.deepEqual(all.outliers.map(d => d.v), [20]);
});

test('a whisker never ends inside the box, even when every value beyond a hinge is an outlier', () => {
  const [box] = boxStats([-10, 0, 0, 0].map(v => ({ v })), { by: () => 'all', value: 'v' });
  expect(box.q1).toBe(-2.5);
  expect(box.lo).toBe(-2.5);   // not 0: the hinge bounds the whisker, as in ggplot2
  expect(box.outliers.map(d => d.v)).toEqual([-10]);
});

test('one bin is the data\'s whole extent (d3 7.9.0 returns infinite edges for thresholds(1))', () => {
  expect(bin([-0.3, 1.5, 0].map(v => ({ v })), { value: 'v', thresholds: 1 })).toEqual([{ x0: -0.3, x1: 1.5, count: 3 }]);
  expect(bin([], { value: 'v', thresholds: 1 })).toEqual([]);
});


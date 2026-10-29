// Edge cases the review left for later (NaN/null handling, formatting, flow order, shared helpers).
// Each test was written to fail first, then the code was fixed.
import { test, expect } from 'vitest';
import '../../test/tauler.js';   // defines the JSX factory `h`
import { compile, Axis, Grid, Scale, geo } from '../core.jsx';
import { Bar, Rect, Link, Dot } from '../marks.jsx';
import { RuleX, RuleY } from '../rules.jsx';
import { kde, boxStats, cumsum, rank } from '../stats.jsx';
import { violin } from '../recipes/violin.jsx';
import { flow } from '../flow.jsx';
import { measureFor } from '../fonts.jsx';
import { waterfall } from '../composites.jsx';

const plot = (children, props = {}) => compile({ width: 200, height: 100, data: [{ a: 1, b: 2 }, { a: 2, b: 4 }, { a: 3, b: 6 }], x: 'a', y: 'b', children, ...props });
const finite = obj => !/NaN|undefined|Infinity/.test(JSON.stringify(obj).replace(/"[a-z]+":null/g, ''));

/* ---------- NaN and null ---------- */

test('Bar and Rect draw nothing for a NaN value, as for null', () => {
  const data = [{ a: 'p', b: 3 }, { a: 'q', b: NaN }, { a: 'r', b: null }];
  for (const Mark of [Bar, Rect]) {
    const { scene } = plot([Mark({ width: 6 })], { data, x: 'a', y: 'b' });
    const shapes = scene.marks.filter(s => s.t === 'rect' || s.t === 'line');
    expect(shapes).toHaveLength(1);
    expect(finite(shapes)).toBe(true);
  }
});

test('a Link with a missing end draws nothing', () => {
  const data = [{ x1: 1, y1: 1, x2: 2, y2: 2 }, { x1: 1, y1: 1, x2: null, y2: null }, { x1: 1, y1: 1 }];
  const { scene } = plot([Link({ x1: 'x1', y1: 'y1', x2: 'x2', y2: 'y2' })], { data, x: undefined, y: undefined });
  expect(scene.marks.filter(s => s.t === 'line')).toHaveLength(1);
  expect(finite(scene.marks)).toBe(true);
});

test('kde and violin return no NaN row on empty input, bandwidth 0 or one point', () => {
  expect(kde([], { value: 'v' })).toEqual([]);
  expect(kde([{ v: null }], { value: 'v' })).toEqual([]);
  expect(kde([{ v: 1 }, { v: 2 }], { value: 'v', bandwidth: 0 })).toEqual([]);
  const one = kde([{ v: 1 }, { v: 3 }], { value: 'v', points: 1 });
  expect(one).toHaveLength(1);
  expect(finite(one)).toBe(true);
  expect(violin([], { by: 'k', value: 'v' })).toEqual({ names: [], rows: [] });
  expect(finite(violin([{ k: 'a', v: 1 }, { k: 'a', v: 2 }], { by: 'k', value: 'v', points: 1 }).rows)).toBe(true);
});

test('boxStats gives no row for a group with no values', () => {
  const rows = boxStats([{ k: 'a', v: 1 }, { k: 'a', v: 2 }, { k: 'b', v: null }, { k: 'b', v: NaN }], { by: 'k', value: 'v' });
  expect(rows.map(r => r.key)).toEqual(['a']);
});

test('cumsum skips a missing value and carries the running total', () => {
  const rows = cumsum([{ v: 5 }, { v: null }, { v: NaN }, { v: 3 }], { value: 'v' });
  expect(rows.map(d => [d.from, d.to])).toEqual([[0, 5], [5, 5], [5, 5], [5, 8]]);
});

test('waterfall uses the cumsum totals and gives a missing value delta 0', () => {
  const rows = waterfall([{ v: 5 }, { v: null }, { v: -2 }], { value: 'v', total: true });
  expect(rows.map(d => [d.from, d.to])).toEqual([[0, 5], [5, 5], [5, 3], [0, 3]]);
  expect(rows.slice(0, 3).map(d => d.delta)).toEqual([5, 0, -2]);
});

test('RuleX and RuleY under geo emit no NaN path', () => {
  const props = { projection: 'equal-earth', x: 'lon', y: 'lat', data: [{ lon: 0, lat: 0 }] };
  for (const Rule of [RuleX, RuleY]) {
    const { scene } = plot([Rule({ x: 10, y: 10 })], props);
    expect(JSON.stringify(scene.marks)).not.toMatch(/NaN/);
    expect(scene.marks.filter(s => s.t === 'path')).toHaveLength(1);
  }
  expect(JSON.stringify(plot([RuleX({ x: 10 }), RuleY({ y: 10 })], props).scene.marks)).not.toMatch(/NaN/);
});

test('a band Grid with an empty explicit domain emits no lines', () => {
  const { scene } = plot([Scale({ channel: 'x', type: 'band', domain: [] }), Grid({ channel: 'x' })], { data: [] });
  expect(scene.back.filter(s => s.t === 'line')).toEqual([]);
  expect(JSON.stringify(scene.back)).not.toMatch(/NaN/);
});

/* ---------- formatting ---------- */

test('a single-value domain labels its ticks without float noise', () => {
  const { scene } = plot([Dot({}), Axis({ channel: 'y' })], { data: [{ a: 1, b: 3 }, { a: 2, b: 3 }] });
  const labels = scene.back.filter(s => s.t === 'text').map(s => s.text);
  expect(labels.length).toBeGreaterThan(0);
  expect(labels.filter(l => /\d{4,}/.test(l))).toEqual([]);
});

test('text width: a combining mark is zero, CJK is one em, an emoji is two columns in mono', () => {
  const sans = measureFor('Helvetica, sans-serif'), mono = measureFor('monospace');
  expect(sans('é', 10)).toBe(sans('e', 10));
  expect(sans('中文', 10)).toBe(20);
  expect(mono('é', 10)).toBe(mono('e', 10));
  expect(mono('中', 10)).toBeCloseTo(12);
  expect(mono('😀', 10)).toBeCloseTo(12);
  expect(mono('👨‍👩‍👧', 10)).toBeCloseTo(36);   // three emoji; the joiners are zero
  expect(mono('abc', 10)).toBeCloseTo(18);
});

test('rank: ties share the lower rank, equal Dates tie, NaN has none, and it scales as n log n', () => {
  const d = (n) => new Date(Date.UTC(2020, 0, n));
  expect(rank([{ v: d(2) }, { v: d(1) }, { v: d(2) }], { value: 'v' }).map(r => r.rank)).toEqual([2, 1, 2]);
  expect(rank([{ v: 3 }, { v: NaN }, { v: 1 }, { v: null }], { value: 'v' }).map(r => r.rank)).toEqual([2, null, 1, null]);
  expect(rank([{ v: 3 }, { v: 1 }, { v: 2 }], { value: 'v', descending: true }).map(r => r.rank)).toEqual([1, 3, 2]);
  const big = Array.from({ length: 100000 }, (_, i) => ({ v: (i * 7919) % 100003 }));
  const t = performance.now();
  rank(big, { value: 'v' });
  expect(performance.now() - t).toBeLessThan(1000);
});

/* ---------- flow ---------- */

test('flow relaxes columns left to right, whatever order the links come in', () => {
  // Three columns of three nodes; the two blocks of links (first to second, second to third) in either order.
  const link = (source, target, value) => ({ source, target, value });
  const first = [link('A', 'C', 3), link('A', 'D', 3), link('A', 'H', 1), link('B', 'C', 2), link('B', 'D', 2), link('G', 'C', 1), link('G', 'D', 5)];
  const second = [link('C', 'E', 4), link('C', 'F', 3), link('D', 'F', 5), link('D', 'I', 4), link('H', 'E', 1), link('H', 'F', 4)];
  const place = data => Object.fromEntries(flow(data, { source: 'source', target: 'target', value: 'value', width: 300, height: 200, iterations: 2 }).nodes.map(n => [n.id, n.y0]));
  const a = place([...first, ...second]), b = place([...second, ...first]);
  for (const id of Object.keys(a)) expect(b[id], id).toBeCloseTo(a[id], 6);
});

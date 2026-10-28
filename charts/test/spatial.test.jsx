// Polygon and its statistics (SPEC 5.2, 6), the derived-chart statistics, the rule, tick and
// swarm marks, and the recipes (charts/recipes/). Invented data, seeded.
import { test, expect } from 'vitest';
import * as d3 from 'd3';
import '../../test/tauler.js';
import { compile, Scale, Axis } from '../core.jsx';
import { Polygon, RuleX, RuleY, TickX, TickY, Swarm, Dot, Area } from '../marks.jsx';
import { hexbin, delaunay, contours, densityContours, regress, difference, waterfall } from '../stats.jsx';
import { Tooltip } from '../recipes/tooltip.jsx';
import { violin } from '../recipes/violin.jsx';
import { BUDGET, costOf } from './bench.js';

const seeded = seed => { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };
const rnd = seeded(5);
const cloud = d3.range(300).map(() => ({ a: 100 * rnd(), b: 50 * rnd() }));
const paths = scene => scene.marks.filter(s => s.t === 'path');

/* ---------- hexbin ---------- */

test('hexbin puts every row in the cell whose centre is nearest (brute force)', () => {
  const cells = hexbin(cloud, { x: 'a', y: 'b', binWidth: 9 });
  const inCell = new Map(cells.map(c => [c, 0]));
  for (const d of cloud) {
    const best = d3.least(cells, c => (c.cx - d.a) ** 2 + (c.cy - d.b) ** 2);
    inCell.set(best, inCell.get(best) + 1);
  }
  expect(cells.map(c => c.count)).toEqual(cells.map(c => inCell.get(c)));
});

test('hexbin with the plot size gives hexagons regular on screen; without it, in data space', () => {
  const side = (cells, sx, sy) => cells.flatMap(c => c.points.map((p, i) => Math.hypot((p[0] - c.points[(i + 1) % 6][0]) * sx, (p[1] - c.points[(i + 1) % 6][1]) * sy)));
  const [xs, ys] = [d3.extent(cloud, d => d.a), d3.extent(cloud, d => d.b)];
  const sized = hexbin(cloud, { x: 'a', y: 'b', binWidth: 10, width: 200, height: 60 });
  const pixels = side(sized, 200 / (xs[1] - xs[0]), 60 / (ys[1] - ys[0]));
  expect(d3.max(pixels) - d3.min(pixels)).toBeLessThan(1e-9);
  const plain = side(hexbin(cloud, { x: 'a', y: 'b', binWidth: 10 }), 1, 1);
  expect(d3.max(plain) - d3.min(plain)).toBeLessThan(1e-9);
});

test('hexbin drops rows without a finite x or y, and an empty input has no cells', () => {
  const cells = hexbin([{ a: 1, b: 1 }, { a: null, b: 2 }, { a: 3, b: NaN }, { a: 2, b: 2 }], { x: 'a', y: 'b', binWidth: 5 });
  expect(d3.sum(cells, c => c.count)).toBe(2);
  expect(hexbin([], { x: 'a', y: 'b', binWidth: 5 })).toEqual([]);
});

/* ---------- Polygon ---------- */

test('Polygon trains the scales from its rings alone, with no x or y channel', () => {
  const square = [[0, 0], [10, 0], [10, 4], [0, 4]];
  const poly = Polygon({ points: 'ring' });
  const seen = [];
  const { scene } = compile({ width: 200, height: 100, margin: { top: 0, right: 0, bottom: 0, left: 0 }, data: [{ ring: square }], children: [{ ...poly, render: (r, c) => { seen.push(c); return poly.render(r, c); } }] });
  expect(seen[0].x(0)).toBe(0);
  expect(seen[0].x(10)).toBe(200);
  expect(seen[0].y(0)).toBe(100);
  expect(seen[0].y(4)).toBe(0);
  expect(paths(scene)).toHaveLength(1);
});

test('Polygon cuts a hole: wound against its outer ring, in either input winding', () => {
  const outer = [[0, 0], [10, 0], [10, 10], [0, 10]], hole = [[3, 3], [7, 3], [7, 7], [3, 7]];
  for (const inner of [hole, hole.slice().reverse()]) {
    const { scene } = compile({ width: 100, height: 100, data: [{ ring: outer, holes: [inner] }], children: [Polygon({ points: 'ring' })] });
    const rings = paths(scene)[0].d.split('Z').filter(Boolean).map(s => s.replace(/^M/, '').split('L').map(p => p.split(',').map(Number)));
    expect(rings).toHaveLength(2);
    expect(d3.polygonArea(rings[0]) * d3.polygonArea(rings[1])).toBeLessThan(0);
  }
});

/* ---------- contours ---------- */

test('contours() of a ring-shaped field gives one polygon with a hole, in the units asked for', () => {
  const n = 41, field = d3.range(n * n).map(i => { const r = Math.hypot((i % n) - 20, Math.floor(i / n) - 20); return r > 6 && r < 14 ? 1 : 0; });
  const rows = contours(field, { width: n, height: n, thresholds: [0.5], x: [-2, 2], y: [-2, 2] });
  expect(rows).toHaveLength(1);
  expect(rows[0].holes).toHaveLength(1);
  const radius = ring => d3.mean(ring, ([x, y]) => Math.hypot(x, y));
  expect(radius(rows[0].points)).toBeCloseTo(14 / 10, 1);
  expect(radius(rows[0].holes[0])).toBeCloseTo(6 / 10, 1);
  expect(compile({ width: 100, height: 100, data: rows, children: [Polygon({ points: 'points' })] }).scene.marks).toHaveLength(1);
});

test('densityContours() is deterministic, finite, and costed (SPEC 6)', () => {
  const run = () => densityContours(cloud, { x: 'a', y: 'b', thresholds: 6 });
  expect(run()).toEqual(run());
  expect(run().every(p => p.points.flat().every(Number.isFinite))).toBe(true);
  expect(densityContours([{ a: 1, b: 1 }], { x: 'a', y: 'b' })).toEqual([]);
  expect(costOf(run)).toBeLessThan(2 * BUDGET);   // measured about 0.2 of the reference plot at 6 levels (SPEC 6); a stage may cost BUDGET, so it is documented, with a `key`
});

test('delaunay() has nothing to triangulate below three points', () => {
  expect(delaunay([{ x: 0, y: 0 }, { x: 1, y: 1 }], { x: 'x', y: 'y' })).toEqual([]);
  expect(delaunay([{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 0, y: 4 }], { x: 'x', y: 'y' })[0].ids.toSorted()).toEqual([0, 1, 2]);
});

/* ---------- regress, difference, waterfall ---------- */

test('regress() needs three rows and a spread in x', () => {
  expect(regress([{ x: 1, y: 1 }, { x: 2, y: 2 }], { x: 'x', y: 'y' })).toEqual([]);
  expect(regress([{ x: 1, y: 1 }, { x: 1, y: 2 }, { x: 1, y: 3 }], { x: 'x', y: 'y' })).toEqual([]);
  expect(regress(d3.range(5).map(i => ({ x: i, y: 2 * i })), { x: 'x', y: 'y', points: 7 })).toHaveLength(7);
});

test('difference() splits runs at a crossing, which both runs contain; a gap of one sign is one run', () => {
  const data = [[0, 3, 1], [1, 1, 3], [2, 0, 2], [3, 4, 1]].flatMap(([t, a, b]) => [{ t, s: 'a', v: a }, { t, s: 'b', v: b }]);
  const rows = difference(data, { x: 't', y: 'v', by: 's', a: 'a', b: 'b' });
  expect(rows.map(r => r.run)).toEqual([0, 0, 1, 1, 1, 1, 2, 2]);
  expect(rows.filter(r => r.y1 === r.y2).map(r => r.run)).toEqual([0, 1, 1, 2]);
  expect(rows.filter(r => r.y1 !== r.y2).every(r => r.sign === Math.sign(r.y1 - r.y2))).toBe(true);
  expect(difference(data.filter(d => d.t !== 1), { x: 't', y: 'v', by: 's', a: 'a', b: 'b' }).map(r => +r.x.toFixed(6))).toEqual([0, 1, 1, 2, 2.4, 2.4, 3]);   // a missing x in one series is skipped
});

test('waterfall() keeps the fields of each row, and merges the fields given for the total', () => {
  const rows = waterfall([{ n: 'a', delta: 5 }, { n: 'b', delta: -2 }], { value: 'delta', total: { n: 'net' } });
  expect(rows).toEqual([{ n: 'a', delta: 5, from: 0, to: 5 }, { n: 'b', delta: -2, from: 5, to: 3 }, { n: 'net', from: 0, to: 3, total: true }]);
  expect(waterfall([{ delta: 1 }], { value: 'delta' })).toHaveLength(1);
});

/* ---------- RuleX, RuleY, TickX, TickY ---------- */

test('rules take the muted theme colour, a stated extent on the other axis, and own no inherited channel', () => {
  const data = [{ t: 1, v: 10 }, { t: 5, v: 30 }];
  const { scene } = compile({ width: 200, height: 100, data, x: 't', y: 'v', children: [Dot(), RuleX({ data: [{ at: 3, lo: 12, hi: 20 }], x: 'at', y1: 'lo', y2: 'hi' }), RuleY({ y: 20, x1: 2, x2: 4 })] });
  const [vertical, horizontal] = scene.marks.filter(s => s.t === 'line');
  expect(vertical.x1).toBe(vertical.x2);
  expect(vertical.y1).toBeGreaterThan(vertical.y2);
  expect(vertical.y1).toBeLessThan(100);
  expect(horizontal.y1).toBe(horizontal.y2);
  expect(horizontal.x2 - horizontal.x1).toBeLessThan(200);
  expect(horizontal.stroke).toBe('#5b6879');
});

test('TickY is a short horizontal line across each point', () => {
  const { scene } = compile({ width: 200, height: 100, data: [{ t: 1, v: 10 }, { t: 5, v: 30 }], x: 't', y: 'v', children: [TickY({ length: 8 })] });
  const lines = scene.marks.filter(s => s.t === 'line');
  expect(lines).toHaveLength(2);
  lines.forEach(l => { expect(l.y1).toBe(l.y2); expect(l.x2 - l.x1).toBe(8); });
  expect(TickX().mark).toBe('tickx');
});

/* ---------- Swarm ---------- */

test('Swarm along a band y axis spreads vertically, honours per-row sizes and throws without a band', () => {
  const data = [{ g: 'a', v: 5, s: 1 }, { g: 'a', v: 5.1, s: 4 }, { g: 'a', v: 5.2, s: 1 }, { g: 'b', v: 5, s: 2 }];
  const { scene } = compile({ width: 200, height: 100, data, x: 'v', y: 'g', children: [Swarm({ size: 's' })] });
  const c = scene.marks.filter(s => s.t === 'circle');
  expect(c).toHaveLength(4);
  for (const [i, j] of d3.cross(d3.range(4), d3.range(4)).filter(([i, j]) => i < j)) expect(Math.hypot(c[i].cx - c[j].cx, c[i].cy - c[j].cy)).toBeGreaterThanOrEqual(c[i].r + c[j].r);
  expect(new Set(c.slice(0, 3).map(s => s.cx)).size).toBe(3);   // same group: the same value, a different place on y
  expect(() => compile({ width: 100, height: 100, data: [{ a: 1, b: 2 }], x: 'a', y: 'b', children: [Swarm()] })).toThrow(/band/);
});

/* ---------- recipes ---------- */

const signal = d3.range(8).map(t => ({ t, v: 5 + t }));

test('recipe: a Tooltip follows the hovered datum, flips at the right edge and stays in the plot', () => {
  const at = hover => compile({ width: 200, height: 100, data: signal, x: 't', y: 'v', children: [Dot(), Tooltip({ data: [signal[hover]], x: 't', y: 'v', lines: d => [`t ${d.t}`, `value ${d.v}`] })] });
  const [near, far] = [at(1), at(7)];
  const box = scene => scene.front.find(s => s.t === 'rect');
  expect(near.scene.front.filter(s => s.t === 'text').map(s => s.text)).toEqual(['t 1', 'value 6']);
  expect(box(far.scene).x + box(far.scene).width).toBeLessThanOrEqual(200);
  expect(box(far.scene).x).toBeLessThan(box(near.scene).x + 200);
  expect(near.key).not.toBe(far.key);
  expect(at(1).key).toBe(near.key);
});

test('recipe: a violin is kde plus an ordinary horizontal Area, wider where the data is denser', () => {
  const r = seeded(9);
  const samples = ['fast', 'slow'].flatMap((g, k) => d3.range(40).map(() => ({ g, ms: 20 + 30 * k + 10 * (r() + r() - 1) })));
  const { rows, names } = violin(samples, { by: 'g', value: 'ms' });
  expect(names).toEqual(['fast', 'slow']);
  const { scene } = compile({ width: 240, height: 140, data: rows, y: 'y', x1: 'x1', x2: 'x2', group: 'key', children: [Area(), Axis({ channel: 'x', ticks: [1, 2], format: i => names[i - 1] })] });
  expect(paths(scene)).toHaveLength(2);
  expect(scene.back.filter(s => s.t === 'text').map(s => s.text)).toEqual(expect.arrayContaining(['fast', 'slow']));
  const fast = rows.filter(x => x.key === 'fast');
  expect(d3.max(fast, x => x.x2 - x.x1)).toBeGreaterThan(d3.min(fast, x => x.x2 - x.x1));
  fast.forEach(x => expect((x.x1 + x.x2) / 2).toBeCloseTo(1, 9));
});

test('delaunay ids index the data rows, whatever rows were dropped before them', () => {
  const data = [{ a: null, b: 1 }, { a: 0, b: 0 }, { a: 4, b: 0 }, { a: 2, b: 3 }];
  const [tri] = delaunay(data, { x: 'a', y: 'b' });
  expect([...tri.ids].sort()).toEqual([1, 2, 3]);
  tri.ids.forEach((id, i) => expect(tri.points[i]).toEqual([data[id].a, data[id].b]));
});

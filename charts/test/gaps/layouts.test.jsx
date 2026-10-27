// Gap examples g39, g41-g45: layouts and spatial statistics that return rows for generic marks
// (GAPS 3.8a, 2.2, 3.11, 3.10, 3.14). Data is invented and seeded.
import { test, expect } from 'vitest';
import * as d3 from 'd3';
import { compile, Scale } from '../../core.jsx';
import { Line, Rect, Dot, Text } from '../../marks.jsx';
import { need, tap, near, seeded } from './support.js';

/* ---------- g39: one layout statistic, two marks ---------- */

const budget = [
  { path: 'ops/hosting', cost: 50 }, { path: 'ops/support', cost: 20 }, { path: 'dev/tools', cost: 10 },
  { path: 'dev/salaries', cost: 90 }, { path: 'misc', cost: 5 }, { path: 'ops/legal', cost: 25 },
];

test.fails('g39 treemap() returns rows that Rect and Text both draw, with areas proportional to value', () => {
  const rows = need('treemap')(budget, { path: 'path', value: 'cost' });
  const isLeaf = r => !rows.some(o => o.parentId === r.id);
  const leaves = rows.filter(isLeaf);
  const rects = tap(<Rect x1="x0" x2="x1" y1="y0" y2="y1" color="branch" />);
  const labels = tap(<Text x="x0" y="y0" text={d => d.id} />);
  const unit = [<Scale channel="x" domain={[0, 1]} />, <Scale channel="y" domain={[0, 1]} />];
  const { scene } = compile({ width: 300, height: 200, data: leaves, children: [rects, labels, ...unit] });
  expect(leaves).toHaveLength(budget.length);
  expect(rects.seen[0].rows.map(r => r.d)).toEqual(labels.seen[0].rows.map(r => r.d));   // one set of rows, two marks
  const { area } = rects.seen[0].ctx, total = d3.sum(budget, d => d.cost);
  const shapes = scene.marks.filter(s => s.t === 'rect');
  expect(shapes).toHaveLength(budget.length);
  shapes.forEach((s, i) => near((s.width * s.height) / (area.width * area.height), leaves[i].value / total, 0.002));
  leaves.forEach(l => { expect(l.y0).toBeGreaterThanOrEqual(0); expect(l.y1).toBeLessThanOrEqual(1); });
});

/* ---------- g41: parallel coordinates from wide rows ---------- */

const specs = [{ id: 'm1', weight: 1200, power: 90, range: 410 }, { id: 'm2', weight: 900, power: 70, range: 520 },
  { id: 'm3', weight: 1500, power: 140, range: 380 }, { id: 'm4', weight: 1100, power: 110, range: 450 }];

test.fails('g41 fold, then normalize by variable, then Line over a band axis of variable names', () => {
  const before = JSON.stringify(specs);
  const long = need('fold')(specs, { keys: ['weight', 'power', 'range'], key: 'variable', value: 'value' });
  const flat = need('normalize')(long, { by: 'variable', value: 'value', as: 'norm' });
  const line = tap(<Line group="id" />);
  const { scene } = compile({ width: 300, height: 200, data: flat, x: 'variable', y: 'norm', children: [line] });
  expect(JSON.stringify(specs)).toBe(before);
  expect(scene.marks.filter(s => s.t === 'path')).toHaveLength(specs.length);
  for (const v of ['weight', 'power', 'range']) {   // within a variable, norm is an affine function of the value
    const rows = flat.filter(r => r.variable === v);
    const slopes = rows.slice(1).map(r => (r.norm - rows[0].norm) / (r.value - rows[0].value));
    slopes.forEach(s => { near(s, slopes[0], 1e-9); expect(s).toBeGreaterThan(0); });
  }
});

/* ---------- g42: a flow diagram ---------- */

// Uneven nodes: totals differ a lot.
const moves = [['in', 'a', 30], ['in', 'b', 6], ['a', 'out', 25], ['a', 'b', 5], ['b', 'out', 11]].map(([source, target, value]) => ({ source, target, value }));
const stackedApart = nodes => {
  for (const col of d3.group(nodes, n => n.x0).values()) {
    const sorted = d3.sort(col, n => n.y0);
    d3.pairs(sorted).forEach(([p, q]) => expect(q.y0).toBeGreaterThanOrEqual(p.y1 - 1e-9));
  }
};

test.fails('g42 flow() lays out nodes that never overlap, sized by their throughput', () => {
  const { nodes } = need('flow')(moves, { source: 'source', target: 'target', value: 'value', width: 300, height: 200 });
  expect(nodes).toHaveLength(4);
  stackedApart(nodes);
  const size = id => { const n = nodes.find(o => o.id === id); return n.y1 - n.y0; };
  near(size('a') / size('b'), 30 / 11, 0.05);   // the larger of in/out for a is 30; b: max(11, 11)
});

test.fails('g42 flow() reports a cycle, or handles it without overlapping or NaN', () => {
  const loop = [...moves, { source: 'out', target: 'in', value: 4 }];
  let result;
  try { result = need('flow')(loop, { source: 'source', target: 'target', value: 'value', width: 300, height: 200 }); } catch (e) {
    expect(e.message).toMatch(/cycle/i);   // reporting it is allowed
    return;
  }
  for (const n of result.nodes) for (const k of ['x0', 'x1', 'y0', 'y1']) expect(Number.isFinite(n[k])).toBe(true);
  stackedApart(result.nodes);
});

/* ---------- g43: hexagonal density ---------- */

const rnd = seeded(7);
const scatter = d3.range(80).map(() => ({ px: 40 + 25 * (rnd() + rnd() - 1) + (rnd() < 0.3 ? 30 : 0), py: 20 + 12 * (rnd() + rnd() - 1) }));

test.fails('g43 hexbin counts sum to the row count, and count trains a colour scale two marks share', () => {
  const cells = need('hexbin')(scatter, { x: 'px', y: 'py', binWidth: 10, width: 200, height: 120 });
  expect(d3.sum(cells, c => c.count)).toBe(scatter.length);
  cells.forEach(c => { expect(c.count).toBeGreaterThan(0); expect(c.points).toHaveLength(6); });
  const hexes = tap(need('Polygon')({ points: 'points', color: 'count' }));
  const dots = tap(<Dot color="count" />);
  compile({ width: 300, height: 200, data: cells, x: 'cx', y: 'cy', children: [hexes, dots] });
  const [a, b] = [hexes.seen[0].ctx.color, dots.seen[0].ctx.color];
  expect(b).toBe(a);
  expect(a.domain()).toEqual(d3.extent(cells, c => c.count));
});

/* ---------- g44: contours and cells as statistics plus a polygon mark ---------- */

test.fails('g44 contours() of a grid return rings at the requested level', () => {
  const n = 41, field = d3.range(n * n).map(i => { const x = ((i % n) - 20) / 10, y = (Math.floor(i / n) - 20) / 10; return Math.exp(-(x * x + y * y)); });
  const rings = need('contours')(field, { width: n, height: n, thresholds: [0.5] });
  const level = rings.filter(r => r.level === 0.5);
  expect(level.length).toBeGreaterThan(0);
  for (const r of level) for (const [x, y] of r.points) near(Math.hypot((x - 20) / 10, (y - 20) / 10), Math.sqrt(Math.LN2), 0.06);   // exp(-r^2) = 1/2
  const polygons = tap(need('Polygon')({ points: 'points' }));
  expect(compile({ width: 200, height: 200, data: level, children: [polygons] }).scene.marks).toHaveLength(level.length);
});

test.fails('g44 densityContours() of points nest: higher levels enclose less area', () => {
  const r = seeded(11);
  const cloud = d3.range(120).map(() => ({ x: 5 * (r() + r() - 1), y: 5 * (r() + r() - 1) }));
  const rings = need('densityContours')(cloud, { x: 'x', y: 'y', bandwidth: 1, thresholds: 4 });
  const area = level => d3.max(rings.filter(g => g.level === level), g => Math.abs(d3.polygonArea(g.points)));
  const levels = d3.sort([...new Set(rings.map(g => g.level))]);
  expect(levels.length).toBeGreaterThan(1);
  d3.pairs(levels).forEach(([lo, hi]) => expect(area(hi)).toBeLessThan(area(lo)));
});

test.fails('g44 delaunay() cells satisfy the empty-circle rule and the triangle count', () => {
  const r = seeded(3);
  const sites = d3.range(9).map(() => ({ x: 100 * r(), y: 100 * r() }));
  const tris = need('delaunay')(sites, { x: 'x', y: 'y' });
  const hull = d3.polygonHull(sites.map(s => [s.x, s.y]));
  expect(tris).toHaveLength(2 * sites.length - 2 - hull.length);
  for (const t of tris) {
    const [[ax, ay], [bx, by], [cx, cy]] = t.points;
    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
    const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
    const R = Math.hypot(ax - ux, ay - uy);
    sites.forEach(s => { if (!t.points.some(([px, py]) => px === s.x && py === s.y)) expect(Math.hypot(s.x - ux, s.y - uy)).toBeGreaterThanOrEqual(R - 1e-9); });
  }
});

/* ---------- g45: a beeswarm ---------- */

// Documented as a mark (`Swarm`) in this example; a pixel-stage position would be the alternative
// (GAPS 3.14 decides). The assertion is the same either way: nothing overlaps.
const rs = seeded(21);
const readingsPerGroup = ['low', 'mid', 'high'].flatMap((g, k) => d3.range(14).map(() => ({ g, v: 10 + 6 * k + 2 * (rs() + rs() - 1) })));
const R = 3;

test('g45 without a swarm, clustered dots overlap (the problem)', () => {
  const { scene } = compile({ width: 160, height: 100, data: readingsPerGroup, x: 'g', y: 'v', children: [<Dot r={R} />] });
  const c = scene.marks.filter(s => s.t === 'circle');
  const overlapping = d3.cross(c, c).filter(([p, q]) => p !== q && Math.hypot(p.cx - q.cx, p.cy - q.cy) < 2 * R);
  expect(overlapping.length).toBeGreaterThan(0);
});

test.fails('g45 a swarm keeps every dot on its value and no two dots overlap', () => {
  const swarm = tap(need('Swarm')({ r: R }));
  const { scene } = compile({ width: 160, height: 100, data: readingsPerGroup, x: 'g', y: 'v', children: [swarm] });
  const c = scene.marks.filter(s => s.t === 'circle');
  expect(c).toHaveLength(readingsPerGroup.length);
  c.forEach((s, i) => near(s.cy, swarm.seen[0].ctx.y(readingsPerGroup[i].v), 0.02));
  const bad = d3.cross(c.keys(), c.keys()).filter(([i, j]) => i < j && Math.hypot(c[i].cx - c[j].cx, c[i].cy - c[j].cy) < 2 * R - 0.01);
  expect(bad).toEqual([]);
});

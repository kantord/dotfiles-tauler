// Layout statistics (GAPS 3.8a, 2.2) and the shapes that draw them (GAPS 3.9). Invented data.
import { test, expect } from 'vitest';
import * as d3 from 'd3';
import '../../test/tauler.js';
import { compile, Scale } from '../core.jsx';
import { Rect, Dot, Link, Area, Text } from '../marks.jsx';
import { Treemap, Tree, Pack, Partition } from '../hierarchy.jsx';
import { treemap, tree, pack, partition, flow } from '../stats.jsx';
import { BUDGET, costOf } from './bench.js';

const disk = [
  { path: 'home/media/photos', mb: 420 }, { path: 'home/media/music', mb: 260 }, { path: 'home/media/video', mb: 610 },
  { path: 'home/code/tauler', mb: 180 }, { path: 'home/code/enwiro', mb: 90 }, { path: 'home/code/scratch', mb: 30 },
  { path: 'home/mail', mb: 150 }, { path: 'home/notes', mb: 12 },
];
const [W, H, none] = [240, 140, { top: 0, right: 0, bottom: 0, left: 0 }];
const pixels = [<Scale channel="x" domain={[0, W]} />, <Scale channel="y" domain={[0, H]} />];
const draw = children => compile({ width: W, height: H, margin: none, data: [], children }).scene.marks;
const sorted = (shapes, keys) => d3.sort(shapes.map(s => keys.map(k => Math.round(s[k]))), r => r.join());

/* ---------- parity: the statistic plus generic marks draws what the fused mark drew ---------- */

// The label behaviour of Treemap: a name only where it fits its rectangle.
test('Text fit over treemap() rows labels only the rectangles that hold their name', () => {
  const leaves = treemap(disk, { path: 'path', value: 'mb', size: [W, H] }).filter(n => n.leaf);
  const { scene } = compile({ width: W, height: H, margin: none, data: leaves, children: [Text({ x1: 'x0', x2: 'x1', y1: 'y0', y2: 'y1', text: d => d.name, fontSize: 10, fit: true, textAnchor: 'start' }), ...pixels] });
  const labels = scene.front.map(s => s.text);
  expect(labels).toContain('video');
  expect(labels).not.toContain('notes');
  const old = compile({ width: W, height: H, margin: none, data: disk, children: [Treemap({ path: 'path', value: 'mb', padding: 0, label: d => d.path.split('/').at(-1) })] }).scene.front;
  expect(d3.sort(labels)).toEqual(d3.sort(old.map(s => s.text)));   // the same names as the fused mark's own labels
});

test('treemap() plus Rect draws the rects of Treemap', () => {
  const old = compile({ width: W, height: H, margin: none, data: disk, children: [Treemap({ path: 'path', value: 'mb', padding: 0 })] }).scene.marks;
  const leaves = treemap(disk, { path: 'path', value: 'mb', size: [W, H] }).filter(n => n.leaf);
  const now = draw([Rect({ data: leaves, x1: 'x0', x2: 'x1', y1: 'y0', y2: 'y1' }), ...pixels]);
  expect(sorted(now, ['x', 'y', 'width', 'height'])).toEqual(sorted(old, ['x', 'y', 'width', 'height']));
});

test('partition() plus Rect draws the rects of Partition', () => {
  const old = compile({ width: W, height: H, margin: none, data: disk, children: [Partition({ path: 'path', value: 'mb', padding: 0 })] }).scene.marks;
  const nodes = partition(disk, { path: 'path', value: 'mb', size: [W, H] });
  const now = draw([Rect({ data: nodes, x1: 'x0', x2: 'x1', y1: 'y0', y2: 'y1' }), ...pixels]);
  expect(sorted(now, ['x', 'y', 'width', 'height'])).toEqual(sorted(old, ['x', 'y', 'width', 'height']));
});

test('pack() plus Dot rx draws the circles of Pack', () => {
  const old = compile({ width: W, height: H, margin: none, data: disk, children: [Pack({ path: 'path', value: 'mb' })] }).scene.marks;
  const nodes = pack(disk, { path: 'path', value: 'mb', size: [W, H] });
  const now = draw([Dot({ data: nodes, x: 'x', y: 'y', rx: 'r' }), ...pixels]);
  expect(sorted(now, ['cx', 'cy', 'r'])).toEqual(sorted(old, ['cx', 'cy', 'r']));
});

test('tree() plus Link curve and Dot draws a link per parent and a node per path, deeper further right', () => {
  const procs = ['init', 'init/sshd', 'init/sshd/bash', 'init/cron', 'init/bar', 'init/bar/tick'].map(path => ({ path }));
  const { nodes, links } = tree(procs, { path: 'path', size: [W, H] });
  const shapes = draw([Link({ data: links, x1: 'x1', y1: 'y1', x2: 'x2', y2: 'y2', curve: 'link-horizontal' }), Dot({ data: nodes, x: 'x', y: 'y' }), ...pixels]);
  expect(shapes.filter(s => s.t === 'path')).toHaveLength(procs.length - 1);
  expect(shapes.filter(s => s.t === 'circle')).toHaveLength(procs.length);
  const x = id => nodes.find(n => n.id === id).x;
  expect(x('/init')).toBeLessThan(x('/init/sshd'));
  expect(x('/init/sshd')).toBeLessThan(x('/init/sshd/bash'));
  const old = compile({ width: W, height: H, margin: none, data: procs, children: [Tree({ path: 'path' })] }).scene.marks;
  expect(old.filter(s => s.t === 'path')).toHaveLength(links.length);
});

test('id and parent work as well as paths, and a missing hierarchy field throws', () => {
  const org = [{ id: 'root' }, { id: 'a', parent: 'root', n: 3 }, { id: 'b', parent: 'root', n: 1 }];
  const rows = treemap(org, { id: 'id', parent: 'parent', value: 'n' });
  expect(rows.filter(r => r.leaf).map(r => r.id).sort()).toEqual(['a', 'b']);
  expect(() => treemap(org, { value: 'n' })).toThrow(/path/);
  expect(() => treemap(org, { id: 'id', parent: 'parent', tile: 'nope' })).toThrow(/nope/);
});

test('a node row has the branch below the trunk, its parent and a name', () => {
  const rows = treemap(disk, { path: 'path', value: 'mb' });
  const video = rows.find(r => r.name === 'video');
  expect(video).toMatchObject({ parentId: '/home/media', branch: '/home/media', leaf: true, depth: 2, value: 610 });
  expect(rows.find(r => r.name === 'home').branch).toBeNull();   // the trunk is above its branches
});

test('the four layouts cost less than the budget at 60 nodes', () => {
  const big = d3.range(60).map(i => ({ path: `g${i % 6}/h${i % 4}/n${i}`, v: 1 + (i % 7) }));
  for (const layout of [treemap, pack, partition, tree]) expect(costOf(() => layout(big, { path: 'path', value: 'v' }))).toBeLessThan(BUDGET);
});

/* ---------- 3.9: curved links, ribbons, data-unit circles ---------- */

test('Link takes any Line curve by name, and a straight Link stays a line', () => {
  const one = (curve) => compile({ width: 100, height: 100, data: [{ a: 1, b: 1, c: 5, e: 4 }], x1: 'a', y1: 'b', x2: 'c', y2: 'e', children: [Link({ curve })] }).scene.marks[0];
  expect(one(undefined).t).toBe('line');
  expect(one('link-horizontal').d).toMatch(/^M[\d.,]+C/);
  expect(one('step-after').t).toBe('path');
});

test('an unnamed Link curve throws', () => {
  expect(() => compile({ width: 100, height: 100, data: [{ a: 1 }], x1: 'a', y1: 'a', x2: 'a', y2: 'a', children: [Link({ curve: 'nope' })] })).toThrow(/nope/);
});

test('a ribbon trains the y scale to cover its thickness, and curves with link-horizontal', () => {
  const ribbon = curve => compile({ width: 200, height: 100, data: [{ a: 0, b: 1, c: 9, e: 8, w: 2 }], children:
    [Area({ x1: 'a', x2: 'c', y1: 'b', y2: 'e', thickness1: 'w', thickness2: 3, curve })] });
  expect(ribbon().scene.marks[0].d).not.toContain('C');
  expect(ribbon('link-horizontal').scene.marks[0].d).toContain('C');
  const { scene } = ribbon();
  expect(scene.marks[0].d).toMatch(/Z$/);
});

test('Dot ry alone reads the y scale, and a function gives each circle its own radius', () => {
  const [a, b] = compile({ width: 120, height: 120, margin: none, data: [{ x: 2, y: 2, k: 1 }, { x: 4, y: 4, k: 2 }], x: 'x', y: 'y',
    children: [Dot({ ry: d => d.k }), Scale({ channel: 'x', domain: [0, 10] }), Scale({ channel: 'y', domain: [0, 10] })] }).scene.marks;
  expect([a.r, b.r]).toEqual([12, 24]);
});

/* ---------- 2.2: the flow layout ---------- */

const moves = [['in', 'a', 30], ['in', 'b', 6], ['a', 'out', 25], ['a', 'b', 5], ['b', 'out', 11]].map(([source, target, value]) => ({ source, target, value }));
const lay = (data, opts = {}) => flow(data, { source: 'source', target: 'target', value: 'value', width: 300, height: 200, ...opts });
const column = (nodes, id) => nodes.find(n => n.id === id).depth;
const overlaps = nodes => [...d3.group(nodes, n => n.x0).values()].some(col => d3.pairs(d3.sort(col, n => n.y0)).some(([p, q]) => q.y0 < p.y1 - 1e-9));
const spread = ({ nodes, links }) => {
  const mid = id => { const n = nodes.find(o => o.id === id); return (n.y0 + n.y1) / 2; };
  return d3.sum(links, l => Math.abs(mid(l.sourceId) - mid(l.targetId)) * l.value);
};

test('flow: columns follow the longest path, nodes sit inside the area and links meet the node edges', () => {
  const { nodes, links } = lay(moves);
  expect(['in', 'a', 'b', 'out'].map(id => column(nodes, id))).toEqual([0, 1, 2, 3]);
  expect(overlaps(nodes)).toBe(false);
  for (const n of nodes) { expect(n.y0).toBeGreaterThanOrEqual(-1e-9); expect(n.y1).toBeLessThanOrEqual(200 + 1e-9); }
  expect(nodes.find(n => n.id === 'out').x1).toBeCloseTo(300);
  const inA = links.find(l => l.sourceId === 'in' && l.targetId === 'a'), a = nodes.find(n => n.id === 'a');
  expect(inA.x2).toBe(a.x0);
  expect(inA.y2).toBeGreaterThanOrEqual(a.y0);
  expect(inA.y2).toBeLessThanOrEqual(a.y1);
});

test('flow: one scale for all nodes, so thickness is value times k and the links of a node fit in it', () => {
  const { nodes, links } = lay(moves);
  const k = links[0].thickness / links[0].value;
  links.forEach(l => expect(l.thickness / l.value).toBeCloseTo(k));
  for (const n of nodes) expect(n.y1 - n.y0).toBeCloseTo(n.value * k);
});

test('flow: a cycle is reported on the closing link and does not change the columns or make NaN', () => {
  const loop = [...moves, { source: 'out', target: 'in', value: 4 }, { source: 'a', target: 'a', value: 1 }];
  const { nodes, links } = lay(loop);
  expect(links.filter(l => l.back).map(l => `${l.sourceId}>${l.targetId}`)).toEqual(['out>in', 'a>a']);
  expect(['in', 'a', 'b', 'out'].map(id => column(nodes, id))).toEqual([0, 1, 2, 3]);
  expect(nodes.find(n => n.id === 'a').value).toBe(31);   // back links count in a node's value (30 + a self-link of 1)
  expect(overlaps(nodes)).toBe(false);
  for (const v of [...nodes.flatMap(n => [n.x0, n.x1, n.y0, n.y1]), ...links.flatMap(l => [l.x1, l.y1, l.x2, l.y2, l.thickness])]) expect(Number.isFinite(v)).toBe(true);
});

test('flow: align left, right and justify place a node that has no successors', () => {
  const uneven = [['s', 'm', 5], ['m', 'e', 5], ['s', 'dead', 2], ['early', 'e', 3]].map(([source, target, value]) => ({ source, target, value }));
  const at = align => Object.fromEntries(lay(uneven, { align }).nodes.map(n => [n.id, n.depth]));
  expect(at('left')).toMatchObject({ s: 0, early: 0, m: 1, dead: 1, e: 2 });
  expect(at('justify')).toMatchObject({ s: 0, early: 0, m: 1, dead: 2, e: 2 });
  expect(at('right')).toMatchObject({ s: 0, early: 1, m: 1, dead: 2, e: 2 });
});

test('flow: more relaxation iterations shorten the weighted links; none leave nodes in input order; none ever overlap', () => {
  const wide = d3.range(24).map(i => ({ source: `s${i % 6}`, target: `t${(i * 5) % 7}`, value: 1 + (i % 4) }));
  const [zero, many] = [lay(wide, { iterations: 0 }), lay(wide, { iterations: 12 })];
  expect(spread(many)).toBeLessThan(spread(zero));
  expect(overlaps(zero.nodes)).toBe(false);
  expect(overlaps(many.nodes)).toBe(false);
  expect(zero.nodes.filter(n => n.depth === 0).map(n => n.id)).toEqual(['s0', 's1', 's2', 's3', 's4', 's5']);
});

test('flow: bad input throws, an empty input is empty, and it draws with Rect and a ribbon Area', () => {
  expect(() => lay([{ source: 'a', target: 'b', value: -1 }])).toThrow(/at least 0/);
  expect(() => lay(moves, { width: 0 })).toThrow(/positive/);
  expect(lay([])).toEqual({ nodes: [], links: [] });
  const { nodes, links } = lay(moves);
  const children = [Rect({ data: nodes, x1: 'x0', x2: 'x1', y1: 'y0', y2: 'y1' }),
    Area({ data: links, curve: 'link-horizontal', x1: 'x1', x2: 'x2', y1: 'y1', y2: 'y2', thickness1: 'thickness', thickness2: 'thickness' }),
    Scale({ channel: 'x', domain: [0, 300] }), Scale({ channel: 'y', domain: [0, 200] })];
  const shapes = compile({ width: 316, height: 216, margin: { top: 8, right: 8, bottom: 8, left: 8 }, data: [], children }).scene.marks;
  expect(shapes.filter(s => s.t === 'rect')).toHaveLength(4);
  expect(shapes.filter(s => s.t === 'path')).toHaveLength(5);
});

test('flow costs less than the budget at 24 links', () => {
  const wide = d3.range(24).map(i => ({ source: `s${i % 8}`, target: `t${(i * 5) % 9}`, value: 1 + (i % 4) }));
  expect(costOf(() => lay(wide))).toBeLessThan(BUDGET);
});

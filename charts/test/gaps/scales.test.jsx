// Gap examples g01-g06: validation, scale types and encoding channels (GAPS 0.1, 1.1, 2.1).
// Open gaps are `test.fails`: they pass while the gap is there and fail once it is closed,
// at which point `fails` is removed. Data is invented and seeded.
import { test, expect } from 'vitest';
import * as d3 from 'd3';
import { compile, Scale, Axis, Grid } from '../../core.jsx';
import { Dot, Line, Bar } from '../../marks.jsx';
import { need, tap, near, edgesOf, W, H } from './support.js';

/* ---------- g01: nothing unsupported is accepted silently ---------- */

const trio = [{ a: 1, b: 2 }, { a: 2, b: 5 }, { a: 3, b: 4 }];
const plotOf = children => compile({ width: W, height: H, data: trio, x: 'a', y: 'b', children });

test.fails('g01 an unsupported scale type throws, naming channel and type', () => {
  expect(() => plotOf([<Dot />, <Scale channel="y" type="sqroot" />])).toThrow(/sqroot/);
  expect(() => plotOf([<Dot />, <Scale channel="y" type="sqroot" />])).toThrow(/\by\b/);
});

test.fails('g01 an unknown channel on Scale throws, naming it', () => {
  expect(() => plotOf([<Dot />, <Scale channel="colour" type="ordinal" />])).toThrow(/colour/);
});

test.fails('g01 an unknown channel on Axis throws, naming it', () => {
  expect(() => plotOf([<Dot />, <Axis channel="z" />])).toThrow(/\bz\b/);
});

test.fails('g01 an unknown channel on Grid throws, naming it', () => {
  expect(() => plotOf([<Dot />, <Grid channel="q" />])).toThrow(/\bq\b/);
});

test('g01 supported types and channels are still accepted', () => {
  expect(() => plotOf([<Dot />, <Scale channel="y" type="log" />, <Axis channel="y" />, <Grid channel="x" />])).not.toThrow();
  expect(() => compile({ width: W, height: H, data: [{ k: 'u', v: 1 }, { k: 'w', v: 2 }], x: 'k', y: 'v',
    children: [<Bar />, <Scale channel="x" type="band" />, <Axis channel="x" />] })).not.toThrow();
});

/* ---------- g02: a square-root scale ---------- */

// Deliberately unsorted: the data is the raw input.
const masses = [{ id: 'p', mass: 16 }, { id: 'q', mass: 1 }, { id: 'r', mass: 36 }, { id: 's', mass: 4 }, { id: 't', mass: 25 }, { id: 'u', mass: 9 }];

test.fails('g02 sqrt size scale: dot area is proportional to the value (r**2 / value constant)', () => {
  const dots = tap(<Dot size="mass" />);
  const { scene } = compile({ width: W, height: H, data: masses, x: 'id', y: 'mass',
    children: [dots, <Scale channel="size" type="sqrt" domain={[0, 36]} range={[0, 10]} />] });
  expect(dots.seen[0].rows.map(r => r.d)).toEqual(masses);   // raw input, not reordered or reshaped
  expect(dots.props.r).toBeUndefined();                       // no hand-written radius function
  const circles = scene.marks.filter(s => s.t === 'circle');
  expect(circles).toHaveLength(masses.length);
  circles.forEach((c, i) => near((c.r * c.r) / masses[i].mass, 100 / 36, 0.01));
  near(Math.max(...circles.map(c => c.r)), 10, 0.01);
});

test.fails('g02 a sqrt scale on a position channel bends the axis', () => {
  const dots = tap(<Dot />);
  compile({ width: W, height: H, data: [{ x: 1, y: 1 }, { x: 4, y: 2 }, { x: 9, y: 3 }, { x: 16, y: 4 }], x: 'x', y: 'y',
    children: [dots, <Scale channel="x" type="sqrt" domain={[0, 16]} />] });
  const { x } = dots.seen[0].ctx;
  near(x(4) - x(0), 2 * (x(1) - x(0)), 0.01);
  near(x(16) - x(0), 4 * (x(1) - x(0)), 0.01);
});

/* ---------- g03: classed colour scales ---------- */

const readings = [3, 12, 18, 25, 38, 7].map((v, i) => ({ id: 'r' + i, v }));
const CLASSES = ['#2a4d9b', '#3d9fb0', '#e0b341', '#c4452f'];
const fillsOf = scene => scene.marks.filter(s => s.t === 'circle').map(s => s.fill);

test.fails('g03 threshold colour scale: classes by explicit edges, readable from the scale', () => {
  const dots = tap(<Dot color="v" />);
  const { scene } = compile({ width: W, height: H, data: readings, x: 'id', y: 'v',
    children: [dots, <Scale channel="color" type="threshold" domain={[10, 20, 30]} range={CLASSES} />] });
  const { color } = dots.seen[0].ctx;
  expect(edgesOf(color)).toEqual([10, 20, 30]);
  expect(fillsOf(scene)).toEqual([CLASSES[0], CLASSES[1], CLASSES[1], CLASSES[2], CLASSES[3], CLASSES[0]]);
  expect(dots.props.fill).toBeUndefined();   // no raw function inside `fill`
});

test.fails('g03 quantile colour scale: equal-count classes, edges readable from the scale', () => {
  const data = [5, 50, 12, 80, 31, 9, 64, 27].map((v, i) => ({ id: 'q' + i, v }));
  const dots = tap(<Dot color="v" />);
  const { scene } = compile({ width: W, height: H, data, x: 'id', y: 'v',
    children: [dots, <Scale channel="color" type="quantile" range={CLASSES} />] });
  const fills = fillsOf(scene);
  for (const c of CLASSES) expect(fills.filter(f => f === c)).toHaveLength(2);   // 8 values, 4 classes
  const edges = edgesOf(dots.seen[0].ctx.color);
  expect(edges).toHaveLength(3);
  expect(edges).toEqual([...edges].sort((a, b) => a - b));
});

test.fails('g03 quantize colour scale: equal-width classes, edges readable from the scale', () => {
  const data = [2, 9, 11, 19, 21, 29].map((v, i) => ({ id: 'w' + i, v }));
  const dots = tap(<Dot color="v" />);
  const { scene } = compile({ width: W, height: H, data, x: 'id', y: 'v',
    children: [dots, <Scale channel="color" type="quantize" domain={[0, 30]} range={CLASSES.slice(0, 3)} />] });
  expect(edgesOf(dots.seen[0].ctx.color)).toEqual([10, 20]);
  expect(fillsOf(scene)).toEqual([0, 0, 1, 1, 2, 2].map(i => CLASSES[i]));
});

/* ---------- g04: categories on a point scale ---------- */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
const visits = MONTHS.map((month, i) => ({ month, visits: 40 + 7 * i + (i % 2) * 5 }));

test.fails('g04 a point scale puts categories on a line chart with their own labels', () => {
  const line = tap(<Line />);
  const axis = <Axis channel="x" />;
  const { scene } = compile({ width: W, height: H, data: visits, x: 'month', y: 'visits',
    children: [line, <Scale channel="x" type="point" />, axis] });
  expect(axis.props.ticks).toBeUndefined();                            // no manual ticks or format
  expect(axis.props.format).toBeUndefined();
  expect(line.seen[0].rows.map(r => r.x)).toEqual(MONTHS);            // categories, not a numeric index
  const { ctx } = line.seen[0];
  const xs = MONTHS.map(ctx.x), step = xs[1] - xs[0];
  xs.slice(1).forEach((x, i) => near(x - xs[i], step, 0.01));
  expect(xs[0] - ctx.area.left).toBeLessThan(step / 4);                // points, not bands: no end padding
  expect(ctx.area.right - xs.at(-1)).toBeLessThan(step / 4);
  const labels = scene.back.filter(s => s.t === 'text' && MONTHS.includes(s.text)).map(s => s.text);
  expect(labels).toEqual(MONTHS);
});

/* ---------- g05: a computed value trains a scale ---------- */

test.fails('g05 a rank written by a position trains a colour scale that a second mark reads', () => {
  const defineChannel = need('defineChannel');
  defineChannel('rank', { scale: 'color' });
  const scores = [{ id: 'a', score: 31 }, { id: 'b', score: 77 }, { id: 'c', score: 12 }, { id: 'd', score: 54 }, { id: 'e', score: 60 }];
  const byRank = rows => { d3.sort(rows, r => -r.y).forEach((r, i) => { r.rank = i + 1; }); return rows; };
  const dots = tap(<Dot position={byRank} />), bars = tap(<Bar position={byRank} />);
  compile({ width: W, height: H, data: scores, x: 'id', y: 'score', children: [dots, bars] });
  expect(scores.every(d => !('rank' in d))).toBe(true);   // the rank is not a field of the input
  const [a, b] = [dots.seen[0].ctx.color, bars.seen[0].ctx.color];
  expect(a.domain()).toEqual([1, 2, 3, 4, 5]);
  expect(b).toBe(a);                                      // one trained scale, read by both marks
});

/* ---------- g06: one field on colour and shape; numbers on size and opacity ---------- */

const bodies = [
  { id: 1, kind: 'rock', mass: 4, conf: 0.2 }, { id: 2, kind: 'ice', mass: 25, conf: 0.9 },
  { id: 3, kind: 'gas', mass: 9, conf: 0.5 }, { id: 4, kind: 'rock', mass: 16, conf: 0.7 },
  { id: 5, kind: 'ice', mass: 1, conf: 0.3 }, { id: 6, kind: 'gas', mass: 36, conf: 1 },
];
const form = s => (s.t === 'circle' ? 'circle' : s.d.replace(/[-\d.,e]+/g, ''));   // a shape's outline, minus its position
const scene6 = (dot, extra = []) => compile({ width: W, height: H, data: bodies, x: 'id', y: 'mass',
  children: [dot, <Scale channel="size" type="sqrt" range={[0, 10]} />, ...extra] }).scene.marks;

test.fails('g06 one categorical field drives both colour and marker shape', () => {
  const shapes = scene6(<Dot color="kind" shape="kind" />);
  const byKind = d3.group(shapes.map((s, i) => ({ s, kind: bodies[i].kind })), o => o.kind);
  expect(byKind.size).toBe(3);
  for (const rows of byKind.values()) {
    expect(new Set(rows.map(o => form(o.s))).size).toBe(1);   // same kind, same marker
    expect(new Set(rows.map(o => o.s.fill)).size).toBe(1);    // same kind, same colour
  }
  expect(new Set([...byKind.values()].map(rows => form(rows[0].s))).size).toBe(3);
  expect(new Set([...byKind.values()].map(rows => rows[0].s.fill)).size).toBe(3);
});

test.fails('g06 a number drives size and another drives opacity, each through a scale', () => {
  const shapes = scene6(<Dot size="mass" opacity="conf" />);
  const order = key => d3.sort(d3.range(bodies.length), i => bodies[i][key]);
  const radii = order('mass').map(i => shapes[i].r), opacities = order('conf').map(i => shapes[i].opacity);
  expect(radii).toEqual([...radii].sort((a, b) => a - b));
  expect(new Set(radii).size).toBe(bodies.length);
  expect(opacities.every(o => typeof o === 'number' && o >= 0 && o <= 1)).toBe(true);
  expect(opacities).toEqual([...opacities].sort((a, b) => a - b));
  expect(new Set(opacities).size).toBe(bodies.length);
});

test.fails('g06 a function-valued style prop still wins over its channel', () => {
  const shapes = scene6(<Dot size="mass" opacity="conf" r={() => 7} />);
  expect(shapes.every(s => s.r === 7)).toBe(true);
  expect(new Set(shapes.map(s => s.opacity)).size).toBe(bodies.length);   // the opacity channel is untouched
});

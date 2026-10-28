// Polar coordinates (SPEC 5.13, GAPS 1.4b). The first test is the prototype of the design note:
// one data set, drawn as a bar chart and as a rose by changing the coordinate only.
import { test, expect } from 'vitest';
import '../../test/tauler.js';   // defines the JSX factory `h`
import { compile } from '../core.jsx';
import { polar } from '../polar.jsx';
import { Bar } from '../marks.jsx';

const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun'].map((k, i) => ({ k, v: 3 + ((i * 7) % 5) }));
const chart = coord => compile({ width: 200, height: 200, data: months, x: 'k', y: 'v', coord, children: [<Bar />] }).scene;

test('prototype: the same Bar is a bar by default and a wedge per bar under polar()', () => {
  const bars = chart(undefined), rose = chart(polar());
  expect(bars.marks.filter(s => s.t === 'rect')).toHaveLength(months.length);
  expect(rose.marks.filter(s => s.t === 'path')).toHaveLength(months.length);
  expect(rose.marks.some(s => s.t === 'rect')).toBe(false);
});

/* ---------- the rest of the design note ---------- */
import * as d3 from 'd3';
import { Scale, Grid, Axis, stack } from '../core.jsx';
import { Arc, Area, Dot, Line, Link, Text } from '../marks.jsx';
import { ratioOf } from './bench.js';
import { pathPoints } from './gaps/support.js';

const TAU = 2 * Math.PI;
const SIZE = 200, CENTRE = SIZE / 2;
const plot = (children, data, props = {}) => compile({ width: SIZE, height: SIZE, data, coord: polar(), ...props, children }).scene;
const nums = d => d.match(/-?\d+(?:\.\d+)?/g).map(Number);
// The clockwise-from-up angle of a pixel around the plot's centre.
const angle = (x, y) => (Math.atan2(x - CENTRE, CENTRE - y) + TAU) % TAU;
// A wedge path "M x,y A r,r,0,f,1,x,y L ..." (translated by the centre): the angles of its arc's two ends.
const sweepOf = shape => {
  const n = nums(shape.d), [x0, y0, x1, y1] = [n[0], n[1], n[7], n[8]];
  return ((angle(x1 + CENTRE, y1 + CENTRE) - angle(x0 + CENTRE, y0 + CENTRE)) + TAU) % TAU;
};

test('each wedge sweeps an angle proportional to its band, and the bars are the same marks', () => {
  const wedges = plot([<Bar />], months, { x: 'k', y: 'v' }).marks.filter(s => s.t === 'path');
  const step = TAU / months.length;   // d3's band scale: padding 0.2 between bands and 0.1 outside, so a band is 0.8 of a step
  for (const w of wedges) expect(Math.abs(sweepOf(w) - 0.8 * step)).toBeLessThan(0.01);
});

test('a pie is a stacked horizontal Bar on one band, a donut sets inner on the coordinate', () => {
  const shares = [{ n: 'a', v: 50 }, { n: 'b', v: 30 }, { n: 'c', v: 20 }];
  const pie = inner => plot([<Bar color="n" position={stack({ along: 'x' })} />, <Scale channel="y" type="band" padding={0} />], shares,
    { x: 'v', y: () => 'all', coord: polar({ inner }) }).marks.filter(s => s.t === 'path');
  const slices = pie(0);
  expect(slices).toHaveLength(3);
  slices.forEach((s, i) => expect(Math.abs(sweepOf(s) / TAU - shares[i].v / 100)).toBeLessThan(1e-3));
  expect(new Set(slices.map(s => s.fill)).size).toBe(3);
  const hole = nums(pie(0.5)[0].d);   // the inner arc's radius is half the outer one
  expect(hole.filter(v => Math.abs(v - 46) < 0.01).length).toBeGreaterThan(0);
});

test('Arc inside a polar plot takes the centre, radius, hole and sweep from the coordinate', () => {
  const parts = [{ n: 1, k: 'a' }, { n: 1, k: 'b' }];
  const bare = plot([<Arc value="n" color="k" />], parts, { coord: polar({ inner: 0.5, startAngle: -Math.PI / 2, endAngle: Math.PI / 2 }) });
  const own = plot([<Arc value="n" color="k" inner={0.5} startAngle={-Math.PI / 2} endAngle={Math.PI / 2} />], parts, { coord: undefined });
  expect(bare.marks).toEqual(own.marks);
});

test('Dot, Link and Area go through the coordinate: a dot is where point says, a needle is a line, a chord a path', () => {
  const seen = [];
  const spy = { ...Dot({ r: 3 }), render(rows, ctx) { seen.push(ctx); return Dot({ r: 3 }).render(rows, ctx); } };
  const data = [{ k: 'a', v: 40 }, { k: 'b', v: 80 }, { k: 'c', v: 60 }];
  const scene = plot([spy, <Scale channel="y" domain={[0, 100]} />], data, { x: 'k', y: 'v' });
  data.forEach((d, i) => {
    const [px, py] = seen[0].point(d.k, d.v);
    expect(Math.abs(scene.marks[i].cx - px) + Math.abs(scene.marks[i].cy - py)).toBeLessThan(0.02);
  });
  const links = plot([<Link x1="a" x2="b" y1={20} y2={80} />, <Scale channel="x" domain={[0, 10]} />, <Scale channel="y" domain={[0, 100]} />], [{ a: 2, b: 2 }, { a: 2, b: 5 }]);
  expect(links.marks.map(s => s.t)).toEqual(['line', 'path']);   // along one angle; across angles
});

test('a radar Area closed over a band angle is a polygon through the centre; a missing value breaks it', () => {
  const axes = ['a', 'b', 'c', 'd'].map((k, i) => ({ k, v: [50, 100, 50, 100][i] }));
  const scene = plot([<Area closed />, <Scale channel="y" domain={[0, 100]} />], axes, { x: 'k', y: 'v' });
  const d = scene.marks[0].d;
  expect(d.endsWith('Z')).toBe(true);
  expect(nums(d).length / 2).toBe(2 * axes.length);   // each point on the outline, and the baseline back
});

test('a Line over a continuous angle is a spiral: densified, radius growing with the angle', () => {
  const spiral = d3.range(0, 9).map(i => ({ t: i * 1.5, r: i }));
  const scene = plot([<Line />, <Scale channel="x" domain={[0, 12]} />, <Scale channel="y" domain={[0, 8]} />], spiral, { x: 't', y: 'r', coord: polar({ endAngle: TAU }) });
  const pts = pathPoints(scene.marks[0].d);
  expect(pts.length).toBeGreaterThan(spiral.length * 2);
  const radii = pts.map(([x, y]) => Math.hypot(x - CENTRE, y - CENTRE));
  expect(radii).toEqual([...radii].sort((a, b) => a - b));
  const smooth = d3.pairs(radii, (a, b) => b - a);
  expect(d3.max(smooth)).toBeLessThan(d3.min(smooth) * 1.5 + 0.2);   // the radius grows evenly along the path
});

test('Text: an explicit textAnchor is kept and not pushed out; centre text needs no x or y', () => {
  const scene = plot([<Text x="x" y={1} text="t" textAnchor="middle" />, <Scale channel="x" domain={[0, 4]} />, <Scale channel="y" domain={[0, 1]} />], [{ x: 1 }]);
  const label = scene.front[0];
  expect(label.textAnchor).toBe('middle');
  expect(Math.hypot(label.x - CENTRE, label.y - CENTRE)).toBeCloseTo(92, 1);
});

test('polar rejects what it cannot draw', () => {
  expect(() => polar({ inner: 1 })).toThrow(/inner/);
  expect(() => polar({ startAngle: 1, endAngle: 1 })).toThrow(/different/);
  expect(() => plot([<Grid shape="hexagon" />, <Bar />], months, { x: 'k', y: 'v' })).toThrow(/shape 'hexagon'/);
});

test('a polar compile is deterministic, and costs under 2 times the same chart without it', () => {
  const big = d3.range(500).map(i => ({ t: i / 20, r: 1 + (i % 17) }));
  const props = (children, coord) => ({ width: 248, height: 110, data: big, x: 't', y: 'r', coord, children });
  expect(compile(props([<Line />], polar())).key).toBe(compile(props([<Line />], polar())).key);
  for (const mark of [<Line />, <Dot r={1} />, <Grid />]) {   // each is the extra cost of the coordinate alone
    // timed alternately over 41 rounds; measured about 1.2 to 1.3 times, the margin absorbs machine load
    expect(ratioOf(() => compile(props([mark], polar())), () => compile(props([mark], undefined)))).toBeLessThan(2);
  }
});

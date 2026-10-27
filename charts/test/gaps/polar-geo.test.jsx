// Gap examples g33-g38: polar and projected coordinates, curved links, ribbons and data-unit
// circles (GAPS 1.4a, 1.4b, 3.9). The coordinate is declared once on the Plot (`coord`); marks
// carry no frame props, and `ctx.point(x, y)` is the joint mapping to a pixel.
import { test, expect } from 'vitest';
import * as d3 from 'd3';
import { compile, Scale, Grid } from '../../core.jsx';
import { Line, Rect, Bar, Dot, Link, Text, Area } from '../../marks.jsx';
import { cumsum } from '../../stats.jsx';
import { GeoDot } from '../../geo.jsx';
import { need, tap, near, pathPoints, angleOf, centreOf, distance } from './support.js';

const S = 200;
const polarPlot = (children, data, { coord, ...props } = {}) =>
  compile({ width: S, height: S, data, coord: coord ?? need('polar')(), ...props, children });
const FRAME_PROPS = /angle|radius|inner|outer|frame|polar/i;
const noFrameProps = mark => expect(Object.keys(mark.props).filter(k => FRAME_PROPS.test(k))).toEqual([]);

const TAU = 2 * Math.PI;
const shares = [{ name: 'rent', n: 45 }, { name: 'food', n: 30 }, { name: 'fun', n: 15 }, { name: 'misc', n: 10 }];

/* ---------- g33: the shapes of a polar family, each under one declared coordinate ---------- */

test.fails('g33 rose: bars become wedges, one per bar, equally spaced in angle', () => {
  const data = ['n', 'ne', 'e', 'se', 's', 'sw'].map((k, i) => ({ k, v: 3 + ((i * 7) % 5) }));
  const bars = tap(<Bar />);
  const { scene } = polarPlot([bars], data, { x: 'k', y: 'v' });
  noFrameProps(bars);
  expect(scene.marks.filter(s => s.t === 'path')).toHaveLength(data.length);
  expect(scene.marks.some(s => s.t === 'rect')).toBe(false);
  const { ctx } = bars.seen[0], c = centreOf(ctx.area);
  const angles = data.map(d => angleOf(ctx.point(d.k, 1), c));
  d3.pairs(angles, (a, b) => (b - a + TAU) % TAU).forEach(step => near(step, TAU / data.length, 1e-6));
});

test.fails('g33 pie: slice angles are proportional to the share', () => {
  const steps = cumsum(shares, { value: 'n' });
  const rects = tap(<Rect x1="from" x2="to" y1={0} y2={1} color="name" />);
  const { scene } = polarPlot([rects, <Scale channel="x" domain={[0, 100]} />, <Scale channel="y" domain={[0, 1]} />], steps);
  noFrameProps(rects);
  expect(scene.marks.filter(s => s.t === 'path')).toHaveLength(shares.length);
  const { ctx } = rects.seen[0], c = centreOf(ctx.area);
  steps.forEach(s => near(((angleOf(ctx.point(s.to - 1e-6, 1), c) - angleOf(ctx.point(s.from, 1), c) + TAU) % TAU) / TAU, s.n / 100, 1e-4));
});

test.fails('g33 donut: the hole is a fraction of the radius, set on the coordinate', () => {
  const rects = tap(<Rect x1={0} x2={50} y1={0} y2={1} />);
  polarPlot([rects, <Scale channel="x" domain={[0, 100]} />, <Scale channel="y" domain={[0, 1]} />], [{}], { coord: need('polar')({ inner: 0.5 }) });
  const { ctx } = rects.seen[0], c = centreOf(ctx.area), R = Math.min(ctx.area.width, ctx.area.height) / 2;
  near(distance(ctx.point(10, 0), c), 0.5 * R, 0.01);
  near(distance(ctx.point(10, 1), c), R, 0.01);
});

test.fails('g33 gauge: a half-turn coordinate maps the whole domain onto 180 degrees', () => {
  const rects = tap(<Rect x1={0} x2={60} y1={0} y2={1} />);
  polarPlot([rects, <Scale channel="x" domain={[0, 100]} />, <Scale channel="y" domain={[0, 1]} />], [{}],
    { coord: need('polar')({ startAngle: -Math.PI / 2, endAngle: Math.PI / 2 }) });
  const { ctx } = rects.seen[0], c = centreOf(ctx.area);
  near(angleOf(ctx.point(0, 1), c), TAU - Math.PI / 2, 1e-6);
  near(angleOf(ctx.point(100, 1), c), Math.PI / 2, 1e-6);
  near(angleOf(ctx.point(50, 1), c), 0, 1e-6);
});

test.fails('g33 radar: a closed line whose radius follows the value', () => {
  const axes = ['speed', 'power', 'reach', 'armor', 'grip'].map((k, i) => ({ k, v: [60, 90, 30, 75, 45][i] }));
  const line = tap(<Line closed />);
  const { scene } = polarPlot([line, <Scale channel="y" domain={[0, 100]} />], axes, { x: 'k', y: 'v' });
  noFrameProps(line);
  const path = scene.marks.find(s => s.t === 'path');
  expect(path.d.trim().endsWith('Z')).toBe(true);
  const { ctx } = line.seen[0], c = centreOf(ctx.area), R = Math.min(ctx.area.width, ctx.area.height) / 2;
  axes.forEach(a => near(distance(ctx.point(a.k, a.v), c) / R, a.v / 100, 1e-6));
});

test.fails('g33 radial bars: the angle swept follows the value, one ring per category', () => {
  const data = [{ k: 'a', v: 25 }, { k: 'b', v: 50 }, { k: 'c', v: 75 }];
  const bars = tap(<Bar />);
  const { scene } = polarPlot([bars, <Scale channel="x" domain={[0, 100]} />], data, { x: 'v', y: 'k' });
  expect(scene.marks.filter(s => s.t === 'path')).toHaveLength(3);
  const { ctx } = bars.seen[0], c = centreOf(ctx.area);
  data.forEach(d => near(angleOf(ctx.point(d.v, d.k), c) / TAU, d.v / 100, 1e-6));
  expect(new Set(data.map(d => distance(ctx.point(d.v, d.k), c).toFixed(3))).size).toBe(3);
});

test.fails('g33 sunburst: partition rows drawn as wedges, depth on the radius', () => {
  const files = [{ path: 'a/x', n: 3 }, { path: 'a/y', n: 5 }, { path: 'b/z', n: 4 }].map(d => ({ ...d, path: 'root/' + d.path }));
  const rows = need('partition')(files, { path: 'path', value: 'n' });
  const rects = tap(<Rect x1="x0" x2="x1" y1="y0" y2="y1" color="branch" />);
  const { scene } = polarPlot([rects, <Scale channel="x" domain={[0, 1]} />, <Scale channel="y" domain={[0, 1]} />], rows);
  expect(scene.marks.filter(s => s.t === 'path')).toHaveLength(rows.length);
  noFrameProps(rects);
});

/* ---------- g34: centre text, needle and track are ordinary marks ---------- */

test.fails('g34 a gauge from Rect, Link and Text: a track, a needle and centre text, no dedicated marks', () => {
  const sweep = need('polar')({ inner: 0.5, startAngle: -Math.PI * 0.75, endAngle: Math.PI * 0.75 });
  const track = tap(<Rect x1={0} x2={100} y1={0} y2={1} fill="#ddd" />);
  const needle = tap(<Link x1={62} y1={0} x2={62} y2={1} />);
  const centre = tap(<Text text={() => '62%'} />);
  const { scene } = polarPlot([track, needle, centre, <Scale channel="x" domain={[0, 100]} />, <Scale channel="y" domain={[0, 1]} />], [{}], { coord: sweep });
  const { ctx } = needle.seen[0];
  const hand = scene.marks.find(s => s.t === 'line');
  const [from, to] = [ctx.point(62, 0), ctx.point(62, 1)];
  near(hand.x1, from[0], 0.02); near(hand.y1, from[1], 0.02);
  near(hand.x2, to[0], 0.02); near(hand.y2, to[1], 0.02);
  expect(scene.marks.some(s => s.t === 'path')).toBe(true);   // the track, a wedge
  const label = scene.front.find(s => s.text === '62%');
  const c = centreOf(ctx.area);
  near(label.x, c[0], 0.02); near(label.y, c[1], 0.02);
});

/* ---------- g35: labels outside wedges pick their anchor from the angle ---------- */

test.fails('g35 Text under polar anchors at the start on the right half and at the end on the left', () => {
  const steps = cumsum(shares, { value: 'n' }).map(s => ({ ...s, mid: (s.from + s.to) / 2 }));
  const labels = tap(<Text x="mid" y={1} text={d => d.name} />);   // no textAnchor, no per-label offsets
  const { scene } = polarPlot([labels, <Scale channel="x" domain={[0, 100]} />, <Scale channel="y" domain={[0, 1]} />], steps);
  const { ctx } = labels.seen[0], c = centreOf(ctx.area), R = Math.min(ctx.area.width, ctx.area.height) / 2;
  steps.forEach(s => {
    const label = scene.front.find(t => t.text === s.name), angle = angleOf(ctx.point(s.mid, 1), c);
    expect(label.textAnchor).toBe(Math.sin(angle) > 0 ? 'start' : 'end');
    expect(distance([label.x, label.y], c)).toBeGreaterThanOrEqual(R - 0.01);
  });
});

/* ---------- g36: a coordinate-aware grid ---------- */

const spokesData = ['a', 'b', 'c', 'd', 'e'].map((k, i) => ({ k, v: 20 + 15 * i }));
function polarGrid(grid, coord = need('polar')()) {
  const line = tap(<Line />);
  const { scene } = polarPlot([grid, line, <Scale channel="y" domain={[0, 100]} />], spokesData, { x: 'k', y: 'v', coord });
  return { scene, ctx: line.seen[0].ctx };
}
const rings = scene => scene.back.filter(s => s.t === 'path');
const spokes = scene => scene.back.filter(s => s.t === 'line');

test.fails('g36 a polygon grid: rings with one vertex per category, and spokes', () => {
  const { scene, ctx } = polarGrid(<Grid shape="polygon" />);
  expect(rings(scene).length).toBeGreaterThan(2);
  for (const r of rings(scene)) expect(pathPoints(r.d)).toHaveLength(spokesData.length);
  const radii = rings(scene).map(r => distance(pathPoints(r.d)[0], centreOf(ctx.area)));
  expect(radii).toEqual([...radii].sort((a, b) => a - b));
  expect(spokes(scene)).toHaveLength(spokesData.length);
});

test.fails('g36 a circular grid without spokes', () => {
  const { scene, ctx } = polarGrid(<Grid shape="circle" spokes={false} />);
  expect(rings(scene).length).toBeGreaterThan(2);
  const c = centreOf(ctx.area);
  for (const r of rings(scene)) {
    const radii = pathPoints(r.d).map(p => distance(p, c));
    near(d3.min(radii), d3.max(radii), 0.1);   // every point of a ring is at one radius
  }
  expect(spokes(scene)).toHaveLength(0);
});

test.fails('g36 a grid follows a partial sweep: nothing drawn outside the arc', () => {
  const { scene, ctx } = polarGrid(<Grid shape="circle" />, need('polar')({ startAngle: -Math.PI / 2, endAngle: Math.PI / 2 }));
  const c = centreOf(ctx.area);
  for (const r of rings(scene)) for (const p of pathPoints(r.d)) expect(p[1]).toBeLessThanOrEqual(c[1] + 0.05);   // the upper half
});

/* ---------- g37: marks honour a projection ---------- */

const places = [{ name: 'one', lon: -100, lat: 40 }, { name: 'two', lon: 10, lat: 20 }, { name: 'three', lon: 120, lat: -15 }];

test.fails('g37 Dot with no channel props lands where GeoDot lands', () => {
  const geoDots = tap(<GeoDot />);
  compile({ width: 300, height: 200, data: places, projection: 'mercator', children: [geoDots] });
  const { projection } = geoDots.seen[0].ctx;
  const dots = tap(<Dot />);
  const { scene } = compile({ width: 300, height: 200, data: places, coord: need('geo')('mercator'), children: [dots] });
  const circles = scene.marks.filter(s => s.t === 'circle');
  expect(circles).toHaveLength(places.length);
  places.forEach((p, i) => { const [px, py] = projection([p.lon, p.lat]); near(circles[i].cx, px, 0.02); near(circles[i].cy, py, 0.02); });
});

test.fails('g37 a long Line follows the projected great circle instead of a straight chord', () => {
  const route = [{ lon: -120, lat: 40 }, { lon: 120, lat: 40 }];
  const { scene } = compile({ width: 400, height: 260, data: route, coord: need('geo')('mercator'), children: [<Line />] });
  const pts = pathPoints(scene.marks.find(s => s.t === 'path').d);
  expect(pts.length).toBeGreaterThan(8);
  expect(d3.min(pts, p => p[1])).toBeLessThan(Math.min(pts[0][1], pts.at(-1)[1]) - 3);   // bows poleward
});

/* ---------- g38: curved links, ribbons and data-unit circles ---------- */

const nums = d => d.match(/-?\d+(?:\.\d+)?/g).map(Number);

test.fails('g38 Link curve="link-horizontal" draws the d3 horizontal-link path', () => {
  const link = tap(<Link curve="link-horizontal" />);
  const { scene } = compile({ width: 300, height: 200, data: [{ a: 1, b: 2, c: 9, e: 7 }], x1: 'a', y1: 'b', x2: 'c', y2: 'e', children: [link] });
  const { ctx } = link.seen[0];
  const shape = scene.marks[0];
  expect(shape.t).toBe('path');
  const expected = d3.linkHorizontal().x(p => p[0]).y(p => p[1])({ source: [ctx.x(1), ctx.y(2)], target: [ctx.x(9), ctx.y(7)] });
  const [got, want] = [nums(shape.d), nums(expected)];
  expect(got).toHaveLength(want.length);
  got.forEach((v, i) => near(v, want[i], 0.02));
});

test.fails('g38 Area thickness1/thickness2 draws a ribbon with the given thickness at both ends', () => {
  const ribbon = tap(<Area x1="sx" x2="tx" y1="sy" y2="ty" thickness1="w0" thickness2="w1" />);
  const row = { sx: 1, sy: 3, tx: 9, ty: 7, w0: 2, w1: 1 };
  const { scene } = compile({ width: 300, height: 200, data: [row], children: [ribbon, <Scale channel="y" domain={[0, 10]} />, <Scale channel="x" domain={[0, 10]} />] });
  const { ctx } = ribbon.seen[0], pts = pathPoints(scene.marks[0].d), unit = Math.abs(ctx.y(1) - ctx.y(0));
  const gapAt = x => { const ys = pts.filter(p => Math.abs(p[0] - ctx.x(x)) < 0.05).map(p => p[1]); return d3.max(ys) - d3.min(ys); };
  near(gapAt(1), 2 * unit, 0.05);
  near(gapAt(9), 1 * unit, 0.05);
});

test.fails('g38 Dot rx/ry are radii in data units, so the circle scales with the plot', () => {
  const radius = width => compile({ width, height: 200, data: [{ x: 5, y: 5 }], x: 'x', y: 'y',
    children: [<Dot rx={1} ry={1} />, <Scale channel="x" domain={[0, 10]} />, <Scale channel="y" domain={[0, 10]} />] }).scene.marks[0].r;
  const [small, large] = [radius(200), radius(400)];
  near(large / small, (400 - 16) / (200 - 16), 0.01);
});

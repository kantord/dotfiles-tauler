// Scene paints (GAPS 1.5), colour along one path (2.3) and the pixel stage (1.3, for jitterPx
// 3.4b). The capability list these cite is SPEC 5.5.
import { test, expect, beforeEach } from 'vitest';
import * as d3 from 'd3';
import { drawFigure, figureKeys, resetFigures } from '../../test/tauler.js';
import { Plot } from '../Plot.jsx';
import { compile, linearGradient, radialGradient, pattern, hatch, jitterPx, Scale } from '../core.jsx';
import { Line, Area, Rect, Dot } from '../marks.jsx';
import { tap } from './gaps/support.js';

beforeEach(resetFigures);

const W = 240, H = 120;
const stops = [{ offset: 0, color: '#2b59d1', opacity: 1 }, { offset: 1, color: '#2b59d1', opacity: 0 }];
const series = d3.range(8).map(i => ({ t: i, v: 4 + 3 * Math.sin(i / 1.5) }));
// The opening tags named `tag`, as attribute maps (the DOM does not keep attribute order).
const tags = (svg, tag) => [...svg.matchAll(new RegExp(`<${tag}\\b([^>]*)>`, 'g'))]
  .map(m => Object.fromEntries([...m[1].matchAll(/([\w:-]+)="([^"]*)"/g)].map(a => [a[1], a[2]])));
const svgOf = child => { <Plot width={W} height={H} data={series} x="t" y="v">{child}</Plot>; return drawFigure(figureKeys()[0]); };

/* ---------- capability: the host renders each of these (SPEC 5.5), one test per feature ---------- */

test('capability linearGradient: a fill is a defs entry the shape points at, stops with opacity', () => {
  const svg = svgOf(<Area fill={linearGradient({ stops })} />);
  const [g] = tags(svg, 'linearGradient');
  expect(g).toMatchObject({ x1: '0', y1: '0', x2: '0', y2: '1' });
  expect(tags(svg, 'stop')[0]).toMatchObject({ offset: '0', 'stop-color': '#2b59d1', 'stop-opacity': '1' });
  expect(tags(svg, 'path').some(p => p.fill === `url(#${g.id})`)).toBe(true);
});

test('capability radialGradient', () => {
  const svg = svgOf(<Area fill={radialGradient({ stops })} />);
  const [g] = tags(svg, 'radialGradient');
  expect(g).toMatchObject({ cx: '0.5', cy: '0.5', r: '0.5' });
  expect(tags(svg, 'path').some(p => p.fill === `url(#${g.id})`)).toBe(true);
});

test('capability pattern: hatch is a tile of lines, turned by its angle', () => {
  const svg = svgOf(<Rect y1={2} y2={6} x="t" width={20} pattern="hatch" />);
  const [p] = tags(svg, 'pattern');
  expect(p).toMatchObject({ patternUnits: 'userSpaceOnUse', width: '5', height: '5', patternTransform: 'rotate(45)' });
  expect(tags(svg, 'line')[0]['stroke-width']).toBe('1.25');
  expect(tags(svg, 'rect').some(r => r.fill === `url(#${p.id})`)).toBe(true);
});

test('capability strokeLinecap and strokeLinejoin reach the drawn svg from Line', () => {
  expect(tags(svgOf(<Line strokeLinecap="round" strokeLinejoin="bevel" />), 'path')[0]).toMatchObject({ 'stroke-linecap': 'round', 'stroke-linejoin': 'bevel' });
});

test('one paint used twice is one defs entry; a different paint is another; the key follows the paint', () => {
  const [a, b] = [linearGradient({ stops }), linearGradient({ stops, to: 'top' })];
  const scene = child => compile({ width: W, height: H, data: series, x: 't', y: 'v', children: [child] });
  expect(scene(<Area fill={a} />).key).not.toBe(scene(<Area fill={b} />).key);
  expect(scene(<Area fill={a} />).key).toBe(scene(<Area fill={linearGradient({ stops })} />).key);
  const svg = svgOf([<Area fill={a} />, <Area fill={a} />, <Area fill={b} />]);
  expect(svg.match(/<linearGradient/g)).toHaveLength(2);
});

test('a pattern prop that is neither "hatch" nor a pattern() throws', () => {
  expect(() => compile({ width: W, height: H, data: series, x: 't', y: 'v', children: [<Rect y1={0} y2="v" pattern="plaid" />] })).toThrow(/hatch/);
  expect(pattern({ shapes: [], size: 3 }).paint).toBe('pattern');
  expect(hatch({ color: 'red' }).shapes).toHaveLength(1);
});

/* ---------- 2.3 colour along one path ---------- */

const track = d3.range(10).map(i => ({ t: new Date(Date.UTC(2026, 0, 1 + i)), v: 5 + Math.sin(i), heat: i }));

test('2.3 a Line with `gradient` over a time axis is one path whose stroke colours by x', () => {
  const line = tap(<Line gradient />);
  const { scene } = compile({ width: W, height: H, data: track, x: 't', y: 'v', color: 'heat', children: [line, <Scale channel="x" type="time" />] });
  expect(scene.marks).toHaveLength(1);                       // not consecutive segments
  const g = scene.marks[0].stroke, ctx = line.seen[0].ctx;
  expect(g.paint).toBe('linearGradient');
  expect(g.user).toBe(true);
  expect(g.stops).toHaveLength(track.length);
  expect(g.stops[0].offset).toBe(0); expect(g.stops.at(-1).offset).toBe(1);
  expect(g.x1).toBeCloseTo(ctx.x(track[0].t), 1); expect(g.x2).toBeCloseTo(ctx.x(track.at(-1).t), 1);
  expect(g.stops[0].color).toBe(ctx.color(0)); expect(g.stops.at(-1).color).toBe(ctx.color(9));
  expect(new Set(g.stops.map(s => s.color)).size).toBeGreaterThan(2);   // it changes along the path
});

test('2.3 without `gradient`, a continuous colour channel still draws plain strokes', () => {
  const { scene } = compile({ width: W, height: H, data: track, x: 't', y: 'v', color: 'heat', children: [<Line />] });
  expect(scene.marks.every(s => typeof s.stroke === 'string')).toBe(true);
  expect(scene.marks.length).toBeGreaterThan(1);
});

test('2.3 the gradient is drawn: userSpaceOnUse in the svg, the path points at it', () => {
  <Plot width={W} height={H} data={track} x="t" y="v" color="heat"><Line gradient /></Plot>;
  const svg = drawFigure(figureKeys()[0]);
  const [g] = tags(svg, 'linearGradient');
  expect(g.gradientUnits).toBe('userSpaceOnUse');
  expect(tags(svg, 'path').some(p => p.stroke === `url(#${g.id})`)).toBe(true);
});

/* ---------- 1.3 the pixel stage, as 3.4b needs it ---------- */

const swarm = ['a', 'b', 'c', 'd', 'e'].map((id, i) => ({ id, n: 3, v: 5 + (i % 2) }));   // five points on two spots

function jitteredDots(data, width, position = jitterPx()) {
  const dots = tap(<Dot key="id" position={position} />);
  const { scene } = compile({ width, height: H, data, x: 'n', y: 'v', children: [dots] });
  return { rows: dots.seen[0].rows, ctx: dots.seen[0].ctx, circles: scene.marks.filter(s => s.t === 'circle') };
}

test('1.3 a pixel-stage entry runs after the scales: it sees the built scales and the area', () => {
  let info;
  const probe = Object.assign((rows, i) => { info = i; return rows; }, { stage: 'pixel' });
  const { ctx } = jitteredDots(swarm, 200, probe);
  expect(typeof info.scales.x).toBe('function');
  expect(info.area).toEqual(ctx.area);
});

test('3.4b jitterPx moves continuous-axis points by pixels, deterministically, within ±width/2', () => {
  const [a, b] = [jitteredDots(swarm, 200, jitterPx({ width: 10 })), jitteredDots(swarm, 200, jitterPx({ width: 10 }))];
  expect(a.circles.map(c => c.cx)).toEqual(b.circles.map(c => c.cx));
  a.rows.forEach((r, i) => { expect(Math.abs(a.circles[i].cx - a.ctx.x(3))).toBeLessThanOrEqual(5 + 0.01); expect(a.circles[i].cy).toBeCloseTo(a.ctx.y(r.y), 1); });
  expect(new Set(a.circles.map(c => c.cx)).size).toBe(5);
});

test('3.4b offsets are pixels, equal at two plot widths, and no other row moves when one is removed', () => {
  const [narrow, wide] = [jitteredDots(swarm, 120), jitteredDots(swarm, 400)];
  narrow.rows.forEach((r, i) => expect(r.dx).toBe(wide.rows[i].dx));
  const fewer = jitteredDots(swarm.filter(d => d.id !== 'c'), 200);
  const all = jitteredDots(swarm, 200);
  for (const r of fewer.rows) expect(all.rows.find(q => q.d.id === r.d.id).dx).toBe(r.dx);
});

test('3.4b `along: "y"` writes dy; rows without a key stay put; a data-space entry after a pixel one throws', () => {
  const { rows } = jitteredDots(swarm, 200, jitterPx({ along: 'y' }));
  expect(rows.every(r => r.dx == null && r.dy != null)).toBe(true);
  const plain = tap(<Dot position={jitterPx()} />);
  compile({ width: 200, height: H, data: swarm, x: 'n', y: 'v', children: [plain] });
  expect(plain.seen[0].rows.every(r => r.dx == null)).toBe(true);
  expect(() => jitteredDots(swarm, 200, [jitterPx(), r => r])).toThrow(/pixel-stage/);
});

// Gap examples g30, g31, g40, g48, g49: room at the edges, vectors, labels that fit, wrapped and
// rotated text, pattern fills (GAPS 3.5, 3.6, 3.8b, 1.6, 1.5).
import { test, expect, beforeEach } from 'vitest';
import * as d3 from 'd3';
import { drawFigure, figureKeys, resetFigures } from '../../../test/tauler.js';
import { Plot } from '../../Plot.jsx';
import { compile, defaultMeasure, Layer, Scale, Axis, FONT_SIZE } from '../../core.jsx';
import { Line, Rect, Text } from '../../marks.jsx';
import { need, tap, near, W, H } from './support.js';

beforeEach(resetFigures);

/* ---------- g30: end labels stay inside the figure ---------- */

const trace = d3.range(10).map(t => ({ t, v: 20 + 6 * Math.sin(t / 1.7) }));
const ends = [trace[0], trace.at(-1)].map(d => ({ ...d, label: `${d.t} ms` }));

function endLabels(scaleX) {
  const line = tap(<Line />);
  const { scene } = compile({ width: W, height: H, data: trace, x: 't', y: 'v', children: [   // no margin prop
    line, <Layer data={ends} x="t" y="v"><Text text={d => d.label} /></Layer>, scaleX, <Axis channel="x" />] });
  return { scene, ctx: line.seen[0].ctx };
}
const inside = (s, width) => s.x - defaultMeasure(s.text, FONT_SIZE) / 2 >= 0 && s.x + defaultMeasure(s.text, FONT_SIZE) / 2 <= width;

test('g30 rangePad keeps the labels at the first and last point inside the figure', () => {
  const { scene, ctx } = endLabels(<Scale channel="x" domain={[0, 9]} rangePad={24} />);
  const labels = scene.front.filter(s => ends.some(e => e.label === s.text));
  expect(labels).toHaveLength(2);
  expect(labels.every(s => inside(s, W))).toBe(true);
  near(ctx.x(0) - ctx.area.left, 24, 0.01);
  near(ctx.area.right - ctx.x(9), 24, 0.01);
  const tickLabels = scene.back.filter(s => s.t === 'text').map(s => s.text);
  expect(tickLabels.every(t => Number.isInteger(+t))).toBe(true);   // ticks stay on round values
});

test('g30 without rangePad the end labels overflow the figure (the gap)', () => {
  const { scene } = endLabels(<Scale channel="x" domain={[0, 9]} />);
  const labels = scene.front.filter(s => ends.some(e => e.label === s.text));
  expect(labels.some(s => !inside(s, W))).toBe(true);
});

/* ---------- g31: a rotated vector of fixed pixel length ---------- */

const winds = [{ lon: 2, lat: 3, dir: 0 }, { lon: 5, lat: 3, dir: 90 }, { lon: 8, lat: 3, dir: 225 }];

test('g31 Vector draws a fixed-pixel-length segment at an angle clockwise from up', () => {
  const Vector = need('Vector');
  const lengths = [];
  for (const [width, height] of [[W, H], [2 * W, 2 * H]]) {
    const vec = tap(Vector({ x: 'lon', y: 'lat', angle: 'dir', length: 12 }));
    const { scene } = compile({ width, height, data: winds, children: [vec] });
    const lines = scene.marks.filter(s => s.t === 'line');
    expect(lines).toHaveLength(winds.length);
    lines.forEach((l, i) => {
      const a = (winds[i].dir * Math.PI) / 180, { ctx } = vec.seen[0];
      near(l.x1, ctx.x(winds[i].lon), 0.02);
      near(l.y1, ctx.y(winds[i].lat), 0.02);
      near(l.x2 - l.x1, 12 * Math.sin(a), 0.05);
      near(l.y2 - l.y1, -12 * Math.cos(a), 0.05);
      lengths.push(Math.hypot(l.x2 - l.x1, l.y2 - l.y1));
    });
  }
  lengths.forEach(l => near(l, 12, 0.05));
});

/* ---------- g40: a label only where its box fits ---------- */

const tiles = [{ name: 'wide', x1: 0, x2: 8, y1: 0, y2: 4 }, { name: 'thin', x1: 8, x2: 8.2, y1: 0, y2: 4 }, { name: 'short', x1: 0, x2: 8, y1: 4, y2: 4.1 }];

test('g40 Text fit draws a label only where it fits the box it names', () => {
  const { scene } = compile({ width: W, height: H, data: tiles, children: [
    <Rect x1="x1" x2="x2" y1="y1" y2="y2" />,
    <Text x1="x1" x2="x2" y1="y1" y2="y2" text={d => d.name} fit />,
    <Scale channel="x" domain={[0, 8.2]} />, <Scale channel="y" domain={[0, 4.1]} />] });
  expect(scene.front.map(s => s.text)).toEqual(['wide']);
});

/* ---------- g48: wrapped and rotated text, boxes from measure ---------- */

// The glyph box of a text shape: anchor, direction and a rotation about (cx, cy), as 4 corners.
function boxOf(s, measure = defaultMeasure) {
  const w = measure(s.text, s.fontSize ?? FONT_SIZE), h = s.fontSize ?? FONT_SIZE;
  const u0 = s.textAnchor === 'end' ? -w : s.textAnchor === 'middle' ? -w / 2 : 0;
  const m = /rotate\(\s*(-?[\d.]+)(?:[\s,]+(-?[\d.]+)[\s,]+(-?[\d.]+))?\s*\)/.exec(s.transform ?? '');
  const [deg, cx, cy] = m ? [+m[1], +(m[2] ?? 0), +(m[3] ?? 0)] : [0, 0, 0];
  const t = (deg * Math.PI) / 180;
  return [[u0, 0], [u0 + w, 0], [u0 + w, h], [u0, h]].map(([u, v]) => {
    const dx = s.x + u - cx, dy = s.y + v - cy;
    return [cx + dx * Math.cos(t) - dy * Math.sin(t), cy + dx * Math.sin(t) + dy * Math.cos(t)];
  });
}
// Separating axis test for two convex quadrilaterals.
function overlap(a, b) {
  for (const poly of [a, b]) for (let i = 0; i < 4; i++) {
    const [p, q] = [poly[i], poly[(i + 1) % 4]], n = [q[1] - p[1], p[0] - q[0]];
    const range = pts => d3.extent(pts, ([x, y]) => x * n[0] + y * n[1]);
    const [a0, a1] = range(a), [b0, b1] = range(b);
    if (a1 <= b0 + 1e-9 || b1 <= a0 + 1e-9) return false;
  }
  return true;
}

const LONG = 'Quarterly average request throughput';

test('g48 a long label wraps inside a stated width; the lines do not overlap', () => {
  const { scene } = compile({ width: W, height: H, data: [{ k: 1 }], x: 'k', y: 'k', children: [<Text text={() => LONG} width={60} />] });
  const lines = scene.front.filter(s => s.t === 'text');
  expect(lines.length).toBeGreaterThan(1);
  lines.forEach(l => expect(defaultMeasure(l.text, l.fontSize ?? FONT_SIZE)).toBeLessThanOrEqual(60));
  expect(lines.map(l => l.text).join('').replace(/\s/g, '')).toBe(LONG.replace(/\s/g, ''));   // a word wider than the width is cut inside it
  d3.pairs(lines).forEach(([p, q]) => expect(overlap(boxOf(p), boxOf(q))).toBe(false));
});

test('g48 rotated axis labels are all drawn and none overlaps its neighbour', () => {
  const places = ['Harbour', 'Old mill', 'Station', 'Market sq', 'Lighthouse', 'Quarry', 'Orchard', 'Canal'];
  const { scene } = compile({ width: 240, height: H, data: places.map((p, i) => ({ p, n: 3 + (i % 3) })), x: 'p', y: 'n',
    children: [<Line />, <Axis channel="x" labelAngle={-45} />] });
  const labels = scene.back.filter(s => s.t === 'text' && places.includes(s.text));
  expect(labels.map(l => l.text)).toEqual(places);
  expect(labels.every(l => /rotate\(-45/.test(l.transform ?? ''))).toBe(true);
  d3.pairs(labels).forEach(([p, q]) => expect(overlap(boxOf(p), boxOf(q))).toBe(false));
});

test('g48 box maths: unrotated neighbouring labels overlap exactly when they touch', () => {
  const at = x => ({ t: 'text', x, y: 0, text: 'abcdef', textAnchor: 'start', fontSize: FONT_SIZE });
  const width = defaultMeasure('abcdef', FONT_SIZE);
  expect(overlap(boxOf(at(0)), boxOf(at(width - 1)))).toBe(true);
  expect(overlap(boxOf(at(0)), boxOf(at(width + 1)))).toBe(false);
});

/* ---------- g49: a hatch pattern fill, not a dashed outline ---------- */

// The host renders <pattern> (SPEC 5.5, capability list), so this is a real outcome.
test('g49 a hatched region has a pattern fill in the scene and in the drawn svg', () => {
  const band = [{ k: 'estimate', lo: 10, hi: 30 }];
  const child = <Rect y1="lo" y2="hi" pattern="hatch" />;
  const { scene } = compile({ width: W, height: H, data: band, x: 'k', children: [child] });
  expect(JSON.stringify(scene)).toMatch(/pattern/i);
  expect(scene.marks.some(s => s.strokeDasharray != null)).toBe(false);   // a dashed outline is no substitute
  <Plot width={W} height={H} data={band} x="k">{child}</Plot>;
  expect(drawFigure(figureKeys()[0])).toMatch(/<pattern/);
});

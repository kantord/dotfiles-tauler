// Edge cases found by stress-testing what this library might not handle, after reading
// Observable Plot's public gallery for ideas.
// Every example here is made up (own data, own scenario). Drawings are kept in __svg__/ like
// the grammar cases.
import { test, expect, beforeEach } from 'vitest';
import * as d3 from 'd3';
import { drawFigure, figureKeys, resetFigures } from '../../../test/tauler.js';
import { Plot } from '../../Plot.jsx';
import { compile, defineMark, Scale, Axis, Layer, stack } from '../../core.jsx';
import { Line, Area, Rect, Dot, Text } from '../../marks.jsx';
import { bin } from '../../stats.jsx';

beforeEach(resetFigures);

const W = 320, H = 160;
function tap(mark) {
  const seen = [];
  return { ...mark, seen, render: (rows, ctx) => { seen.push({ rows, ctx }); return mark.render(rows, ctx); } };
}
const snapshot = name => expect(drawFigure(figureKeys()[0])).toMatchFileSnapshot(`./__svg__/edge-${name}.svg`);

/* ---------- fixed: these failed before ---------- */

test('a value that is not a number (0/0) stacks as nothing, without poisoning its pile', async () => {
  // Energy per room per hour; one meter divided by a zero reading.
  const readings = [{ hour: 1, room: 'hall', kwh: 2 }, { hour: 1, room: 'attic', kwh: 0 / 0 }, { hour: 1, room: 'shed', kwh: -1 },
    { hour: 1, room: 'lab', kwh: -2 }, { hour: 2, room: 'hall', kwh: 1 }];
  const bars = tap(<Rect x="hour" y="kwh" color="room" position={stack()} />);
  <Plot width={W} height={H} data={readings}><Scale channel="x" type="band" />{bars}</Plot>;
  const rows = bars.seen[0].rows;
  for (const r of rows) expect(Number.isFinite(r.y1) && Number.isFinite(r.y2)).toBe(true);
  expect(rows.find(r => r.d.room === 'lab')).toMatchObject({ y1: -1, y2: -3 });
  await snapshot('stack-nan');
});

test('channels given as arrays are read row by row (columnar data)', async () => {
  // A stream that sends columns, not rows.
  const frame = { at: [0, 1, 2, 3, 4], load: [0.2, 0.9, 0.4, 0.7, 0.3] };
  const line = tap(<Line />);
  <Plot width={W} height={H} x={frame.at} y={frame.load}>{line}<Dot /></Plot>;
  expect(line.seen[0].rows.map(r => [r.x, r.y])).toEqual(frame.at.map((t, i) => [t, frame.load[i]]));
  await snapshot('columnar');
});

test('a colour range of more than three stops uses all of them', () => {
  // Soil moisture from dry to waterlogged, five stops across five values.
  const dots = tap(<Dot />);
  const stops = ['#7f3b08', '#e08214', '#f7f7f7', '#8073ac', '#2d004b'];
  compile({ width: W, height: H, data: d3.range(5).map(i => ({ i, wet: i * 25 })), x: 'i', y: 'wet', color: 'wet',
    children: [dots, Scale({ channel: 'color', domain: [0, 25, 50, 75, 100], range: stops })] });
  const { color } = dots.seen[0].ctx;
  expect([0, 25, 50, 75, 100].map(v => d3.rgb(color(v)).formatHex())).toEqual(stops);
});

test('any d3 curve can be named', () => {
  const data = [{ x: 0, y: 0 }, { x: 1, y: 2 }, { x: 2, y: 1 }, { x: 3, y: 3 }];
  for (const curve of ['linear', 'step', 'step-before', 'step-after', 'basis', 'cardinal', 'catmull-rom', 'monotone', 'natural', 'bump-x']) {
    const { scene } = compile({ width: W, height: H, data, x: 'x', y: 'y', children: [Line({ curve })] });
    expect(scene.marks[0].d, curve).toMatch(/^M/);
  }
  expect(() => compile({ width: W, height: H, data, x: 'x', y: 'y', children: [Line({ curve: 'wobbly' })] })).toThrow(/curve.*wobbly/);
});

test('binning timestamps gives Date edges at round times', async () => {
  // When a door sensor fired over one night.
  const events = d3.range(40).map(i => ({ at: new Date(Date.UTC(2026, 9, 26, 21) + ((i * 7919) % 600) * 60000) }));
  const bins = bin(events, { value: 'at', thresholds: 8 });
  expect(bins.every(b => b.x0 instanceof Date && b.x1 instanceof Date)).toBe(true);
  expect(d3.sum(bins, b => b.count)).toBe(events.length);
  expect(new Set(bins.map(b => b.x1 - b.x0)).size).toBe(1);   // equal widths
  <Plot width={W} height={H} data={bins}><Rect x1="x0" x2="x1" y1={0} y2="count" inset={1} /><Axis channel="x" format="%H:%M" /></Plot>;
  await snapshot('bin-dates');
});

test('long category labels are cut to fit instead of crushing the plot', async () => {
  // Build steps of a CI pipeline, one with a very long name.
  const steps = [{ step: 'checkout', s: 4 }, { step: 'restore dependency cache for the monorepo workspace', s: 31 }, { step: 'test', s: 95 }];
  const bars = tap(<Rect x1={0} x2="s" y="step" />);
  <Plot width={248} height={90} data={steps}>{bars}<Axis channel="y" /></Plot>;
  const { area } = bars.seen[0].ctx;
  expect(area.width).toBeGreaterThan(248 / 2);
  const labels = [...drawFigure(figureKeys()[0]).matchAll(/>([^<]+)<\/text>/g)].map(m => m[1]);
  expect(labels).toContain('checkout');
  expect(labels.find(l => l.startsWith('restore'))).toMatch(/…$/);
  await snapshot('long-labels');
});

/* ---------- possible today: proven here so they stay possible ---------- */

test('a log scale with a single value does not produce NaN', () => {
  const { scene } = compile({ width: W, height: H, data: [{ x: 1, y: 10 }], x: 'x', y: 'y',
    children: [Scale({ channel: 'y', type: 'log' }), Dot(), Axis({ channel: 'y' })] });
  for (const s of [...scene.marks, ...scene.back]) for (const v of Object.values(s)) if (typeof v === 'number') expect(Number.isFinite(v)).toBe(true);
});

// A beeswarm places dots in pixels, after the scales, so it cannot be a position (positions run
// before scales). It is a mark: render() has the pixel scales.
const Swarm = defineMark('swarm', {
  render(rows, ctx) {
    const r = ctx.props.r ?? 3, placed = [], mid = (ctx.area.top + ctx.area.bottom) / 2;
    for (const row of d3.sort(rows, d => d.x)) {
      const x = ctx.x(row.x);
      let y = mid;
      for (let k = 1; placed.some(p => Math.hypot(p.x - x, p.y - y) < 2 * r); k++) y = mid + Math.ceil(k / 2) * 2 * r * (k % 2 ? -1 : 1);
      placed.push({ x, y });
    }
    return placed.map(p => ({ t: 'circle', cx: p.x, cy: p.y, r, fill: ctx.theme.palette[0] }));
  },
});

test('a beeswarm, as a custom mark: no two dots overlap', async () => {
  // Page load times in ms.
  const loads = d3.range(60).map(i => ({ ms: 180 + ((i * 37) % 23) * 6 + (i % 5) * 2 }));
  <Plot width={W} height={H} data={loads} x="ms"><Swarm r={3} /><Axis channel="x" /></Plot>;
  const svg = drawFigure(figureKeys()[0]);
  const dots = [...svg.matchAll(/<circle [^>]*>/g)].map(([c]) => ({ x: +c.match(/cx="([\d.]+)"/)[1], y: +c.match(/cy="([\d.]+)"/)[1] }));
  expect(dots).toHaveLength(loads.length);
  for (let i = 0; i < dots.length; i++) for (let j = i + 1; j < dots.length; j++) {
    expect(Math.hypot(dots[i].x - dots[j].x, dots[i].y - dots[j].y)).toBeGreaterThan(5.9);
  }
  await snapshot('beeswarm');
});

// An arrow is a Link with a head: also a few lines on defineMark.
const Arrow = defineMark('arrow', {
  color: 'stroke',
  render: (rows, ctx) => rows.flatMap(r => {
    const [x1, y1, x2, y2] = [ctx.x(r.x1), ctx.y(r.y1), ctx.x(r.x2), ctx.y(r.y2)];
    const a = Math.atan2(y2 - y1, x2 - x1), head = 6, stroke = ctx.resolve(r, 'stroke');
    const wing = s => `${x2 - head * Math.cos(a + s)},${y2 - head * Math.sin(a + s)}`;
    return [{ t: 'path', d: `M${x1},${y1}L${x2},${y2}M${wing(0.5)}L${x2},${y2}L${wing(-0.5)}`, fill: 'none', stroke, strokeWidth: 1.5 }];
  }),
});

test('arrows from before to after, as a custom mark', async () => {
  // Rent against commute time, before and after a move.
  const moves = [{ who: 'a', rent0: 900, rent1: 1200, min0: 50, min1: 20 }, { who: 'b', rent0: 1400, rent1: 1000, min0: 15, min1: 35 }];
  <Plot width={W} height={H} data={moves}><Arrow x1="rent0" x2="rent1" y1="min0" y2="min1" color="who" /><Axis channel="x" /></Plot>;
  expect(drawFigure(figureKeys()[0]).match(/<path /g)).toHaveLength(2);
  await snapshot('arrows');
});

test('a difference chart: the gap between two series, coloured by which is ahead', async () => {
  // Planned against actual focus hours per day.
  const days = d3.range(20).map(i => ({ day: i, planned: 4 + Math.sin(i / 3), actual: 4 + 1.6 * Math.sin(i / 2.2) }));
  const gap = days.map(d => ({ ...d, low: Math.min(d.planned, d.actual) }));
  <Plot width={W} height={H} data={gap} x="day">
    <Area y1="low" y2="actual" fill="#2a9d8f" fillOpacity={0.5} />
    <Area y1="low" y2="planned" fill="#e76f51" fillOpacity={0.5} />
    <Line y="planned" stroke="#555" />
  </Plot>;
  expect(drawFigure(figureKeys()[0]).match(/<path /g)).toHaveLength(3);
  await snapshot('difference');
});

test('a ridgeline: overlapping series, one baseline each, on one linear y', async () => {
  // Typing speed through the day, per weekday; each row may rise above its band.
  const weekdays = ['mon', 'tue', 'wed', 'thu', 'fri'];
  const ridges = weekdays.flatMap((wd, k) => d3.range(24).map(h => ({ wd, h, base: -k, top: -k + 1.6 * Math.exp(-(((h - 10 - k) / 3) ** 2)) })));
  <Plot width={W} height={H} data={ridges} x="h">
    <Area y1="base" y2="top" group="wd" curve="basis" fillOpacity={0.6} stroke="#fff" />
    <Layer data={weekdays.map((wd, k) => ({ wd, k: -k }))}><Text x={-Infinity} y="k" text={d => d.wd} textAnchor="start" dy={-2} /></Layer>
  </Plot>;
  expect(drawFigure(figureKeys()[0]).match(/<path /g)).toHaveLength(5);
  await snapshot('ridgeline');
});

test('bars a whole day wide on a time axis: x2 from an accessor', async () => {
  // Rain per day.
  const rain = d3.range(10).map(i => ({ day: new Date(Date.UTC(2026, 9, 10 + i)), mm: (i * 13) % 9 }));
  const bars = tap(<Rect x1="day" x2={d => d3.utcDay.offset(d.day, 1)} y1={0} y2="mm" inset={1} />);
  <Plot width={W} height={H} data={rain}>{bars}<Axis channel="x" /></Plot>;
  const { ctx } = bars.seen[0];
  const dayPx = ctx.x(new Date(Date.UTC(2026, 9, 11))) - ctx.x(new Date(Date.UTC(2026, 9, 10)));
  const widths = [...drawFigure(figureKeys()[0]).matchAll(/<rect [^>]*width="([\d.]+)"[^>]*fill/g)].map(m => +m[1]);
  for (const w of widths) expect(w).toBeCloseTo(dayPx, 0);
  await snapshot('day-bars');
});

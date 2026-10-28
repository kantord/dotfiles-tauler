// Axes as an open seam (SPEC 5.7, 5.13): placed on any side or inside the plot, replaced by a
// user-defined guide, and drawn under a polar coord. The first two tests were written first: they
// need an axis the built-in ones cannot draw.
import { test, expect } from 'vitest';
import '../../test/tauler.js';   // defines the JSX factory `h`
import { compile, defineGuide, defaultTheme, text, Axis, Grid, Scale } from '../core.jsx';
import { polar } from '../polar.jsx';
import { line } from '../scene.jsx';
import { Bar, Dot } from '../marks.jsx';

const W = 320, H = 200;
const rows = [{ t: 1, v: -12 }, { t: 2, v: 40 }, { t: 3, v: 25 }, { t: 4, v: 33 }];
const plot = (children, props = {}) => compile({ width: W, height: H, data: rows, x: 't', y: 'v', ...props, children }).scene;
const lines = scene => scene.back.filter(s => s.t === 'line');
const texts = scene => scene.back.filter(s => s.t === 'text');

/* ---------- a user-defined axis replaces the built-in one ---------- */

// A guide in the contract of GUIDES: claim the room it needs, draw from what the claim returned.
const ruler = {
  claim: (props, { placed }) => ({ room: { bottom: placed.bottom + 30 }, extent: 30, side: 'bottom', data: { ticks: [{ value: 2, label: 'two' }] } }),
  shapes: (props, data, scales, area) => [text(scales.x.default(data.ticks[0].value), area.bottom + 14, data.ticks[0].label, { textAnchor: 'middle' })],
};

test('Axis guide={...} replaces the built-in axis: its room, its shapes, and no built-in ones', () => {
  const plain = plot([<Dot />, <Axis channel="x" />]);
  const custom = plot([<Dot />, <Axis channel="x" guide={ruler} />]);
  expect(texts(plain).length).toBeGreaterThan(1);
  expect(lines(custom)).toHaveLength(0);
  expect(texts(custom).map(s => s.text)).toEqual(['two']);
  // the area ends 30px above the bottom (plus the base 8 is overridden by the claim of 30)
  expect(custom.clip.y + custom.clip.h).toBeCloseTo(H - 30 + 4, 5);
});

test('a replaced axis still feeds its ticks to a Grid, and a bad guide is refused', () => {
  const ticked = { ...ruler, claim: (p, st) => ({ ...ruler.claim(p, st), data: { ticks: [{ value: 2, label: 'two' }] } }) };
  const scene = plot([<Dot />, <Axis channel="x" guide={ticked} />, <Grid channel="x" />]);
  expect(lines(scene)).toHaveLength(1);
  expect(() => plot([<Dot />, <Axis guide={{ claim: () => ({ room: {} }) }} />])).toThrow(/Axis: a guide needs claim and shapes/);
});

test('defineGuide registers a new kind of guide, a piece that is claimed and drawn like an axis', () => {
  const Frame = defineGuide('testFrame', {
    claim: () => ({ room: { top: 20 }, side: 'top', extent: 20 }),
    shapes: (props, data, scales, area) => [line(area.left, area.top - 10, area.right, area.top - 10, { stroke: props.color })],
  });
  const scene = plot([<Dot />, <Frame color="#123456" />]);
  expect(lines(scene)).toHaveLength(1);
  expect(lines(scene)[0].stroke).toBe('#123456');
  expect(scene.clip.y).toBeCloseTo(20 - 4, 5);
  expect(() => defineGuide('axis', ruler)).toThrow(/already/);
  expect(() => defineGuide('broken', {})).toThrow(/claim and shapes/);
});

/* ---------- placement: other sides, and inside the plot ---------- */

test('an x axis can sit on top and a y axis on the right', () => {
  const area = scene => ({ top: scene.clip.y + 4, bottom: scene.clip.y + scene.clip.h - 4, right: scene.clip.x + scene.clip.w - 4 });
  const top = plot([<Dot />, <Axis channel="x" side="top" />]);
  expect(texts(top).length).toBeGreaterThan(1);
  for (const l of texts(top)) expect(l.y).toBeLessThan(area(top).top);
  const right = plot([<Dot />, <Axis channel="y" side="right" />]);
  for (const l of texts(right)) expect(l.x).toBeGreaterThan(area(right).right);
});

test('at= puts an axis inside the plot, on a value of the other scale, and claims no room', () => {
  const bare = plot([<Dot />]), inside = plot([<Dot />, <Axis channel="x" at={0} />]);
  expect(inside.clip).toEqual(bare.clip);
  const axisLine = lines(inside).find(s => s.y1 === s.y2 && s.x1 !== s.x2);
  expect(axisLine.y1).toBeGreaterThan(inside.clip.y + 4);
  expect(axisLine.y1).toBeLessThan(inside.clip.y + inside.clip.h - 4);
  const y0 = plot([<Dot />, <Axis channel="y" />]).back.find(s => s.t === 'text' && s.text === '0').y;   // the y axis's own '0'
  expect(axisLine.y1).toBeCloseTo(y0, 1);
  expect(() => plot([<Dot />, <Axis channel="x" at={0} label="t" />])).toThrow(/at.*label/);
});

/* ---------- polar axes ---------- */

const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun'].map((k, i) => ({ k, v: 3 + ((i * 7) % 5) }));
const rose = (extra = [], coord = polar()) => compile({ width: 240, height: 240, data: months, x: 'k', y: 'v', coord, children: [<Bar />, ...extra] }).scene;

test('a polar x Axis labels the angle: one label per band, outside the circle, with ticks and a rim', () => {
  const bare = rose(), scene = rose([<Axis channel="x" />]);
  const labels = texts(scene);
  expect(labels.map(s => s.text)).toEqual(months.map(m => m.k));
  const centre = (scene.clip.x + scene.clip.w / 2), cy = scene.clip.y + scene.clip.h / 2;
  const radius = Math.min(scene.clip.w, scene.clip.h) / 2 - 4;
  for (const l of labels) expect(Math.hypot(l.x - centre, l.y - cy)).toBeGreaterThan(radius);
  expect(lines(scene)).toHaveLength(months.length);           // a tick per label
  expect(scene.back.some(s => s.t === 'path')).toBe(true);    // the rim
  expect(scene.clip.w).toBeLessThan(bare.clip.w);             // the labels claimed room
  expect(labels.find(s => s.text === 'jan').textAnchor).toBe('start');    // right half (the first band's centre is 30 degrees)
  expect(labels.find(s => s.text === 'may').textAnchor).toBe('end');      // left half
});

test('a polar y Axis labels the radius along a spoke, and line={false} tickSize={0} leave only labels', () => {
  const scene = rose([<Axis channel="y" />, <Scale channel="y" domain={[0, 8]} />]);
  const labels = texts(scene), cx = scene.clip.x + scene.clip.w / 2;
  expect(labels.length).toBeGreaterThan(2);
  for (const l of labels) expect(l.x).toBeLessThan(cx);                   // left of the upward spoke
  const ys = labels.map(s => s.y);
  expect(ys).toEqual([...ys].sort((a, b) => b - a));                      // zero at the centre, larger values further up
  const bare = rose([<Axis channel="y" line={false} tickSize={0} />, <Scale channel="y" domain={[0, 8]} />]);
  expect(lines(bare)).toHaveLength(0);
  const right = texts(rose([<Axis channel="y" side="right" />, <Scale channel="y" domain={[0, 8]} />]));
  for (const l of right) expect(l.x).toBeGreaterThan(cx);
  const angled = rose([<Axis channel="y" angle={Math.PI / 2} />, <Scale channel="y" domain={[0, 8]} />]);
  expect(Math.min(...texts(angled).map(s => s.x))).toBeGreaterThanOrEqual(cx);   // along the spoke to the right
});

test('a polar Grid follows the polar Axis ticks, and unsupported polar axis options are named', () => {
  const pair = [{ v: 1 }, { v: 2 }];
  const spokes = (...children) => compile({ width: 200, height: 200, data: pair, x: 'v', y: 'v', coord: polar(), children: [<Dot />, ...children] })
    .scene.back.filter(s => s.t === 'line' && s.stroke === defaultTheme.line).length;
  expect(spokes(<Grid channel="x" />)).toBeGreaterThan(2);
  expect(spokes(<Axis channel="x" ticks={[1, 1.5]} />, <Grid channel="x" />)).toBe(2);
  expect(spokes(<Axis channel="x" ticks={[1, 1.5]} />, <Grid channel="x" ticks={[1, 1.25, 1.5]} />)).toBe(3);
  expect(() => rose([<Axis channel="x" label="month" />])).toThrow(/polar/);
  expect(() => rose([<Axis channel="x" labelAngle={-45} />])).toThrow(/labelAngle/);
  expect(() => rose([<Axis channel="x" at={1} />])).toThrow(/polar/);
});

/* ---------- review fixes: y ticks on the final plot height, time zone ---------- */

test('y axis labels stay inside the figure at any height, the scale niced as the axis ticks', () => {
  for (const height of [110, 122, 140, 160]) {
    const { scene } = compile({ width: 300, height, data: [{ a: 0, b: 0 }, { a: 1, b: 6.6 }], x: 'a', y: 'b', children: [<Dot />, <Axis channel="y" />] });
    const ys = texts(scene).map(s => s.y);
    expect(ys.length).toBeGreaterThan(1);
    for (const y of ys) { expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThanOrEqual(height); }
  }
});

test('Axis ticks={n} sets the y tick count the scale is niced for: the top tick is the domain end', () => {
  const { scene } = compile({ width: 300, height: 140, data: [{ a: 0, b: 0 }, { a: 1, b: 6.6 }], x: 'a', y: 'b', children: [<Dot />, <Axis channel="y" ticks={10} />] });
  const top = texts(scene).reduce((best, s) => s.y < best.y ? s : best);
  expect(parseFloat(top.text)).toBe(7);
});

test('the same time plot has the same scene key in any time zone', () => {
  const data = Array.from({ length: 6 }, (_, i) => ({ t: new Date(Date.UTC(2026, 2, 28, 3 * i)), v: i }));
  const keyIn = tz => {
    const before = process.env.TZ;
    process.env.TZ = tz;
    try {
      const hour = new Date(Date.UTC(2026, 0, 1, 12)).getHours();
      return { hour, key: compile({ width: 300, height: 140, data, x: 't', y: 'v', children: [<Dot />, <Axis channel="x" />] }).key };
    } finally { process.env.TZ = before; }
  };
  const utc = keyIn('UTC'), york = keyIn('America/New_York');
  expect(york.hour).not.toBe(utc.hour);   // the zone really changed
  expect(york.key).toBe(utc.key);
});

test('a time Scale domain given as strings is read as dates, like the rows', () => {
  const data = [{ t: '2020-03-01', v: 1 }, { t: '2020-09-01', v: 2 }];
  const { scene } = compile({ width: 300, height: 140, data, x: 't', y: 'v',
    children: [<Dot />, <Axis channel="x" />, <Scale channel="x" type="time" domain={['2020-01-01', '2021-01-01']} />] });
  expect(scene.marks.every(s => Number.isFinite(s.cx))).toBe(true);
  expect(texts(scene).length).toBeGreaterThan(1);
});

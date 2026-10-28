// Gap examples g32, g46, g47: small multiples, figures as a pure function of state, and keys that
// match across runtimes (SPEC 5.8, interaction, 0.2).
import { test, expect } from 'vitest';
import * as d3 from 'd3';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { compile, defineMark, Scale, Axis, Grid } from '../../core.jsx';
import { Line, Rect, Dot, Text, Arc } from '../../marks.jsx';
import { kde } from '../../stats.jsx';
import { need, tap, near, seeded } from './support.js';

/* ---------- g32: four small panels over shared scales (the documented pattern) ---------- */

const rnd = seeded(5);
const readings = ['north', 'south', 'east', 'west'].flatMap((region, k) =>
  d3.range(3 + k * 2).map(i => ({ region, t: i, v: 10 + 15 * k + 8 * rnd() })));   // panels of different sizes and ranges
const shared = { x: d3.extent(readings, d => d.t), y: d3.extent(readings, d => d.v) };

function panel(rows) {
  const dots = tap(<Dot />);
  compile({ width: 120, height: 90, data: rows, x: 't', y: 'v',   // no margin prop, no positioning trick
    children: [dots, <Scale channel="x" domain={shared.x} />, <Scale channel="y" domain={shared.y} />, <Axis channel="x" />, <Axis channel="y" />, <Grid channel="y" />] });
  return dots.seen[0].ctx;
}

test('g32 panels given the same domains share one plot area and one mapping (the documented pattern)', () => {
  const ctxs = d3.groups(readings, d => d.region).map(([, rows]) => panel(rows));
  expect(ctxs).toHaveLength(4);
  for (const c of ctxs.slice(1)) {
    expect(c.area).toEqual(ctxs[0].area);
    near(c.x(3), ctxs[0].x(3), 1e-9);
    near(c.y(25), ctxs[0].y(25), 1e-9);
  }
});

// Decided (SPEC 5.8): no facet piece. Colour trains first-seen per Plot, so the colour domain is
// passed to every panel; without it one category gets a different colour in different panels.
test('g32 with the colour domain passed, a category has the same colour in every panel', () => {
  const kinds = ['a', 'b', 'c'];
  const rows = [{ t: 0, v: 1, k: 'b' }, { t: 1, v: 2, k: 'a' }, { t: 0, v: 3, k: 'a' }, { t: 1, v: 4, k: 'c' }];
  const colorOf = (data, pinned) => {
    const dots = tap(<Dot />);
    compile({ width: 120, height: 90, data, x: 't', y: 'v', color: 'k',
      children: [dots, ...(pinned ? [<Scale channel="color" domain={kinds} />] : [])] });
    return dots.seen[0].ctx.color('a');
  };
  expect(colorOf(rows.slice(0, 2), true)).toBe(colorOf(rows.slice(2), true));
  expect(colorOf(rows.slice(0, 2), false)).not.toBe(colorOf(rows.slice(2), false));
});

/* ---------- g46: a figure is a pure function of explicit state ---------- */

const signal = d3.range(12).map(t => ({ t, v: 5 + 4 * Math.sin(t / 2) }));

// Tooltip, brush range and zoom window are all drawn from `state`; nothing else is read.
const figure = ({ hover = null, brush = null, zoom = [0, 11] }) => {
  const line = tap(<Line />);
  const picked = hover == null ? [] : [signal[hover]];
  const { scene, key } = compile({ width: 300, height: 160, data: signal, x: 't', y: 'v', children: [
    line, <Scale channel="x" domain={zoom} />,
    brush && <Rect x1={brush[0]} x2={brush[1]} y1={-Infinity} y2={Infinity} fill="#2b59d1" fillOpacity={0.2} />,
    <Dot data={picked} x="t" y="v" r={4} />,
    <Text data={picked} x="t" y="v" text={d => d.v.toFixed(1)} dy={-8} />].filter(Boolean) });
  return { scene, key, ctx: line.seen[0].ctx };
};

test('g46 the same state gives the same key; each different state gives a different one', () => {
  const states = [{}, { hover: 3 }, { hover: 4 }, { brush: [2, 6] }, { brush: [2, 7] }, { zoom: [2, 8] }];
  const keys = states.map(s => figure(s).key);
  expect(new Set(keys).size).toBe(states.length);
  expect(figure({ hover: 3 }).key).toBe(keys[1]);
});

test('g46 the tooltip sits on the hovered datum, the brush spans its range, the zoom changes the mapping', () => {
  const { scene, ctx } = figure({ hover: 5, brush: [2, 6] });
  const dot = scene.marks.find(s => s.t === 'circle');
  near(dot.cx, ctx.x(5), 0.02);
  near(dot.cy, ctx.y(signal[5].v), 0.02);
  expect(scene.front.map(s => s.text)).toEqual([signal[5].v.toFixed(1)]);
  const brush = scene.marks.find(s => s.t === 'rect');
  near(brush.x, ctx.x(2), 0.02);
  near(brush.width, ctx.x(6) - ctx.x(2), 0.02);
  const zoomed = figure({ zoom: [2, 8] }).ctx;
  near(zoomed.x(2), zoomed.area.left, 1e-9);
  near(zoomed.x(8), zoomed.area.right, 1e-9);
});

/* ---------- g47: the same key in Node and in tauler's runtime ---------- */

// Scenes whose numbers sit on a rounding boundary (tidy rounds to 2 decimals) and trig-based shapes.
const scenes = {
  'rounding-boundary': () => ({ width: 100.5, height: 60, data: [{ k: 'a', v: 1.005 }, { k: 'b', v: 2.675 }], x: 'k', y: 'v', margin: { left: 0, right: 0, top: 0, bottom: 0 }, children: [<Rect />, <Scale channel="y" domain={[0, 3.015]} />] }),
  'trig-arc': () => ({ width: 120, height: 120, data: [{ v: 3 }, { v: 5 }, { v: 2 }], children: [<Arc value="v" color="v" />] }),
  'kde-line': () => ({ width: 200, height: 100, data: kde(d3.range(30).map(i => 10 + 5 * Math.sin(i * 1.3) + (i % 4)), { value: d => d, points: 25 }), x: 'x', y: 'density', children: [<Line />] }),
};
const GOLDEN = fileURLToPath(new URL('../golden-keys.json', import.meta.url));

test('g47 in Node, a boundary scene and trig scenes give the same key on every compile', () => {
  for (const make of Object.values(scenes)) expect(compile(make()).key).toBe(compile(make()).key);
});

// `UPDATE_GOLDEN=1 npx vitest run charts/test/gaps/state-determinism` rewrites the file; review the diff.
// tauler's side (a test that runs these scenes in its own runtime against this file) is a follow-up.
test('g47 a golden-key file covers boundary, trig and kde scenes, and Node reproduces every key', () => {
  if (process.env.UPDATE_GOLDEN) {
    writeFileSync(GOLDEN, JSON.stringify(Object.fromEntries(Object.entries(scenes).map(([n, make]) => [n, compile(make()).key])), null, 2) + '\n');
  }
  const golden = JSON.parse(readFileSync(GOLDEN, 'utf8'));   // charts/test/golden-keys.json, also read by tauler's own runtime test
  for (const [name, make] of Object.entries(scenes)) expect(golden[name]).toBe(compile(make()).key);
});

// tidy rounds shapes to 2 decimals; a value on an x.xx5 boundary rounds by its float bits.
test('g47 a value on a rounding boundary rounds as float arithmetic says, in the scene', () => {
  const Probe = defineMark('probe', { render: () => [{ t: 'rect', x: 1.005, y: 1.255, width: 1.115, height: 3 }] });
  const { scene } = compile({ width: 50, height: 50, children: [Probe()] });
  expect(scene.marks[0]).toMatchObject({ x: 1, y: 1.25, width: 1.12, height: 3 });
});

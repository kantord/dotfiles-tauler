// Gap examples g16-g22: stack and dodge options, shared positions, sparse bands, jitter
// (GAPS 3.12, 3.3, 3.4a). Rows are raw: unsorted and unreshaped.
import { test, expect } from 'vitest';
import * as d3 from 'd3';
import { compile, Layer, Scale, stack, dodge } from '../../core.jsx';
import { Line, Area, Bar, Dot } from '../../marks.jsx';
import { need, tap, near, W, H } from './support.js';

const build = (children, data, props) => compile({ width: W, height: H, data, ...props, children });
const pilesOf = (rows, key = 'x') => d3.group(rows, r => r[key]);

/* ---------- g16: centred baseline and chosen layer order ---------- */

const flows = d3.range(6).flatMap(x => ['a', 'b', 'c'].map((s, i) => ({ x, s, v: 3 + i * 2 + 2 * Math.sin(x * (1 + i) * 0.7) })));
const stacked = options => { const area = tap(<Area position={stack(options)} />); build([area], flows, { x: 'x', y: 'v', color: 's' }); return area.seen[0].rows; };

test.fails('g16 stack({ offset: "wiggle" }) moves the baseline and keeps each pile as thick as its total', () => {
  const rows = stacked({ offset: 'wiggle' });
  const baselines = [...pilesOf(rows).values()].map(pile => d3.min(pile, r => r.y1));
  for (const [x, pile] of pilesOf(rows)) near(d3.max(pile, r => r.y2) - d3.min(pile, r => r.y1), d3.sum(flows.filter(f => f.x === x), f => f.v), 0.001);
  expect(d3.max(baselines, Math.abs)).toBeGreaterThan(0.5);
});

test.fails('g16 stack({ offset: "silhouette" }) centres every pile on zero', () => {
  for (const pile of pilesOf(stacked({ offset: 'silhouette' })).values()) near(d3.min(pile, r => r.y1) + d3.max(pile, r => r.y2), 0, 0.001);
});

test.fails('g16 stack({ order: "descending" }) puts the series with the largest total at the bottom', () => {
  const totals = d3.rollup(flows, v => d3.sum(v, f => f.v), f => f.s);
  const biggest = d3.greatest(totals, ([, t]) => t)[0];
  for (const pile of pilesOf(stacked({ order: 'descending' })).values()) expect(pile.find(r => r.y1 === 0).color).toBe(biggest);
});

/* ---------- g17: a diverging stack with a series across zero ---------- */

const LEVELS = ['no+', 'no', 'neutral', 'yes', 'yes+'];
const answers = [['Q3', [4, 9, 6, 12, 5]], ['Q1', [2, 5, 10, 8, 3]], ['Q2', [7, 6, 2, 9, 9]]]   // categories unsorted
  .flatMap(([q, ns]) => LEVELS.map((level, i) => ({ q, level, n: ns[i] })));

test.fails('g17 stack({ anchor }) places the named series across zero, the others either side', () => {
  const bars = tap(<Bar position={stack({ along: 'x', anchor: 'neutral' })} />);
  build([bars], answers, { x: 'n', y: 'q', color: 'level' });
  for (const pile of pilesOf(bars.seen[0].rows, 'y').values()) {
    const at = Object.fromEntries(pile.map(r => [r.color, r]));
    const half = at.neutral.d.n / 2;
    near(at.neutral.x1, -half); near(at.neutral.x2, half);
    near(at.no.x2, -half); near(at.no.x1, -half - at.no.d.n);
    near(at['no+'].x2, at.no.x1); near(at['no+'].x1, at.no.x1 - at['no+'].d.n);
    near(at.yes.x1, half); near(at.yes.x2, half + at.yes.d.n);
    near(at['yes+'].x1, at.yes.x2); near(at['yes+'].x2, at.yes.x2 + at['yes+'].d.n);
  }
});

/* ---------- g18: stack order is an option, not a sort of the input ---------- */

// First-seen order is b, a, c; the order asked for is c, a, b.
const shuffled = d3.range(4).flatMap(x => [['b', 3], ['a', 2], ['c', 4]].map(([s, v]) => ({ x, s, v: v + x })));

test.fails('g18 stack({ order: [...] }) orders raw rows as asked, bottom to top', () => {
  const before = JSON.stringify(shuffled);
  const area = tap(<Area position={stack({ order: ['c', 'a', 'b'] })} />);
  build([area], shuffled, { x: 'x', y: 'v', color: 's' });
  expect(JSON.stringify(shuffled)).toBe(before);   // the input was not sorted or reversed
  for (const pile of pilesOf(area.seen[0].rows).values()) {
    expect(d3.sort(pile, r => r.y1).map(r => r.color)).toEqual(['c', 'a', 'b']);
  }
});

/* ---------- g19: a line and an area over one stack, declared once ---------- */

test.fails('g19 marks inside a Layer inherit its position, so one stack() serves an area and a line', () => {
  const area = tap(<Area />), line = tap(<Line />);
  build([<Layer position={stack()}>{area}{line}</Layer>], flows, { x: 'x', y: 'v', color: 's' });
  expect(area.props.position).toBeUndefined();
  expect(line.props.position).toBeUndefined();
  for (const seen of [area.seen[0], line.seen[0]]) {
    for (const pile of pilesOf(seen.rows).values()) {
      const cumulative = d3.cumsum(['a', 'b', 'c'].map(s => pile.find(r => r.color === s).d.v));
      ['a', 'b', 'c'].forEach((s, i) => near(pile.find(r => r.color === s).y2, cumulative[i], 0.001));
    }
  }
});

/* ---------- g20: sparse bands give wider bars ---------- */

const sparse = [{ band: 'north', who: 'a', n: 3 }, { band: 'north', who: 'b', n: 4 }, { band: 'north', who: 'c', n: 2 }, { band: 'south', who: 'b', n: 5 }];
const slots = () => {
  const bars = tap(<Bar position={dodge()} />);
  build([bars], sparse, { x: 'band', y: 'n', color: 'who' });
  return bars.seen[0].rows;
};

test.fails('g20 a band with fewer series gives its bars more room', () => {
  const rows = slots();
  const width = band => rows.find(r => r.x === band).u2 - rows.find(r => r.x === band).u1;
  expect(width('south')).toBeGreaterThan(width('north'));
  near(width('south'), 0.9, 0.001);   // one series fills the band less its padding
});

test('g20 dodge keeps the series in one global order and never overlaps within a band', () => {
  const north = slots().filter(r => r.x === 'north');
  expect(north.map(r => r.color)).toEqual(['a', 'b', 'c']);
  d3.pairs(north).forEach(([p, q]) => expect(q.u1).toBeGreaterThanOrEqual(p.u2));
});

/* ---------- g21: dodge order is an option ---------- */

test.fails('g21 dodge({ order }) sets the order of raw rows within a band', () => {
  const bars = tap(<Bar position={dodge({ order: ['c', 'b', 'a'] })} />);
  build([bars], sparse.filter(r => r.band === 'north'), { x: 'band', y: 'n', color: 'who' });   // rows arrive a, b, c
  const at = Object.fromEntries(bars.seen[0].rows.map(r => [r.color, r.u1]));
  expect(at.c).toBeLessThan(at.b);
  expect(at.b).toBeLessThan(at.a);
});

/* ---------- g22: deterministic jitter on a band axis ---------- */

// Five points that sit on top of each other; an `id` names each.
const strip = [['p1', 'north', 5], ['p2', 'north', 5], ['p3', 'north', 5], ['p4', 'south', 5], ['p5', 'south', 6]].map(([id, g, v]) => ({ id, g, v }));
const offsetOf = r => (r.u1 == null ? 0 : (r.u1 + r.u2) / 2 - 0.5);

function jittered(data, { keyed = true, scales = [<Scale channel="x" type="band" />] } = {}) {
  const jitter = need('jitter');
  const dots = tap(keyed ? <Dot key="id" position={jitter()} /> : <Dot position={jitter()} />);
  const { scene } = build([dots, ...scales], data, { x: 'g', y: 'v' });
  return { rows: dots.seen[0].rows, ctx: dots.seen[0].ctx, scene };
}
const byId = rows => Object.fromEntries(rows.map(r => [r.d.id, offsetOf(r)]));

test.fails('g22 jitter() twice on the same rows gives equal offsets, and spreads them', () => {
  const [a, b] = [byId(jittered(strip).rows), byId(jittered(strip).rows)];
  expect(a).toEqual(b);
  expect(new Set(Object.values(a)).size).toBeGreaterThan(1);
});

test.fails('g22 two rows with different keys get different offsets', () => {
  const o = byId(jittered(strip).rows);
  expect(o.p1).not.toBe(o.p2);
});

test.fails('g22 rows with no key get offset 0 and overlap', () => {
  expect(jittered(strip, { keyed: false }).rows.map(offsetOf)).toEqual([0, 0, 0, 0, 0]);
});

test.fails('g22 every offset stays inside the band, in pixels too', () => {
  const { rows, ctx, scene } = jittered(strip);
  for (const r of rows) expect(Math.abs(offsetOf(r))).toBeLessThanOrEqual(0.5);
  const circles = scene.marks.filter(s => s.t === 'circle');
  rows.forEach((r, i) => expect(Math.abs(circles[i].cx - ctx.x(r.x))).toBeLessThanOrEqual(ctx.bandwidth.x() / 2 + 0.01));
  expect(new Set(circles.slice(0, 3).map(c => c.cx)).size).toBeGreaterThan(1);   // point marks honour u1 u2
});

test.fails('g22 removing one unique row leaves the other offsets unchanged', () => {
  const all = byId(jittered(strip).rows), fewer = byId(jittered(strip.filter(d => d.id !== 'p3')).rows);
  for (const [id, o] of Object.entries(fewer)) expect(all[id]).toBe(o);
});

test.fails('g22 an undeclared or non-band axis throws, naming jitterPx', () => {
  expect(() => jittered(strip, { scales: [] })).toThrow(/jitterPx/);
  const numeric = strip.map((d, i) => ({ ...d, g: i }));
  expect(() => jittered(numeric, { scales: [<Scale channel="x" type="linear" />] })).toThrow(/jitterPx/);
});

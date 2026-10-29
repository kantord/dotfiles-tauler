// Gap examples g23-g29: per-series statistics, reshaping helpers, statistic-plus-mark
// composites, reference lines, ordering and date ranges (3.1, 3.13, 3.2, 3.7).
// Helper names and option spellings are the target call sites; the input is always raw.
import { test, expect } from 'vitest';
import * as d3 from 'd3';
import { compile, Scale } from '../../core.jsx';
import { Line, Area, Rect, Bar, Dot, Link } from '../../marks.jsx';
import { rolling, cumsum, boxStats, normalize, last, fold, groupBy, rank } from '../../stats.jsx';
import { need, tap, near, W, H } from './support.js';

const frozen = data => JSON.stringify(data);

/* ---------- g23: per-series statistics do not leak between series ---------- */

// Two series, interleaved row by row (ordered within each series, as the helpers require).
const A = [10, 12, 11, 14, 16], B = [100, 90, 95, 80, 85];
const twin = d3.range(5).flatMap(t => [{ s: 'a', t, v: A[t] }, { s: 'b', t, v: B[t] }]);
const ofSeries = (rows, s) => rows.filter(r => r.s === s);

test('g23 rolling({ by }) smooths each series on its own', () => {
  const out = rolling(twin, { by: 's', value: 'v', window: 3, as: 'm' });
  for (const [s, v] of [['a', A], ['b', B]]) {
    const rows = ofSeries(out, s);
    near(rows[0].m, v[0]);
    near(rows[2].m, d3.mean(v.slice(0, 3)));
    near(rows[4].m, d3.mean(v.slice(2, 5)));
  }
});

test('g23 cumsum({ by }) restarts at zero in each series', () => {
  const out = cumsum(twin, { by: 's', value: 'v' });
  for (const [s, v] of [['a', A], ['b', B]]) {
    const rows = ofSeries(out, s);
    expect(rows[0].from).toBe(0);
    expect(rows[0].to).toBe(v[0]);
    expect(rows.at(-1).to).toBe(d3.sum(v));
  }
});

test('g23 normalize({ by }) starts every series at the same value', () => {
  const out = normalize(twin, { by: 's', value: 'v', as: 'idx' });
  const a = ofSeries(out, 'a'), b = ofSeries(out, 'b');
  near(a[0].idx, b[0].idx);
  near(a[3].idx / a[0].idx, A[3] / A[0], 1e-9);
  near(b[3].idx / b[0].idx, B[3] / B[0], 1e-9);
});

test('g23 last({ by }) keeps the final row of each series', () => {
  const out = last(twin, { by: 's' });
  expect(out.map(r => [r.s, r.t, r.v]).sort()).toEqual([['a', 4, 16], ['b', 4, 85]]);
});

/* ---------- g24: a rolling mean and spread in one call ---------- */

test('g24 one rolling() call returns several outputs per window and drops incomplete windows', () => {
  const v = [4, 8, 6, 12, 10, 7, 15];
  const data = v.map((value, i) => ({ i, value }));
  const before = frozen(data);
  const out = rolling(data, { value: 'value', window: 3, partial: false, reduce: { mean: d3.mean, sd: d3.deviation } });
  expect(out).toHaveLength(v.length - 2);   // no slice, no second call
  out.forEach((row, k) => {
    const w = v.slice(k, k + 3);
    near(row.mean, d3.mean(w), 1e-9);
    near(row.sd, d3.deviation(w), 1e-9);
  });
  expect(frozen(data)).toBe(before);
  expect(rolling(data, { value: 'value', window: 3, partial: true, reduce: { mean: d3.mean } })).toHaveLength(v.length);
});

/* ---------- g25: reshape, aggregate with named outputs, rank ---------- */

const wide = [{ shop: 'pier', q1: 12, q2: 30, q3: 18 }, { shop: 'hill', q1: 25, q2: 5, q3: 40 }, { shop: 'dock', q1: 8, q2: 22, q3: 9 }];

test('g25 fold turns wide rows into long rows and leaves the input alone', () => {
  const before = frozen(wide);
  const long = fold(wide, { keys: ['q1', 'q2', 'q3'], key: 'quarter', value: 'amount' });
  expect(long).toHaveLength(9);
  for (const w of wide) for (const q of ['q1', 'q2', 'q3']) {
    expect(long.filter(r => r.shop === w.shop && r.quarter === q).map(r => r.amount)).toEqual([w[q]]);
  }
  expect(frozen(wide)).toBe(before);
});

test('g25 groupBy returns several named outputs per group', () => {
  const sales = [{ r: 'n', amount: 4 }, { r: 's', amount: 9 }, { r: 'n', amount: 6 }, { r: 's', amount: 1 }, { r: 'n', amount: 5 }];
  const out = groupBy(sales, { by: 'r', outputs: { total: rows => d3.sum(rows, d => d.amount), n: rows => rows.length } });
  const get = key => out.find(o => o.r === key || o.key === key);
  expect([get('n').total, get('n').n]).toEqual([15, 3]);
  expect([get('s').total, get('s').n]).toEqual([10, 2]);
});

test('g25 rank numbers rows by value, largest first, without reordering them', () => {
  const rows = [{ k: 'x', v: 30 }, { k: 'y', v: 90 }, { k: 'z', v: 10 }, { k: 'w', v: 55 }];
  const out = rank(rows, { value: 'v', as: 'rank', descending: true });
  expect(out.map(r => r.k)).toEqual(['x', 'y', 'z', 'w']);
  expect(out.map(r => r.rank)).toEqual([3, 1, 4, 2]);
});

/* ---------- g26: statistic-plus-mark composites ---------- */

const fitInput = d3.range(10).map(i => ({ x: i * 1.5, y: 1 + 2 * i * 1.5 + (i % 2 ? 0.6 : -0.6) }));

test('g26 regress returns a fitted line with a band that widens away from the centre', () => {
  const xs = fitInput.map(d => d.x), ys = fitInput.map(d => d.y), mx = d3.mean(xs), my = d3.mean(ys);
  const slope = d3.sum(fitInput, d => (d.x - mx) * (d.y - my)) / d3.sum(fitInput, d => (d.x - mx) ** 2), intercept = my - slope * mx;
  const fit = need('regress')(fitInput, { x: 'x', y: 'y' });
  near(fit[0].x, d3.min(xs), 0.01);
  near(fit.at(-1).x, d3.max(xs), 0.01);
  for (const r of fit) { near(r.y, intercept + slope * r.x, 0.01); expect(r.y1).toBeLessThan(r.y); expect(r.y2).toBeGreaterThan(r.y); }
  const width = r => r.y2 - r.y1, centre = d3.least(fit, r => Math.abs(r.x - mx));
  expect(width(fit[0])).toBeGreaterThan(width(centre));
  expect(width(fit.at(-1))).toBeGreaterThan(width(centre));
  expect(compile({ width: W, height: H, data: fit, x: 'x', children: [<Area y1="y1" y2="y2" />, <Line y="y" />] }).scene.marks).toHaveLength(2);
});

test('g26 difference splits the gap between two series by sign and meets at the crossings', () => {
  const north = [3, 5, 4, 2, 1], south = [2, 3, 4.5, 3.5, 0.5];
  const data = d3.range(5).flatMap(t => [{ t, s: 'north', v: north[t] }, { t, s: 'south', v: south[t] }]);
  const rows = need('difference')(data, { x: 't', y: 'v', by: 's', a: 'north', b: 'south' });
  const cross = [[1.8, 5 - 0.8], [3.75, 2 - 0.75]];   // linear interpolation, worked out by hand
  for (const [x, y] of cross) {
    const r = rows.find(row => Math.abs(row.x - x) < 0.01);
    expect(r).toBeDefined();
    near(r.y1, r.y2, 1e-6);
    near(r.y1, y, 0.01);
  }
  const signs = new Set(rows.filter(r => Math.abs(r.y2 - r.y1) > 1e-6).map(r => r.sign));
  expect(signs.size).toBe(2);
  for (const sign of signs) {
    const gaps = rows.filter(r => r.sign === sign && Math.abs(r.y2 - r.y1) > 1e-6).map(r => Math.sign(r.y2 - r.y1));
    expect(new Set(gaps).size).toBe(1);   // one sign per fill
  }
});

test('g26 waterfall steps from running totals and ends with a total bar from zero', () => {
  const steps = [{ what: 'sales', delta: 40 }, { what: 'refunds', delta: -12 }, { what: 'fees', delta: -5 }, { what: 'tips', delta: 9 }];
  const rows = need('waterfall')(steps, { value: 'delta', total: true });
  expect(rows).toHaveLength(steps.length + 1);
  d3.pairs(rows.slice(0, -1)).forEach(([p, q]) => near(q.from, p.to));
  expect([rows.at(-1).from, rows.at(-1).to]).toEqual([0, 32]);
  expect(compile({ width: W, height: H, data: rows, x: (d, i) => i, children: [<Rect y1="from" y2="to" width={6} />] }).scene.marks.length).toBe(rows.length);
});

test('g26 box with whiskers and outliers is one statistic plus ordinary marks (works today)', () => {
  const groups = ['u', 'v'].flatMap((g, k) => [...d3.range(9).map(i => 10 + k * 5 + i), 60 + k * 5].map(value => ({ g, value })));
  const boxes = boxStats(groups, { by: 'g', value: 'value' });
  const outliers = boxes.flatMap(b => b.outliers.map(d => ({ key: b.key, value: d.value })));
  const { scene } = compile({ width: W, height: H, data: boxes, x: 'key', children: [
    <Link y1="lo" y2="hi" />, <Rect y1="q1" y2="q3" inset={6} />, <Rect y1="med" y2="med" stroke="#000" inset={6} />,
    <Dot data={outliers} x="key" y="value" />] });
  expect(outliers).toHaveLength(2);
  expect(scene.marks.filter(s => s.t === 'circle')).toHaveLength(2);
  expect(scene.marks.filter(s => s.t === 'rect')).toHaveLength(2);
});

test('g26 tickX draws one short vertical tick per interval end', () => {
  const TickX = need('TickX', 'tickX');
  const events = [{ t: 2, lane: 'a' }, { t: 5, lane: 'a' }, { t: 3, lane: 'b' }];
  const ticks = tap(<TickX x="t" y="lane" />);
  const { scene } = compile({ width: W, height: H, data: events, children: [ticks] });
  const lines = scene.marks.filter(s => s.t === 'line');
  expect(lines).toHaveLength(3);
  lines.forEach((l, i) => {
    expect(l.x1).toBe(l.x2);
    near(l.x1, ticks.seen[0].ctx.x(events[i].t), 0.02);
    near((l.y1 + l.y2) / 2, ticks.seen[0].ctx.y(events[i].lane), 0.02);
    expect(Math.abs(l.y2 - l.y1)).toBeGreaterThan(0);
  });
});

/* ---------- g27: reference lines are one mark ---------- */

const speeds = [{ t: 1, v: 62 }, { t: 2, v: 88 }, { t: 3, v: 75 }, { t: 4, v: 101 }];

test('g27 ruleY draws one line across the plot at a value, with no Infinity in the call', () => {
  const RuleY = need('RuleY', 'ruleY');
  const rule = tap(RuleY({ y: 90 }));
  const dots = tap(<Dot />);
  const { scene } = compile({ width: W, height: H, data: speeds, x: 't', y: 'v', children: [dots, rule] });
  const { area, y } = rule.seen[0].ctx;
  expect(Object.values(rule.props).some(v => Math.abs(v) === Infinity)).toBe(false);
  const lines = scene.marks.filter(s => s.t === 'line');
  expect(lines).toHaveLength(1);
  expect([lines[0].x1, lines[0].x2]).toEqual([area.left, area.right]);
  near(lines[0].y1, y(90), 0.02);
  near(lines[0].y2, y(90), 0.02);
});

test('g27 ruleX draws one vertical line per datum of its own data', () => {
  const RuleX = need('RuleX', 'ruleX');
  const marks = [{ at: 2 }, { at: 3.5 }];
  const rule = tap(RuleX({ data: marks, x: 'at' }));
  const { scene } = compile({ width: W, height: H, data: speeds, x: 't', y: 'v', children: [<Dot />, rule] });
  const { area, x } = rule.seen[0].ctx;
  const lines = scene.marks.filter(s => s.t === 'line');
  expect(lines).toHaveLength(2);
  lines.forEach((l, i) => { near(l.x1, x(marks[i].at), 0.02); expect([l.y1, l.y2].sort((p, q) => p - q)).toEqual([area.top, area.bottom]); });
});

/* ---------- g28: one category order for every panel ---------- */

const hosts = [{ h: 'h1', svc: 'db', ms: 40 }, { h: 'h1', svc: 'web', ms: 90 }, { h: 'h1', svc: 'cache', ms: 5 },
  { h: 'h2', svc: 'db', ms: 120 }, { h: 'h2', svc: 'web', ms: 30 }, { h: 'h2', svc: 'cache', ms: 8 }, { h: 'h2', svc: 'queue', ms: 60 }];

const panelOrder = (rows, domain) => {
  const bars = tap(<Bar />);
  compile({ width: 160, height: 100, data: rows, x: 'ms', y: 'svc', children: [bars, <Scale channel="y" domain={domain} />] });
  const { y } = bars.seen[0].ctx;
  return d3.sort(domain, v => y(v));
};

test('g28 an explicit band domain fixes the order of a panel (works today)', () => {
  const domain = ['web', 'db', 'cache', 'queue'];
  expect(panelOrder(hosts.filter(r => r.h === 'h1'), domain)).toEqual(domain);
});

test('g28 orderBy over all the data gives the same ranked order in every panel', () => {
  const orderBy = need('orderBy');
  const domain = orderBy(hosts, { field: 'svc', by: 'ms', stat: 'sum', descending: true });
  expect(domain).toEqual(['db', 'web', 'queue', 'cache']);   // 160, 120, 60, 13
  const [p1, p2] = ['h1', 'h2'].map(h => panelOrder(hosts.filter(r => r.h === h), domain));
  expect(p1).toEqual(domain);
  expect(p2).toEqual(domain);
  expect(orderBy(hosts, { field: 'svc', by: 'ms', stat: 'max' })).toEqual(['cache', 'queue', 'web', 'db']);   // ties and order: ascending by default
});

/* ---------- g29: quiet days and zero bars ---------- */

const day = n => new Date(Date.UTC(2026, 9, n));
const busy = [{ when: day(1), n: 4 }, { when: day(2), n: 6 }, { when: day(5), n: 3 }, { when: day(8), n: 7 }];

test('g29 dateRange keeps the quiet days as empty slots on a band axis', () => {
  const domain = need('dateRange')(busy, { field: 'when', interval: 'day' });
  expect(domain.map(d => +d)).toEqual(d3.range(1, 9).map(n => +day(n)));
  const bars = tap(<Bar />);
  compile({ width: W, height: H, data: busy, x: 'when', y: 'n', children: [bars, <Scale channel="x" type="band" domain={domain} />] });
  const { x } = bars.seen[0].ctx;
  const steps = d3.pairs(domain, (a, b) => x(b) - x(a));
  steps.forEach(s => near(s, steps[0], 0.001));
  near(x(day(8)) - x(day(1)), 7 * steps[0], 0.001);
});

test('g29 a zero-value Bar draws nothing', () => {
  const { scene } = compile({ width: W, height: H, data: [{ k: 'a', v: 0 }, { k: 'b', v: 5 }], x: 'k', y: 'v', children: [<Bar />] });
  expect(scene.marks).toHaveLength(1);
});

test('g29 a zero-height Rect is still drawn as a line (a median rule)', () => {
  const { scene } = compile({ width: W, height: H, data: [{ k: 'a', m: 3 }, { k: 'b', m: 5 }], x: 'k', children: [<Rect y1="m" y2="m" stroke="#000" />] });
  expect(scene.marks.map(s => s.t)).toEqual(['line', 'line']);
});

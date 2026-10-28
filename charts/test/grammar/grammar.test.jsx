// A grammar-of-graphics stress test: the scenarios of a minimal ggplot2 suite (layers and
// inheritance, stats, positions, scales, coordinates, facets, Minard's march), each rebuilt here
// on synthetic data (data.js). Every case checks numbers computed independently in the test,
// and keeps its drawing as an SVG file in __svg__/ (`pnpm test -u` to accept a change;
// `pnpm gallery` to look at them all).
//
// `test.fails` marks a known gap: it passes while the gap is there and fails once it is
// closed, so the scorecard (SPEC.md section 7) cannot go stale. `test.skip` marks a non-goal.
import { test, expect, beforeEach } from 'vitest';
import * as d3 from 'd3';
import { drawFigure, figureKeys, resetFigures } from '../../../test/tauler.js';
import { Plot } from '../../Plot.jsx';
import * as core from '../../core.jsx';
import { Layer, Scale, Axis, defineMark, stack, dodge, jitter, colorScale, defaultTheme, polar } from '../../core.jsx';
import { Line, Area, Rect, Bar, Dot, Link, Text, Arc } from '../../marks.jsx';
import { bin, group, boxStats } from '../../stats.jsx';
import { cars, monthly, eruptions, growth, march, cities } from './data.js';

beforeEach(resetFigures);

const W = 320, H = 200;

// A mark that also records what it was given: `tap(<Bar/>).seen[0].rows`.
function tap(mark) {
  const seen = [];
  return { ...mark, seen, render: (rows, ctx) => { seen.push({ rows, ctx }); return mark.render(rows, ctx); } };
}

// Draws every figure rendered in this test and compares each with its SVG file.
async function snapshot(name) {
  const keys = figureKeys();
  for (const [i, key] of keys.entries()) {
    await expect(drawFigure(key)).toMatchFileSnapshot(`./__svg__/${name}${keys.length > 1 ? `-${i + 1}` : ''}.svg`);
  }
}

// Shapes of one kind in a figure's SVG.
const count = (svg, tag) => (svg.match(new RegExp(`<${tag}[ >]`, 'g')) ?? []).length;
const marksOf = (key = figureKeys()[0]) => {
  const svg = drawFigure(key);
  return svg.slice(svg.indexOf('clip-path="url('));   // past the clip's own <rect>
};

const near = (a, b, eps = 0.01) => expect(Math.abs(a - b)).toBeLessThan(eps);
const by = (rows, key) => d3.rollup(rows, v => v.length, d => d[key]);
// Type 7 quantile (R's and ggplot2's default), written out so it does not share code with d3.
function quantile(sorted, p) {
  const h = (sorted.length - 1) * p, lo = Math.floor(h);
  return sorted[lo] + (h - lo) * ((sorted[lo + 1] ?? sorted[lo]) - sorted[lo]);
}

/* ---------- layers and inheritance ---------- */

test('01 baseline scatter: one dot per row, all inside the plot', async () => {
  const dots = tap(<Dot />);
  <Plot width={W} height={H} data={cars} x="displ" y="hwy">{dots}<Axis channel="x" /><Axis channel="y" /></Plot>;
  const { rows, ctx } = dots.seen[0];
  expect(rows).toHaveLength(cars.length);
  for (const r of rows) {
    expect(ctx.x(r.x)).toBeGreaterThanOrEqual(ctx.area.left);
    expect(ctx.y(r.y)).toBeLessThanOrEqual(ctx.area.bottom);
  }
  await snapshot('01-scatter');
});

test('02 a colour set on one layer does not split another layer', async () => {
  const line = tap(<Line sort />);
  <Plot width={W} height={H} data={cars} x="displ" y="hwy"><Dot color="cls" />{line}</Plot>;
  expect(count(marksOf(), 'path')).toBe(1);
  expect(line.seen[0].rows.every(r => r.color === undefined)).toBe(true);
  await snapshot('02-layer-colour');
});

test('03 a colour set on the Plot is inherited, and splits every layer by it', async () => {
  <Plot width={W} height={H} data={cars} x="displ" y="hwy" color="drv"><Dot /><Line /></Plot>;
  expect(count(marksOf(), 'path')).toBe(new Set(cars.map(d => d.drv)).size);
  await snapshot('03-inherited-colour');
});

test('04 a layer with its own data trains the shared scales', async () => {
  const highlight = tap(<Dot data={cars.filter(d => d.hwy > 30)} fill="red" r={4} />);
  <Plot width={W} height={H} data={cars} x="displ" y="hwy"><Dot />{highlight}</Plot>;
  expect(highlight.seen[0].rows).toHaveLength(cars.filter(d => d.hwy > 30).length);
  expect(count(marksOf(), 'circle[^>]*fill="red"')).toBe(cars.filter(d => d.hwy > 30).length);
  await snapshot('04-layer-data');
});

test('05 `group` splits lines without colouring them', async () => {
  <Plot width={W} height={H} data={growth} x="age" y="height"><Line group="subject" /></Plot>;
  const svg = marksOf();
  expect(count(svg, 'path')).toBe(5);
  expect(new Set(svg.match(/stroke="[^"]+"/g)).size).toBe(1);
  await snapshot('05-group');
});

/* ---------- statistics: data is transformed before it is drawn ---------- */

test('06 counts per category (stat_count)', async () => {
  const counts = group(cars, 'cls');
  const bars = tap(<Bar x="key" y="value" />);
  <Plot width={W} height={H} data={counts}>{bars}<Axis channel="x" /></Plot>;
  const expected = new Map();
  for (const d of cars) expected.set(d.cls, (expected.get(d.cls) ?? 0) + 1);
  expect(Object.fromEntries(counts.map(c => [c.key, c.value]))).toEqual(Object.fromEntries(expected));
  const { rows, ctx } = bars.seen[0];
  for (const r of rows) near(ctx.y(0) - ctx.y(r.y), (ctx.y(0) - ctx.y(1)) * expected.get(r.x));
  await snapshot('06-count');
});

test('07 a histogram with a bin width (stat_bin)', async () => {
  const width = 5, start = Math.floor(d3.min(cars, d => d.hwy) / width) * width;
  const edges = d3.range(start, d3.max(cars, d => d.hwy) + width, width);
  const bins = bin(cars, { value: 'hwy', thresholds: edges });
  const expected = new Map();
  for (const d of cars) { const k = start + Math.floor((d.hwy - start) / width) * width; expected.set(k, (expected.get(k) ?? 0) + 1); }
  expect(bins.filter(b => b.count).map(b => [b.x0, b.count])).toEqual([...expected].sort((a, b) => a[0] - b[0]));
  for (const b of bins) near(b.x1 - b.x0, width);
  <Plot width={W} height={H} data={bins}><Bar x1="x0" x2="x1" y="count" /><Axis channel="x" /></Plot>;
  await snapshot('07-bin');
});

test('08 a density polygon per group (after_stat(density))', async () => {
  const edges = d3.range(10, 45, 5), w = 5;
  const curves = d3.groups(cars, d => d.drv).flatMap(([drv, rows]) => bin(rows, { value: 'hwy', thresholds: edges })
    .map(b => ({ drv, x: (b.x0 + b.x1) / 2, density: b.count / (rows.length * (b.x1 - b.x0)) })));
  for (const [, rows] of d3.groups(curves, d => d.drv)) near(d3.sum(rows, r => r.density * w), 1);
  <Plot width={W} height={H} data={curves} x="x" y="density" color="drv"><Line /></Plot>;
  expect(count(marksOf(), 'path')).toBe(3);
  await snapshot('08-freqpoly');
});

test('09 a summary drawn as a range (stat_summary, mean ± se)', async () => {
  const summary = group(cars, 'cls', rows => {
    const v = rows.map(d => d.hwy), m = d3.mean(v), se = d3.deviation(v) / Math.sqrt(v.length);
    return { mean: m, lo: m - se, hi: m + se };
  }).map(({ key, value }) => ({ cls: key, ...value }));
  const compact = cars.filter(d => d.cls === 'compact').map(d => d.hwy);
  near(summary.find(s => s.cls === 'compact').mean, compact.reduce((a, b) => a + b, 0) / compact.length);
  const dots = tap(<Dot y="mean" />);
  <Plot width={W} height={H} data={summary} x="cls"><Link y1="lo" y2="hi" />{dots}<Axis channel="x" /></Plot>;
  expect(count(marksOf(), 'line')).toBe(summary.length);
  await snapshot('09-summary');
});

// A 2D density as filled contours: a third-party mark on the defineMark seam, no core change.
const ContourDensity = defineMark('contour-density', {
  render(rows, ctx) {
    const contours = d3.contourDensity().x(r => ctx.x(r.x)).y(r => ctx.y(r.y))
      .size([ctx.area.right + 4, ctx.area.bottom + 4]).bandwidth(ctx.props.bandwidth ?? 12).thresholds(6)(rows);
    const colour = d3.scaleSequential(d3.extent(contours, c => c.value), d3.interpolateRgb(ctx.theme.line, ctx.theme.palette[0]));
    return contours.map(c => ({ t: 'path', d: d3.geoPath()(c), fill: colour(c.value), fillOpacity: 0.8 }));
  },
});

test('10 filled 2D density contours, as a custom mark (geom_density_2d_filled)', async () => {
  const contours = tap(<ContourDensity />);
  <Plot width={W} height={H} data={eruptions} x="eruptions" y="waiting">{contours}<Dot r={1.5} /></Plot>;
  expect(count(marksOf(), 'path')).toBeGreaterThanOrEqual(4);
  await snapshot('10-density-2d');
});

test('11 box plots: five statistics per group (geom_boxplot)', async () => {
  const boxes = boxStats(cars, { by: 'cls', value: 'hwy' });
  for (const box of boxes) {
    const v = cars.filter(d => d.cls === box.key).map(d => d.hwy).sort((a, b) => a - b);
    near(box.q1, quantile(v, 0.25)); near(box.med, quantile(v, 0.5)); near(box.q3, quantile(v, 0.75));
    const reach = 1.5 * (box.q3 - box.q1);
    expect(box.outliers.map(d => d.hwy).sort((a, b) => a - b)).toEqual(v.filter(x => x < box.q1 - reach || x > box.q3 + reach));
  }
  <Plot width={W} height={H} data={boxes} x="key">
    <Link y1="lo" y2="hi" /><Rect y1="q1" y2="q3" inset={4} /><Rect y1="med" y2="med" stroke="#000" fill="none" inset={4} />
    <Axis channel="x" />
  </Plot>;
  await snapshot('11-boxplot');
});

/* ---------- positions: run after the statistics ---------- */

const classDrive = d3.rollups(cars, v => v.length, d => d.cls, d => d.drv)
  .flatMap(([cls, drives]) => drives.map(([drv, n]) => ({ cls, drv, n })));

test('12 stacked counts: each pile is its class total', async () => {
  const bars = tap(<Bar position={stack()} />);
  <Plot width={W} height={H} data={classDrive} x="cls" y="n" color="drv">{bars}<Axis channel="x" /></Plot>;
  const tops = d3.rollup(bars.seen[0].rows, rows => d3.max(rows, r => r.y2), r => r.x);
  expect(Object.fromEntries(tops)).toEqual(Object.fromEntries(by(cars, 'cls')));
  await snapshot('12-stack');
});

test('13 dodge: a band with fewer series gives them wider bars', () => {
  const bars = tap(<Bar position={dodge()} />);
  <Plot width={W} height={H} data={classDrive} x="cls" y="n" color="drv">{bars}</Plot>;
  const widths = d3.rollup(bars.seen[0].rows, rows => rows[0].u2 - rows[0].u1, r => r.x);
  expect(widths.get('pickup')).toBeGreaterThan(widths.get('compact'));   // 1 series vs 2
});

test('13 dodge: series side by side, never overlapping', async () => {
  <Plot width={W} height={H} data={classDrive} x="cls" y="n" color="drv"><Bar position={dodge()} /><Axis channel="x" /></Plot>;
  const rects = [...marksOf().matchAll(/<rect ([^>]*)>/g)].map(([, a]) => ({
    x: +a.match(/ x="([\d.]+)"/)[1], width: +a.match(/width="([\d.]+)"/)[1] })).sort((a, b) => a.x - b.x);
  for (let i = 1; i < rects.length; i++) expect(rects[i].x).toBeGreaterThanOrEqual(rects[i - 1].x + rects[i - 1].width - 0.01);
  await snapshot('13-dodge');
});

test('14 stacking normalised to 1 (position = "fill")', async () => {
  const bars = tap(<Bar position={stack({ offset: 'expand' })} />);
  <Plot width={W} height={H} data={classDrive} x="cls" y="n" color="drv">{bars}<Axis channel="y" /></Plot>;
  for (const rows of d3.group(bars.seen[0].rows, r => r.x).values()) near(d3.max(rows, r => r.y2), 1);
  near(bars.seen[0].ctx.y(1), bars.seen[0].ctx.area.top);
  await snapshot('14-fill');
});

test('15 jitter: deterministic, per key, inside the band; rows with no key stay; a non-band axis throws', () => {
  const offsets = (data, scales = [<Scale channel="x" type="band" />]) => {
    const dots = tap(<Dot key="id" position={jitter()} />);
    <Plot width={W} height={H} data={data} x="cls" y="n">{dots}{scales}</Plot>;
    return dots.seen[0].rows.map(r => (r.u1 == null ? 0 : (r.u1 + r.u2) / 2 - 0.5));
  };
  const data = ['a', 'b', 'c', 'd'].map(id => ({ id, cls: 'suv', n: 1 }));
  const once = offsets(data);
  expect(offsets(data)).toEqual(once);
  expect(new Set(once).size).toBe(4);
  once.forEach(o => expect(Math.abs(o)).toBeLessThanOrEqual(0.5));
  expect(offsets(data.slice(1))).toEqual(once.slice(1));
  expect(offsets(data.map(({ cls, n }) => ({ cls, n })))).toEqual([0, 0, 0, 0]);
  expect(() => offsets(data, [])).toThrow(/jitterPx/);
  expect(() => offsets(data, [<Scale channel="x" type="linear" />])).toThrow(/jitterPx/);
});

test('stat before position: stacked per-group histograms pile up to the overall histogram', () => {
  const edges = d3.range(10, 45, 5);
  const perGroup = d3.groups(cars, d => d.drv).flatMap(([drv, rows]) => bin(rows, { value: 'hwy', thresholds: edges }).map(b => ({ ...b, drv })));
  const bars = tap(<Bar x1="x0" x2="x1" y="count" color="drv" position={stack()} />);   // piles by x1: bars with no x
  <Plot width={W} height={H} data={perGroup}>{bars}</Plot>;
  const overall = bin(cars, { value: 'hwy', thresholds: edges });
  const tops = d3.rollup(bars.seen[0].rows, rows => d3.max(rows, r => r.y2), r => r.x1);
  for (const b of overall) expect(tops.get(b.x0) ?? 0).toBe(b.count);   // channel x1 holds the bin's x0
});

/* ---------- scales ---------- */

test('16 log scales on both axes', async () => {
  const dots = tap(<Dot />);
  <Plot width={W} height={H} data={cars} x="displ" y="hwy">
    <Scale channel="x" type="log" /><Scale channel="y" type="log" />{dots}<Axis channel="x" /><Axis channel="y" />
  </Plot>;
  const { x, y } = dots.seen[0].ctx;
  near(x(4) - x(2), x(2) - x(1));
  near(y(10) - y(20), y(20) - y(40));
  await snapshot('16-log');
});

test('17 continuous colour and a size from a style function', async () => {
  const dots = tap(<Dot r={d => Math.sqrt(d.cyl) * 1.5} />);
  <Plot width={W} height={H} data={cars} x="displ" y="hwy" color="cty">{dots}</Plot>;
  const { ctx } = dots.seen[0];
  const [lo, hi] = d3.extent(cars, d => d.cty);
  expect(d3.rgb(ctx.color(hi)).formatHex()).toBe(d3.rgb(defaultTheme.palette[0]).formatHex());
  expect(d3.rgb(ctx.color(lo)).formatHex()).toBe(d3.rgb(d3.interpolateRgb(defaultTheme.line, defaultTheme.palette[0])(0.15)).formatHex());
  const radii = [...marksOf().matchAll(/ r="([\d.]+)"/g)].map(m => +m[1]);
  expect(new Set(radii).size).toBe(3);   // one per cylinder count
  await snapshot('17-continuous');
});

test.skip('18 NON-GOAL merged legends: legends are tauler JSX beside the figure, not in the Picture', () => {});

test('18 a legend drawn beside the figure gets the Plot\'s own colours', () => {
  const dots = tap(<Dot />);
  <Plot width={W} height={H} data={cars} x="displ" y="hwy" color="drv">{dots}</Plot>;
  const legend = colorScale([...new Set(cars.map(d => d.drv))], defaultTheme);
  for (const drv of legend.domain()) expect(legend(drv)).toBe(dots.seen[0].ctx.color(drv));
});

test('19 a date scale with a break every 10 years', async () => {
  const ticks = d3.timeYear.every(10).range(new Date(Date.UTC(1970, 0, 1)), new Date(Date.UTC(2011, 0, 1)));
  <Plot width={W} height={H} data={monthly} x="date" y="unemploy">
    <Area fillOpacity={0.4} /><Axis channel="x" ticks={ticks} format="%Y" />
  </Plot>;
  const labels = [...drawFigure(figureKeys()[0]).matchAll(/>(\d{4})<\/text>/g)].map(m => m[1]);
  expect(labels).toEqual(['1970', '1980', '1990', '2000', '2010']);
  await snapshot('19-dates');
});

test('19 ticks can also be a d3 time interval', () => {
  <Plot width={W} height={H} data={monthly} x="date" y="unemploy"><Line /><Axis channel="x" ticks={d3.timeYear.every(10)} format="%Y" /></Plot>;
  expect(drawFigure(figureKeys()[0])).toContain('>1980</text>');
});

test('limits zoom: a Scale domain keeps every row and clips, it does not filter', () => {
  const dots = tap(<Dot />);
  <Plot width={W} height={H} data={cars} x="displ" y="hwy"><Scale channel="x" domain={[2, 5]} />{dots}</Plot>;
  expect(dots.seen[0].rows).toHaveLength(cars.length);
  expect(dots.seen[0].ctx.x(2)).toBe(dots.seen[0].ctx.area.left);
});

test('scale vs coord: statistics run before scales, so a log scale bends a fitted line (coord_trans)', () => {
  const fit = [1, 2, 3].map(x => ({ x, y: 10 * x }));   // straight in data space
  const line = tap(<Line />);
  <Plot width={W} height={H} data={fit} x="x" y="y"><Scale channel="y" type="log" />{line}</Plot>;
  const { y } = line.seen[0].ctx;
  expect(Math.abs((y(20) - y(10)) - (y(30) - y(20)))).toBeGreaterThan(1);
});

/* ---------- coordinates ---------- */

test('20 a pie of counts (coord_polar on a stacked bar)', async () => {
  const counts = group(cars, 'cyl');
  <Plot width={160} height={160} data={counts}><Arc value="value" color="key" /></Plot>;
  expect(count(marksOf(), 'path')).toBe(3);
  await snapshot('20-pie');
});

test('21 a coxcomb: bars of counts under coord={polar()} are one wedge per class', async () => {
  const counts = group(cars, 'cls');
  <Plot width={200} height={200} data={counts} x="key" y="value" coord={polar()}><Bar /></Plot>;
  const svg = marksOf();
  expect(count(svg, 'path')).toBe(counts.length);
  expect(count(svg, 'rect')).toBe(0);
  await snapshot('21-coxcomb');
});

test('22 flipped box plots: swap the channels, no coord needed', async () => {
  const boxes = boxStats(cars, { by: 'cls', value: 'hwy' });
  <Plot width={W} height={H} data={boxes} y="key">
    <Link x1="lo" x2="hi" /><Rect x1="q1" x2="q3" inset={3} /><Rect x1="med" x2="med" stroke="#000" inset={3} />
    <Axis channel="y" /><Axis channel="x" />
  </Plot>;
  expect(count(marksOf(), 'rect')).toBe(boxes.length);
  await snapshot('22-flip');
});

/* ---------- facets: plain JS, one Plot per panel ---------- */

test('23 facets with free y scales: each panel trains its own', async () => {
  const panels = d3.groups(cars, d => d.drv).map(([drv, rows]) => {
    const dots = tap(<Dot />);
    <Plot width={120} height={100} data={rows} x="displ" y="hwy">{dots}<Line /></Plot>;
    return { drv, dots, max: d3.max(rows, d => d.hwy) };
  });
  const [a, b] = panels;
  expect(a.max).not.toBe(b.max);
  expect(a.dots.seen[0].ctx.y(a.max)).not.toBeCloseTo(b.dots.seen[0].ctx.y(a.max));
  await snapshot('23-facet-free');
});

test('24 a facet grid with empty panels and margins', () => {
  const drvs = [...new Set(cars.map(d => d.drv)), '(all)'], cyls = [4, 6, 8, '(all)'];
  const panels = d3.cross(drvs, cyls, (drv, cyl) => {
    const rows = cars.filter(d => (drv === '(all)' || d.drv === drv) && (cyl === '(all)' || d.cyl === cyl));
    const dots = tap(<Dot />);
    <Plot width={70} height={60} data={rows} x="displ" y="hwy" margin={{ left: 4, right: 4 }}>
      <Scale channel="x" domain={d3.extent(cars, d => d.displ)} /><Scale channel="y" domain={d3.extent(cars, d => d.hwy)} />{dots}
    </Plot>;
    return { rows, dots };
  });
  expect(panels).toHaveLength(16);
  expect(panels.some(p => p.rows.length === 0)).toBe(true);   // an empty panel still compiles
  expect(panels.at(-1).dots.seen[0].rows).toHaveLength(cars.length);
});

test('25 annotation data split by panel', async () => {
  for (const [, rows] of d3.groups(cars, d => d.drv)) {
    const mean = d3.mean(rows, d => d.hwy);
    const rule = tap(<Link x1={-Infinity} x2={Infinity} y1={mean} y2={mean} stroke="red" />);
    <Plot width={120} height={100} data={rows} x="displ" y="hwy"><Dot />{rule}</Plot>;
    const { ctx } = rule.seen[0];
    expect(ctx.y(mean)).toBeGreaterThan(ctx.area.top);
  }
  await snapshot('25-facet-annotation');
});

/* ---------- the capstone ---------- */

test('26 Minard\'s march: varying width and colour, a text layer with its own data, shared scales', async () => {
  const segments = d3.pairs(march).map(([a, b]) => ({ ...a, lon2: b.lon, lat2: b.lat }));
  const widest = d3.max(march, d => d.survivors);
  const path = tap(<Link x1="lon" y1="lat" x2="lon2" y2="lat2" color="direction" strokeWidth={d => 1 + 14 * d.survivors / widest} />);
  // No domain expansion (ggplot's 5%), so labels at the data's edges need a margin: a gap.
  <Plot width={W} height={140} data={segments} margin={{ top: 22, left: 26, right: 26 }}>
    {path}
    <Layer data={cities} x="lon" y="lat"><Dot r={2} fill="#000" /><Text text={d => d.city} dy={-6} /></Layer>
    <Scale channel="color" range={['#d9b38c', '#222222']} />
  </Plot>;
  const svg = drawFigure(figureKeys()[0]);
  const widths = [...svg.matchAll(/<line [^>]*stroke-width="([\d.]+)"/g)].map(m => +m[1]);
  expect(widths).toHaveLength(segments.length);
  expect(widths).toEqual([...widths].sort((a, b) => b - a));   // the army only shrinks
  expect(count(svg, 'text')).toBe(cities.length);
  await snapshot('26-minard');
});

// GAPS A.4: behaviour that works today, locked in before the refactor (step B). One test each,
// invented data, no clock and no randomness. Where a test needs a mark or a fitting that the
// library does not ship, the recipe is written here and stays plain JS.
import { test, expect } from 'vitest';
import * as d3 from 'd3';
import '../../test/tauler.js';   // defines the JSX factory `h`
import { compile, defineMark, stack, Scale, Axis, Layer } from '../core.jsx';
import { Area, Line, Link, Dot, Bar, Rect, Text } from '../marks.jsx';
import { Geo, GeoDot } from '../geo.jsx';
import { bin } from '../stats.jsx';

const W = 320, H = 200;
function tap(mark) {
  const seen = [];
  return { ...mark, seen, render: (rows, ctx) => { seen.push({ rows, ctx }); return mark.render(rows, ctx); } };
}
const near = (a, b, eps = 0.01) => expect(Math.abs(a - b)).toBeLessThan(eps);

// (1) A stream graph is a recipe: d3.stack with a centring offset writes y1 y2 for Area.
test('1 stack offsets centre the piles around a baseline that moves', () => {
  const kinds = ['a', 'b', 'c'], xs = d3.range(8);
  const wide = xs.map(x => ({ x, a: 2 + Math.sin(x), b: 3 + Math.cos(x / 2), c: 1 + (x % 3) }));
  const layers = d3.stack().keys(kinds).offset(d3.stackOffsetWiggle)(wide);
  const rows = layers.flatMap(layer => layer.map((p, i) => ({ x: xs[i], kind: layer.key, y1: p[0], y2: p[1] })));
  const areas = tap(<Area y1="y1" y2="y2" color="kind" />);
  compile({ width: W, height: H, data: rows, x: 'x', children: [areas] });
  const { rows: seen, ctx } = areas.seen[0];
  const baseline = xs.map(x => seen.find(r => r.x === x && r.color === 'a').y1);
  expect(new Set(baseline.map(v => v.toFixed(6))).size).toBeGreaterThan(1);   // the baseline moves
  for (const x of xs) {   // contiguous layers: each starts where the previous ended
    const [a, b, c] = kinds.map(k => seen.find(r => r.x === x && r.color === k));
    near(a.y2, b.y1, 1e-9); near(b.y2, c.y1, 1e-9);
  }
  expect(Math.min(...baseline)).toBeLessThan(0);                       // the y domain follows the intervals
  expect(ctx.y(Math.min(...baseline))).toBeLessThanOrEqual(ctx.area.bottom);
});

// (2) Contours are a custom mark over d3.contours: lines (stroke only) or filled bands.
test('2 contour lines and filled contours from a grid, as a custom mark', () => {
  const [n, m] = [24, 16];
  const grid = d3.range(n * m).map(i => Math.exp(-(((i % n) - 12) ** 2 + (Math.floor(i / n) - 8) ** 2) / 30));
  const levels = [0.2, 0.5, 0.8];
  const contours = d3.contours().size([n, m]).thresholds(levels)(grid);
  const Contour = defineMark('contour', {
    render: (rows, ctx) => rows.map(r => {
      const { area } = ctx, path = d3.geoPath(d3.geoTransform({ point(x, y) { this.stream.point(area.left + x / n * area.width, area.top + y / m * area.height); } }));
      return { t: 'path', d: path(r.d), fill: ctx.props.filled ? ctx.theme.palette[0] : 'none', fillOpacity: ctx.props.filled ? 0.2 : undefined, stroke: ctx.theme.palette[0] };
    }),
  });
  const draw = filled => compile({ width: W, height: H, data: contours, children: [Contour({ filled })] }).scene.marks;
  const lines = draw(false), bands = draw(true);
  expect(lines).toHaveLength(levels.length);
  expect(bands).toHaveLength(levels.length);
  expect(lines.every(s => s.fill === 'none' && s.d.length > 20)).toBe(true);
  expect(bands.every(s => s.fill !== 'none' && s.d.endsWith('Z'))).toBe(true);
  expect(contours.map(c => c.value)).toEqual(levels);
});

// (3) A trend with a band: fit in the layout, draw Area + Line. Decided: no helper is shipped;
// the fit is six lines of plain JS and a statistic would have to pick one model.
test('3 a trend with an uncertainty band, by plain-JS least squares', () => {
  const pts = d3.range(20).map(i => ({ x: i, y: 3 + 0.5 * i + 2 * Math.sin(i * 2.1) }));
  const mx = d3.mean(pts, p => p.x), my = d3.mean(pts, p => p.y);
  const slope = d3.sum(pts, p => (p.x - mx) * (p.y - my)) / d3.sum(pts, p => (p.x - mx) ** 2);
  const sigma = Math.sqrt(d3.sum(pts, p => (p.y - my - slope * (p.x - mx)) ** 2) / (pts.length - 2));
  const fit = pts.map(p => {
    const mid = my + slope * (p.x - mx), half = 2 * sigma * Math.sqrt(1 / pts.length + (p.x - mx) ** 2 / d3.sum(pts, q => (q.x - mx) ** 2));
    return { x: p.x, mid, lo: mid - half, hi: mid + half };
  });
  const band = tap(<Area y1="lo" y2="hi" fillOpacity={0.2} />), line = tap(<Line y="mid" />);
  const { scene } = compile({ width: W, height: H, data: fit, x: 'x', children: [band, line, <Layer data={pts} x="x" y="y"><Dot r={2} /></Layer>] });
  const { ctx } = band.seen[0];
  expect(scene.marks.filter(s => s.t === 'path')).toHaveLength(2);
  for (const r of fit) expect(ctx.y(r.hi)).toBeLessThan(ctx.y(r.lo));          // the band surrounds the line
  const width = r => ctx.y(r.lo) - ctx.y(r.hi);
  expect(width(fit[0])).toBeGreaterThan(width(fit[10]));                       // widest at the ends
  expect(width(fit.at(-1))).toBeGreaterThan(width(fit[10]));
  expect(ctx.y(d3.min(pts, p => p.y))).toBeGreaterThanOrEqual(ctx.area.top);   // the dots' Layer shares the scale
});

// (4) A composite projection by name, fitted to the data.
test('4 a composite projection by name, fitted to data', () => {
  const places = [{ name: 'a', lon: -122.4, lat: 37.8 }, { name: 'b', lon: -74, lat: 40.7 }, { name: 'c', lon: -149.9, lat: 61.2 }, { name: 'd', lon: -157.8, lat: 21.3 }];
  const fit = { type: 'MultiPoint', coordinates: places.map(p => [p.lon, p.lat]) };
  const dots = compile({ width: W, height: H, projection: 'albers-usa', fit, data: places, children: [<GeoDot lon="lon" lat="lat" r={2} />] }).scene.marks;
  expect(dots).toHaveLength(places.length);   // Alaska and Hawaii are placed by the composite, not dropped
  const xs = dots.map(s => Number(s.d.match(/M(-?[\d.]+)/)[1]));
  expect(Math.min(...xs)).toBeGreaterThanOrEqual(8 - 2); expect(Math.max(...xs)).toBeLessThanOrEqual(W - 8 + 2);
  expect(() => compile({ width: W, height: H, projection: 'no-such-projection', children: [] })).toThrow(/no-such-projection/);
});

// (5) A route between distant places follows the projected great circle.
test('5 a line between distant places bows along the shortest path', () => {
  const route = { type: 'LineString', coordinates: [[-120, 40], [10, 50]] };
  const { scene } = compile({ width: W, height: H, projection: 'mercator', children: [<Geo data={[route]} fill="none" stroke="#000" />] });
  const d = scene.marks[0].d, n = d.match(/-?\d+(?:\.\d+)?/g).map(Number), pts = d3.range(0, n.length, 2).map(i => [n[i], n[i + 1]]);
  expect(pts.length).toBeGreaterThan(3);                                    // densified, not a two-point chord
  const [first, last] = [pts[0], pts.at(-1)];
  const t = (pts[Math.floor(pts.length / 2)][0] - first[0]) / (last[0] - first[0]);
  const chordY = first[1] + t * (last[1] - first[1]);
  expect(pts[Math.floor(pts.length / 2)][1]).toBeLessThan(chordY - 1);       // north (smaller y) of the straight chord
});

// (6) Small multiples are plain JS (SPEC 5.8): a faint backdrop of the other panels, a ragged
// last row, axes on the outer edges only, domains shared.
test('6 small multiples: backdrop, ragged last row, edge-only axes, shared domains', () => {
  const series = d3.range(7).map(k => ({ k, rows: d3.range(6).map(t => ({ t, v: 10 * k + 5 * Math.sin(t + k) })) }));
  const all = series.flatMap(s => s.rows), cols = 3, rowsN = Math.ceil(series.length / cols);
  const shared = { x: d3.extent(all, d => d.t), y: d3.extent(all, d => d.v) };
  const panels = series.map(({ k, rows }) => {
    const col = k % cols, row = Math.floor(k / cols);
    const own = tap(<Line />), under = tap(<Line stroke="#ddd" />);
    const bottomEdge = k + cols >= series.length;   // the ragged last row ends its columns early
    const { scene } = compile({ width: 100, height: 80, x: 't', y: 'v', margin: { left: col === 0 ? 24 : 4, right: 4, bottom: bottomEdge ? 18 : 4, top: 4 },
      children: [<Layer data={all.filter(d => !rows.includes(d))}>{under}</Layer>, <Layer data={rows}>{own}</Layer>,
        <Scale channel="x" domain={shared.x} />, <Scale channel="y" domain={shared.y} />,
        col === 0 && <Axis channel="y" />, bottomEdge && <Axis channel="x" />].filter(Boolean) });
    return { k, col, row, bottomEdge, scene, ctx: own.seen[0].ctx, under: under.seen[0] };
  });
  expect(rowsN).toBe(3);
  expect(panels.filter(p => p.row === 2)).toHaveLength(1);                       // ragged: one panel in the last row
  expect(panels.filter(p => p.bottomEdge).map(p => p.k)).toEqual([4, 5, 6]);     // bottom axes under the last panel of each column
  for (const p of panels) {
    expect(p.scene.back.some(s => s.t === 'text')).toBe(p.col === 0 || p.bottomEdge);
    expect(p.under.rows).toHaveLength(all.length - 6);                           // the other panels' rows, as a backdrop
  }
  const first = panels[0].ctx;   // panels with the same margins map alike
  for (const p of panels.filter(q => q.col === 0 && !q.bottomEdge)) { near(p.ctx.x(3), first.x(3), 1e-9); near(p.ctx.y(20), first.y(20), 1e-9); }
});

// (7) A line coloured by segment: consecutive pairs as Links, stroke from the rows.
test('7 segmented line colour: one Link per consecutive pair, coloured by its direction', () => {
  const walk = [3, 5, 4, 6, 9, 7, 8].map((v, t) => ({ t, v }));
  const steps = d3.pairs(walk).map(([a, b]) => ({ t1: a.t, v1: a.v, t2: b.t, v2: b.v, dir: b.v >= a.v ? 'up' : 'down' }));
  const { scene } = compile({ width: W, height: H, data: steps, children: [<Link x1="t1" y1="v1" x2="t2" y2="v2" color="dir" />] });
  const lines = scene.marks.filter(s => s.t === 'line');
  expect(lines).toHaveLength(walk.length - 1);
  expect(new Set(lines.map(s => s.stroke)).size).toBe(2);
  steps.forEach((s, i) => expect(lines[i].stroke === lines[steps.findIndex(q => q.dir === s.dir)].stroke).toBe(true));
  const byFn = compile({ width: W, height: H, data: steps, children: [<Link x1="t1" y1="v1" x2="t2" y2="v2" stroke={d => (d.dir === 'up' ? '#0a0' : '#a00')} />] });
  expect(byFn.scene.marks.map(s => s.stroke)).toEqual(steps.map(s => (s.dir === 'up' ? '#0a0' : '#a00')));
});

// (8) Bin per group on the edges that automatic thresholds give the whole data; stacked, the
// piles are the overall histogram.
test('8 bin-then-stack with automatic thresholds', () => {
  const samples = d3.range(60).map(i => ({ ms: (i * 37) % 53, kind: ['a', 'b', 'c'][i % 3] }));
  const overall = bin(samples, { value: 'ms', thresholds: 6 });
  const edges = [...overall.map(b => b.x0), overall.at(-1).x1];
  const perKind = d3.groups(samples, d => d.kind).flatMap(([kind, rows]) => bin(rows, { value: 'ms', thresholds: edges }).map(b => ({ ...b, kind })));
  const bars = tap(<Bar x1="x0" x2="x1" y="count" color="kind" position={stack()} />);
  compile({ width: W, height: H, data: perKind, children: [bars] });
  const tops = d3.rollup(bars.seen[0].rows, rows => d3.max(rows, r => r.y2), r => r.x1);
  for (const b of overall) expect(tops.get(b.x0)).toBe(b.count);
  expect(d3.sum(overall, b => b.count)).toBe(samples.length);
});

// (9) A finite constant mark trains the scale; an infinite one is the plot's edge.
test('9 a finite constant mark extends a scale and an infinite one does not', () => {
  const data = [{ x: 1, y: 10 }, { x: 2, y: 20 }];
  const domainOf = rule => {
    const dots = tap(<Dot />);
    compile({ width: W, height: H, data, x: 'x', y: 'y', children: [dots, rule, <Scale channel="y" nice={false} />] });
    return dots.seen[0].ctx;
  };
  const finite = domainOf(<Link x1={-Infinity} x2={Infinity} y1={90} y2={90} />);
  const edge = domainOf(<Link x1={-Infinity} x2={Infinity} y1={Infinity} y2={Infinity} />);
  const plain = domainOf(<Link x1={-Infinity} x2={Infinity} y1={15} y2={15} />);
  expect(finite.y(90)).toBeGreaterThanOrEqual(finite.area.top - 1e-9);     // 90 is inside the plot
  expect(finite.y(20)).toBeGreaterThan(plain.y(20));                        // and squeezes the data down
  near(edge.y(20), plain.y(20), 1e-9);                                      // Infinity left the scale alone
});

// (10) Bins are data-space: the plot's width moves pixels, not the bins.
test('10 data-space bins are unchanged by plot width', () => {
  const samples = d3.range(50).map(i => ({ ms: (i * 29) % 47 }));
  const bins = bin(samples, { value: 'ms', thresholds: 5 });
  const at = width => {
    const bars = tap(<Rect x1="x0" x2="x1" y="count" baseline={0} />);
    compile({ width, height: H, data: bin(samples, { value: 'ms', thresholds: 5 }), children: [bars, <Scale channel="x" domain={[0, 50]} />] });
    return bars.seen[0];
  };
  const [narrow, wide] = [at(200), at(500)];
  expect(narrow.rows.map(r => [r.x1, r.x2])).toEqual(bins.map(b => [b.x0, b.x1]));
  expect(wide.rows.map(r => [r.x1, r.x2])).toEqual(narrow.rows.map(r => [r.x1, r.x2]));
  expect(wide.rows.map(r => r.y)).toEqual(narrow.rows.map(r => r.y));
  const share = (c, v) => (c.x(v) - c.area.left) / c.area.width;
  for (const b of bins) near(share(narrow.ctx, b.x0), share(wide.ctx, b.x0), 1e-9);
});

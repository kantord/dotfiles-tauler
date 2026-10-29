// The usability findings (charts/GAPS.md, SPEC 5.1, 5.2, 5.6, 5.10): the contract of defineScale, a
// non-finite position is not drawn, Scale nice and the plot-room guard, the classed legend, colorTo,
// and the hexbin shape. Invented data.
import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import '../../test/tauler.js';
import { compile, defineScale, Scale, Axis, Legend } from '../core.jsx';
import { hexbin, treemap, tree, pack, partition, flow } from '../stats.jsx';
import { pathPoints } from './gaps/support.js';
import { Treemap, Tree, Pack, Partition } from '../hierarchy.jsx';
import { Link, Dot, Text, Vector, Image, Line, Area, Polygon, Arc, Rect, Bar } from '../marks.jsx';
import * as d3 from 'd3';
import { tap, W, H } from './gaps/support.js';

const source = name => readFileSync(fileURLToPath(new URL('../' + name, import.meta.url)), 'utf8');
const rows = [{ a: 1, b: 4 }, { a: 2, b: 9 }, { a: 3, b: 16 }];
const plot = (children, extra = {}) => compile({ width: W, height: H, data: rows, x: 'a', y: 'b', children, ...extra });

/* ---------- step 1: the contract ---------- */

test('defineScale names the member a scale lacks', () => {
  defineScale('no-ticks', { build: (domain, range) => Object.assign(v => range[0] + v, { domain: () => domain }) });
  defineScale('no-domain', { build: (_domain, range) => Object.assign(v => range[0] + v, { ticks: () => [1] }) });
  defineScale('no-function', { build: () => ({ domain: () => [0, 1], ticks: () => [1] }) });
  expect(() => plot([<Dot />, <Scale channel="y" type="no-ticks" />, <Axis channel="y" />])).toThrow('defineScale: ticks is required');
  expect(() => plot([<Dot />, <Scale channel="y" type="no-domain" />])).toThrow('defineScale: domain is required');
  expect(() => plot([<Dot />, <Scale channel="y" type="no-function" />])).toThrow('defineScale: build must return a function');
  // Without an axis, ticks are never read: such a scale still works.
  expect(() => plot([<Dot />, <Scale channel="y" type="no-ticks" />])).not.toThrow();
});

test('the tooltip recipe imports only public names', () => {
  const imported = source('recipes/tooltip.jsx').match(/import \{([^}]*)\} from '\.\.\/core\.jsx'/)[1].split(',').map(s => s.trim());
  const exported = source('index.jsx').match(/export \{([^}]*)\} from '\.\/core\.jsx'/)[1].split(',').map(s => s.trim());
  expect(imported.filter(n => !exported.includes(n))).toEqual([]);
});

/* ---------- step 2: a non-finite position is not drawn ---------- */

// Every number and string a scene would write into the SVG.
const values = shapes => shapes.flatMap(sh => [...Object.values(sh).filter(v => !Array.isArray(v)), ...values(sh.children ?? [])]);
const clean = scene => {
  const all = values([...scene.back, ...scene.marks, ...scene.front]);
  return all.every(v => typeof v !== 'number' || Number.isFinite(v)) && !all.some(v => typeof v === 'string' && v.includes('NaN'));
};
// Two bad rows: a NaN y in the middle, a NaN x at the end.
const gappy = [{ a: 1, b: 1 }, { a: 2, b: 2 }, { a: 3, b: NaN }, { a: 4, b: 4 }, { a: NaN, b: 5 }];
const drawn = (mark, data = gappy) => compile({ width: W, height: H, data, x: 'a', y: 'b', children: [mark] }).scene;
const finite = (shapes, keys) => shapes.every(sh => keys.every(k => Number.isFinite(sh[k])));

test('Dot skips a non-finite position (no circle at 0,0)', () => {
  const { marks } = drawn(<Dot />);
  expect(marks).toHaveLength(3);
  expect(finite(marks, ['cx', 'cy'])).toBe(true);
});

test('Text skips a non-finite position', () => {
  const scene = drawn(<Text text="t" />);
  expect(scene.front).toHaveLength(3);
  expect(finite(scene.front, ['x', 'y'])).toBe(true);
  expect(clean(scene)).toBe(true);
});

test('Text with only x, or only y, still sits on the plot edge', () => {
  const only = props => compile({ width: W, height: H, data: gappy.slice(0, 2), children: [<Text text="t" {...props} />] }).scene.front;
  expect(only({ x: 'a' }).map(s => s.y)).toEqual([8, 8]);
  expect(only({ y: 'b' }).map(s => s.x)).toEqual([8, 8]);
});

test('Vector skips a non-finite position and a non-finite angle', () => {
  const scene = drawn(<Vector angle={45} />);
  expect(scene.marks).toHaveLength(3);
  expect(clean(scene) && finite(scene.marks, ['x1', 'y1', 'x2', 'y2'])).toBe(true);
  expect(drawn(<Vector angle={d => (d.a === 2 ? NaN : 45)} />).marks).toHaveLength(2);
});

test('Image skips a non-finite position', () => {
  const scene = drawn(<Image href="data:," />);
  expect(scene.marks).toHaveLength(3);
  expect(finite(scene.marks, ['x', 'y'])).toBe(true);
});

const linear = [1, 2, NaN, 4, 5].map((b, i) => ({ a: i + 1, b }));
test('Line splits at a non-finite position: a gap, not a stray point', () => {
  const scene = drawn(<Line />, linear);
  expect(clean(scene)).toBe(true);
  expect(scene.marks[0].d.match(/M/g)).toHaveLength(2);
  expect(clean(drawn(<Line />))).toBe(true);
});

test('Area splits at a non-finite position', () => {
  const scene = drawn(<Area />, linear);
  expect(clean(scene)).toBe(true);
  expect(scene.marks[0].d.match(/M/g)).toHaveLength(2);
  expect(clean(drawn(<Area />))).toBe(true);
});

test('Polygon skips a row with a non-finite vertex', () => {
  const squares = [0, 1, 2].map(i => ({ points: [[i, 0], [i + 1, 0], [i + 1, i === 1 ? NaN : 1]] }));
  const scene = compile({ width: W, height: H, data: squares, children: [<Polygon points="points" />] }).scene;
  expect(scene.marks).toHaveLength(2);
  expect(clean(scene)).toBe(true);
});

test('Arc skips a non-finite value', () => {
  const scene = compile({ width: W, height: H, data: [{ v: 1 }, { v: NaN }, { v: 2 }], children: [<Arc value="v" />] }).scene;
  expect(scene.marks).toHaveLength(2);
  expect(clean(scene)).toBe(true);
});

test('Link skips an end the scale cannot place', () => {
  const links = [{ p: 'a', q: 'b' }, { p: 'a', q: 'zzz' }];
  const scene = compile({ width: W, height: H, data: links, x1: 'p', x2: 'q', y1: 1, y2: 2,
    children: [<Link />, <Scale channel="x" type="band" domain={['a', 'b']} />] }).scene;
  expect(scene.marks).toHaveLength(1);
});

/* ---------- step 3: Scale nice, and room for the plot ---------- */

const spread = [{ a: 1, b: 3.7 }, { a: 2, b: 8 }, { a: 3, b: 12.9 }];
const yOf = (scaleProps, extra = []) => {
  const dots = tap(<Dot />);
  compile({ width: W, height: H, data: spread, x: 'a', y: 'b', children: [dots, <Scale channel="y" {...scaleProps} />, ...extra] });
  return dots.seen[0].ctx;
};

test('Scale nice={false} keeps the data extent; true is the default; a number is the tick count', () => {
  const exact = yOf({ nice: false });
  expect(exact.y(3.7)).toBeCloseTo(exact.area.bottom, 6);
  expect(exact.y(12.9)).toBeCloseTo(exact.area.top, 6);
  const [lo, hi] = d3.scaleLinear().domain([3.7, 12.9]).nice(2).domain();
  const two = yOf({ nice: 2 });
  expect(two.y(lo)).toBeCloseTo(two.area.bottom, 6);
  expect(two.y(hi)).toBeCloseTo(two.area.top, 6);
  const dflt = yOf({}), on = yOf({ nice: true });
  expect(on.y(5)).toBe(dflt.y(5));
  expect(dflt.y(3.7)).not.toBeCloseTo(dflt.area.bottom, 3);
});

test('Scale nice also applies to x, and an explicit domain is never niced', () => {
  const dots = tap(<Dot />);
  compile({ width: W, height: H, data: spread, x: 'a', y: 'b', children: [dots, <Scale channel="x" nice={false} />] });
  expect(dots.seen[0].ctx.x(1)).toBeCloseTo(dots.seen[0].ctx.area.left, 6);
  expect(yOf({ domain: [3.7, 12.9], nice: 2 }).y(3.7)).toBeCloseTo(yOf({ nice: false }).y(3.7), 6);
});

test('explicit margin or size props that leave no room throw', () => {
  expect(() => plot([<Dot />], { height: 100, margin: { top: 60, bottom: 60 } })).toThrow('Plot height: 100 leaves no room for margins; raise height or lower margin');
  expect(() => plot([<Dot />], { width: 100, margin: { left: 50, right: 50 } })).toThrow('Plot width: 100 leaves no room for margins; raise width or lower margin');
  expect(() => plot([<Dot />], { height: 10 })).toThrow('Plot height: 10 leaves no room');
  expect(() => plot([<Dot />], { height: 20, margin: { top: 0, right: 0, bottom: 0, left: 0 } })).not.toThrow();
  expect(() => plot([<Dot />], { height: 20, margin: { top: 0, bottom: 0 } })).not.toThrow();
});

test('label-derived margins never take more than 75% of a dimension, and an explicit margin is never clamped', () => {
  const long = [{ a: 'a very long category label indeed', b: 1 }, { a: 'another quite long label here', b: 2 }];
  const areaOf = (extra = {}) => {
    const dots = tap(<Dot />);
    compile({ width: 120, height: 60, data: long, x: 'a', y: 'b', children: [dots, <Axis channel="x" labelAngle={-90} />, <Axis channel="y" />], ...extra });
    return dots.seen[0].ctx.area;
  };
  const area = areaOf();
  expect(area.height).toBeGreaterThanOrEqual(60 * 0.25 - 1e-9);
  expect(area.width).toBeGreaterThanOrEqual(120 * 0.25 - 1e-9);
  expect(areaOf({ margin: { bottom: 40 } }).bottom).toBe(20);
});

/* ---------- step 4: the legend of a classed colour scale ---------- */

const legendOf = (scale, values = [10, 30, 60, 90]) => {
  const { scene } = compile({ width: 400, height: H, data: values.map((v, i) => ({ a: i, b: i, c: v })), x: 'a', y: 'b', color: 'c',
    children: [<Dot />, scale, <Legend />] });
  return { swatches: scene.back.filter(sh => sh.t === 'rect'), labels: scene.back.filter(sh => sh.t === 'text' && sh.textAnchor === 'start').map(sh => sh.text) };
};
const classes = ['#111111', '#222222', '#333333', '#444444', '#555555', '#666666'];

test('a threshold scale draws one swatch per class, labelled by its interval', () => {
  const { swatches, labels } = legendOf(<Scale channel="color" type="threshold" domain={[25, 50, 75]} range={classes.slice(0, 4)} />);
  expect(swatches.map(s => s.fill)).toEqual(classes.slice(0, 4));
  expect(labels).toEqual(['<25', '25-50', '50-75', '>=75']);
});

test('a quantize scale draws its six classes', () => {
  const { swatches, labels } = legendOf(<Scale channel="color" type="quantize" domain={[0, 120]} range={classes} />);
  expect(swatches.map(s => s.fill)).toEqual(classes);
  expect(labels).toEqual(['<20', '20-40', '40-60', '60-80', '80-100', '>=100']);
});

test('a quantile scale draws its classes, not one swatch per trained value', () => {
  const values = Array.from({ length: 20 }, (_, i) => i + 1);
  const { swatches, labels } = legendOf(<Scale channel="color" type="quantile" range={classes.slice(0, 4)} />, values);
  expect(swatches).toHaveLength(4);
  expect(labels).toEqual(['<5.75', '5.75-10.5', '10.5-15.25', '>=15.25']);
});

test('an ordinal and a sequential legend are as before', () => {
  const { swatches } = legendOf(<Scale channel="color" type="sequential" />);
  expect(swatches).toHaveLength(5);
});

/* ---------- step 5: colorTo ---------- */

const rings = [1, 2, 3].map(level => ({ level, points: [[0, 0], [level, 0], [level, level]] }));
const ringsOf = polygon => compile({ width: W, height: H, data: rings, children: [polygon] }).scene.marks;

test('colorTo="stroke" moves the colour channel to the stroke; a Polygon then defaults fill to none', () => {
  const [a, b] = ringsOf(<Polygon points="points" color="level" colorTo="stroke" />);
  expect(a.stroke).toBeDefined();
  expect(a.stroke).not.toBe(b.stroke);
  expect(a.fill).toBe('none');
  expect(ringsOf(<Polygon points="points" color="level" colorTo="stroke" fill="#abcdef" />)[0].fill).toBe('#abcdef');
});

test('without colorTo the colour goes where the mark sends it; colorTo="fill" says so', () => {
  const [a, b] = ringsOf(<Polygon points="points" color="level" />);
  expect(a.fill).not.toBe(b.fill);
  expect(a.stroke).toBeUndefined();
  expect(ringsOf(<Polygon points="points" color="level" colorTo="fill" />)[0].fill).toBe(a.fill);
});

test('colorTo works on any mark', () => {
  const dots = compile({ width: W, height: H, data: rows, x: 'a', y: 'b', color: 'b', children: [<Dot colorTo="stroke" fill="none" />] }).scene.marks;
  expect(new Set(dots.map(sh => sh.stroke)).size).toBe(3);
});

test('a Polygon that can draw nothing, and a colorTo that is not a style prop, throw', () => {
  expect(() => ringsOf(<Polygon points="points" fill="none" />)).toThrow('Polygon: fill "none" with no stroke draws nothing; set stroke or colorTo="stroke"');
  expect(() => ringsOf(<Polygon points="points" fill="none" color="level" />)).toThrow(/draws nothing/);
  expect(() => ringsOf(<Polygon points="points" fill="none" stroke="#123456" />)).not.toThrow();
  expect(() => ringsOf(<Polygon points="points" fill="none" colorTo="stroke" color="level" />)).not.toThrow();
  expect(() => ringsOf(<Polygon points="points" colorTo="strok" />)).toThrow('Polygon colorTo: "strok" is not a style prop; use "fill" or "stroke"');
});

/* ---------- step 6: hexbin on a small plot (docs; the shape is measured here) ---------- */

// The cells of the hexbin example: 300 commits by hour and lines changed, on the 248 x 110 plot.
const commits = Array.from({ length: 300 }, (_, i) => {
  const a = Math.abs(Math.sin(i * 127.1) * 43758.5453) % 1, b = Math.abs(Math.sin(i * 311.7) * 43758.5453) % 1, c = Math.abs(Math.sin(i * 419.2) * 43758.5453) % 1;
  const late = i % 3 === 0;
  return { hour: (late ? 22 : 11) + 4 * (a + b - 1), lines: (late ? 80 : 40) + 60 * (c + b - 1) };
});
const NO_MARGIN = { top: 0, right: 0, bottom: 0, left: 0 };
// The median height over width of a drawn cell: 1.1547 (2 / sqrt 3) for a regular hexagon with flat sides left and right.
const shape = (children, margin) => {
  const cells = hexbin(commits, { x: 'hour', y: 'lines', binWidth: 1.8, width: 248, height: 110 });
  const { scene } = compile({ width: 248, height: 110, margin, data: cells, children: [...children, <Polygon points="points" color="count" />] });
  return d3.median(scene.marks.filter(sh => sh.t === 'path').map(sh => {
    const p = pathPoints(sh.d), [y0, y1] = d3.extent(p, q => q[1]), [x0, x1] = d3.extent(p, q => q[0]);
    return (y1 - y0) / (x1 - x0);
  }));
};
const extent = field => d3.extent(commits, field);

test('hexbin cells are regular with explicit data-extent domains and no margin; nice={false} gets closer than the defaults', () => {
  const regular = shape([<Scale channel="x" domain={extent(d => d.hour)} />, <Scale channel="y" domain={extent(d => d.lines)} />], NO_MARGIN);
  expect(Math.abs(regular - 2 / Math.sqrt(3))).toBeLessThan(0.01);
  const inferred = shape([], NO_MARGIN);
  const unniced = shape([<Scale channel="x" nice={false} />, <Scale channel="y" nice={false} />], NO_MARGIN);
  expect(unniced).toBeGreaterThan(inferred + 0.2);
  expect(unniced).toBeLessThan(regular);
  expect(shape([], undefined)).toBeLessThan(inferred);   // the default margins squash it further (measured 0.49, 0.71, 1.07, 1.155)
});

/* ---------- step 7: a Rect with one value on a continuous axis needs a thickness ---------- */

test('Rect with a single continuous value and no thickness throws; Bar and baselined Rects do not', () => {
  const throws = (el, axis) => expect(() => plot([el])).toThrow(`Rect ${axis}: single value on a continuous scale; give ${axis}1/${axis}2, baseline, or width={px}`);
  throws(<Rect />, 'x');
  expect(() => compile({ width: W, height: H, data: rows, y: 'b', x1: 'a', x2: 'a', children: [<Rect />] })).toThrow('Rect y: single value');
  expect(() => compile({ width: W, height: H, data: rows, x: 'a', y1: 'b', y2: 'b', children: [<Rect />] })).toThrow('Rect x: single value');
  expect(() => plot([<Rect width={6} />])).not.toThrow();
  expect(() => plot([<Rect baseline={0} width={6} />])).not.toThrow();
  expect(() => plot([<Bar />])).not.toThrow();
  expect(() => compile({ width: W, height: H, data: rows, x: 'a', y1: 'b', y2: 'b', children: [<Rect width={4} />] })).not.toThrow();
});

/* ---------- step 8: a Rect that can never have an x or a y ---------- */

test('a Rect with no x (or y) channel at all throws; an all-null column stays quiet', () => {
  // Constants only, no data of its own: one row that inherits nothing, so no x.
  expect(() => plot([<Rect y1={0} y2={1} />])).toThrow('Rect x: no x channel, so nothing is drawn; give x or x1/x2');
  expect(() => plot([<Rect x1={0} x2={1} />])).toThrow('Rect y: no y channel, so nothing is drawn; give y or y1/y2');
  expect(() => plot([<Rect x={null} y1="a" y2="b" />])).toThrow('Rect x: no x channel');
  expect(() => compile({ width: W, height: H, data: rows, children: [<Rect y1="a" y2="b" />] })).toThrow('Rect x: no x channel');
  // Giving the missing axis makes it legal, including its own constants.
  expect(() => plot([<Rect x={1} y1={0} y2={1} width={4} />])).not.toThrow();
  expect(() => plot([<Rect x1={1} x2={2} y1={0} y2={1} />])).not.toThrow();
  expect(() => plot([<Rect x1="a" x2="a" y1={0} y2={1} data={rows} />])).not.toThrow();
  // A data-dependent all-null column is a data condition, not a mistake.
  const blank = rows.map(r => ({ ...r, a: null }));
  expect(() => compile({ width: W, height: H, data: blank, x: 'a', y: 'b', children: [<Rect width={4} />] })).not.toThrow();
  // Link skips a missing end rather than throwing.
  expect(() => plot([<Link y1={0} y2={1} />])).not.toThrow();
});

/* ---------- step 9: a Text with neither x nor y ---------- */

test('a Text with no x and no y throws outside polar; one edge, or polar, stays legal', async () => {
  const { polar } = await import('../core.jsx');
  const bare = { width: W, height: H, data: rows };
  expect(() => compile({ ...bare, children: [<Text text="hi" />] })).toThrow('Text x: no x or y channel; give x/y');
  expect(() => compile({ ...bare, x: 'a', children: [<Text text="hi" y={null} />] })).not.toThrow();
  expect(() => compile({ ...bare, x: 'a', y: 'b', children: [<Text text="hi" x={null} y={null} />] })).toThrow('Text x: no x or y channel');
  // Only x, or only y: pinned to an edge (+-Infinity), as before.
  const edge = c => compile({ ...bare, children: c }).scene.front.filter(s => s.t === 'text');
  expect(edge([<Text text="hi" x={-Infinity} />])[0]).toMatchObject({ x: expect.any(Number) });
  expect(edge([<Text text="hi" y={Infinity} />])).toHaveLength(1)   // constants alone: one row;
  expect(edge([<Text text="hi" x1={0} x2={1} y1={0} y2={1} />])).toHaveLength(1);
  // Under polar the centre stays implicit.
  const centred = compile({ ...bare, coord: polar(), children: [<Text text="hi" />] }).scene.front.filter(s => s.t === 'text');
  expect(centred).toHaveLength(rows.length);
});

/* ---------- step 10: layout rows carry the input row's fields ---------- */

const procs = [
  { id: 'init', parent: null, label: 'Init', size: 1 },
  { id: 'sshd', parent: 'init', label: 'Sshd', size: 3 },
  { id: 'cron', parent: 'init', label: 'Cron', size: 2 },
];

test('layout node rows spread the row first: its fields read directly, the layout wins a clash', () => {
  const nodes = tree(procs, { id: 'id', parent: 'parent', value: 'size' }).nodes;
  expect(nodes.map(d => d.label).sort()).toEqual(['Cron', 'Init', 'Sshd']);
  for (const layout of [treemap, partition, pack]) {
    expect(layout(procs, { id: 'id', parent: 'parent', value: 'size' }).map(d => d.label).sort()).toEqual(['Cron', 'Init', 'Sshd']);
  }
  const clash = procs.map(r => ({ ...r, depth: 99 }));
  const rows = treemap(clash, { id: 'id', parent: 'parent', value: 'size' });
  expect(rows.map(d => d.depth).sort()).toEqual([0, 1, 1]);
  expect(rows.map(d => d.datum.depth)).toEqual([99, 99, 99]);
});

test('name: the option beats the row\'s own name, which beats the last segment of the id', () => {
  const named = [{ id: 'a', parent: null, name: 'Own' }, { id: 'b', parent: 'a', name: 'Child', label: 'L' }];
  const byId = (rows, id) => rows.find(d => d.id === id);
  expect(byId(tree(named, { id: 'id', parent: 'parent' }).nodes, 'b').name).toBe('Child');
  expect(byId(tree(named, { id: 'id', parent: 'parent', name: 'label' }).nodes, 'b').name).toBe('L');
  expect(byId(treemap(named, { id: 'id', parent: 'parent', name: d => d.id + '!' }), 'b').name).toBe('b!');
  expect(treemap([{ path: 'x/y/z' }, { path: 'x/y/w' }], { path: 'path' }).map(d => d.name).sort()).toEqual(['w', 'y', 'z']);
});

test('flow link rows carry their input fields; node rows do not', () => {
  const out = flow([{ from: 'a', to: 'b', n: 2, kind: 'x' }, { from: 'a', to: 'c', n: 1, kind: 'y' }], { source: 'from', target: 'to', value: 'n', width: 100, height: 50 });
  expect(out.links.map(l => l.kind)).toEqual(['x', 'y']);
  expect(out.links[0].value).toBe(2);
  expect(out.links[0].datum.kind).toBe('x');
  expect(out.nodes[0].kind).toBeUndefined();
});

/* ---------- step 11: path together with id/parent throws ---------- */

test('path with id or parent throws, naming the piece; either alone is legal', () => {
  const paths = [{ path: 'a/b', id: 'a', parent: null }];
  const both = { path: 'path', id: 'id', parent: 'parent' };
  expect(() => tree(paths, both)).toThrow('tree path: id and parent also given; give one');
  expect(() => treemap(paths, both)).toThrow('treemap path: id and parent also given; give one');
  expect(() => pack(paths, both)).toThrow('pack path: id and parent also given; give one');
  expect(() => partition(paths, { path: 'path', parent: 'parent' })).toThrow('partition path: id and parent also given; give one');
  for (const [Piece, name] of [[Treemap, 'Treemap'], [Tree, 'Tree'], [Pack, 'Pack'], [Partition, 'Partition']]) {
    expect(() => compile({ width: W, height: H, data: paths, children: [<Piece path="path" id="id" parent="parent" />] })).toThrow(`${name} path: id and parent also given; give one`);
    expect(() => compile({ width: W, height: H, data: [{ path: 'a/b' }, { path: 'a/c' }], children: [<Piece path="path" />] })).not.toThrow();
    expect(() => compile({ width: W, height: H, data: procs, children: [<Piece id="id" parent="parent" />] })).not.toThrow();
  }
  expect(() => treemap([{ path: 'a/b' }], { path: 'path' })).not.toThrow();
});

/* ---------- step 13: a numeric margin means all four sides ---------- */

test('margin={n} is n on every side; the object form stays; anything else throws', () => {
  // A rect spanning the infinities fills the plot area.
  const area = margin => compile({ width: W, height: H, margin, children: [<Rect x1={-Infinity} x2={Infinity} y1={-Infinity} y2={Infinity} />] }).scene.marks[0];
  expect(area(0)).toMatchObject({ x: 0, y: 0, width: W, height: H });
  expect(area(8)).toMatchObject({ x: 8, y: 8, width: W - 16, height: H - 16 });
  expect(area({ left: 5 })).toMatchObject({ x: 5, y: 8 });
  for (const bad of ['x', true, NaN, [1, 2]]) expect(() => area(bad)).toThrow(/^Plot margin: expected a number or \{ top, right, bottom, left \}; got /);
  expect(() => area('x')).toThrow('Plot margin: expected a number or { top, right, bottom, left }; got "x"');
});

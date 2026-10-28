// Gap examples g07-g15: style passthrough, gradients, axis chrome, titles, room for labels,
// several y axes, grid defaults and legends (GAPS 1.5a, 1.5, 1.7a, 1.7b, 1.8).
import { test, expect, beforeEach } from 'vitest';
import * as d3 from 'd3';
import { drawFigure, figureKeys, resetFigures } from '../../../test/tauler.js';
import { Plot } from '../../Plot.jsx';
import { compile, defineMark, text, Layer, Scale, Axis, Grid, FONT_SIZE } from '../../core.jsx';
import { Line, Area, Rect, Bar, Dot, Text, Arc } from '../../marks.jsx';
import { need, tap, near, allShapes, pathPoints, W, H } from './support.js';

beforeEach(resetFigures);

/* ---------- g07: style props reach the shape ---------- */

const pair = [{ k: 'a', v: 3 }, { k: 'b', v: 5 }];
const sceneOf = (child, data = pair) => compile({ width: W, height: H, data, x: 'k', y: 'v', children: [child] }).scene;
const svgOf = (child, data = pair) => {
  <Plot width={W} height={H} data={data} x="k" y="v">{child}</Plot>;
  return drawFigure(figureKeys()[0]);
};

test('g07 Bar and Rect strokeDasharray reach the shape and the drawn svg', () => {
  for (const make of [p => <Bar {...p} />, p => <Rect y1={0} y2="v" {...p} />]) {
    const props = { stroke: '#222', strokeDasharray: '4 2' };
    expect(sceneOf(make(props)).marks.every(s => s.strokeDasharray === '4 2')).toBe(true);
    expect(svgOf(make(props))).toContain('stroke-dasharray="4 2"');
  }
});

test('g07 strokeOpacity reaches Rect, Line, Arc and the drawn svg', () => {
  const cases = [<Bar stroke="#222" strokeOpacity={0.4} />, <Line strokeOpacity={0.4} />, <Arc value="v" stroke="#222" strokeOpacity={0.4} />];
  for (const child of cases) {
    expect(sceneOf(child).marks.every(s => s.strokeOpacity === 0.4)).toBe(true);
    resetFigures();
    expect(svgOf(child)).toContain('stroke-opacity="0.4"');
  }
});

test('g07 Line strokeDasharray already reaches the shape and the drawn svg', () => {
  const child = <Line strokeDasharray="6 3" />;
  expect(sceneOf(child).marks[0].strokeDasharray).toBe('6 3');
  expect(svgOf(child)).toContain('stroke-dasharray="6 3"');
});

test('g07 Text fontWeight reaches the shape and the drawn svg', () => {
  const child = <Text text={d => d.k} fontWeight={700} />;
  expect(sceneOf(child).front.every(s => s.fontWeight === 700)).toBe(true);
  expect(svgOf(child)).toContain('font-weight="700"');
});

test('g07 Rect rounds each corner on its own', () => {
  const [shape] = sceneOf(<Bar cornerRadius={[8, 8, 0, 0]} />, [pair[1]]).marks;
  const asPath = shape.t === 'path' && /[AaQqCc]/.test(shape.d);
  const asField = Array.isArray(shape.cornerRadius) && shape.cornerRadius.join() === '8,8,0,0';
  expect(asPath || asField).toBe(true);
});

test('g07 Arc takes padAngle and cornerRadius', () => {
  const slices = [{ k: 'a', v: 3 }, { k: 'b', v: 5 }, { k: 'c', v: 2 }];
  const plain = sceneOf(<Arc value="v" color="k" />, slices).marks[0].d;
  const padded = sceneOf(<Arc value="v" color="k" padAngle={0.08} />, slices).marks[0].d;
  const rounded = sceneOf(<Arc value="v" color="k" cornerRadius={6} />, slices).marks[0].d;
  const arcs = d => (d.match(/A/g) ?? []).length;
  expect(padded).not.toBe(plain);
  expect(arcs(rounded)).toBeGreaterThan(arcs(plain));
});

/* ---------- g08: a fill that fades along y ---------- */

// The host renders gradients (SPEC 5.5, capability list), so this is a real outcome.
test('g08 a gradient fill fading to transparent exists in the scene, as one shape', () => {
  const linearGradient = need('linearGradient');
  const fade = linearGradient({ to: 'bottom', stops: [{ offset: 0, color: '#2b59d1', opacity: 1 }, { offset: 1, color: '#2b59d1', opacity: 0 }] });
  const series = d3.range(8).map(i => ({ t: i, v: 4 + 3 * Math.sin(i / 1.5) }));
  const { scene } = compile({ width: W, height: H, data: series, x: 't', y: 'v', children: [<Area fill={fade} />] });
  expect(scene.marks).toHaveLength(1);                 // not a stack of translucent slices
  expect(JSON.stringify(scene)).toMatch(/gradient/i);
  <Plot width={W} height={H} data={series} x="t" y="v"><Area fill={fade} /></Plot>;
  expect(drawFigure(figureKeys()[0])).toMatch(/<linearGradient/);
});

/* ---------- g09: hide axis line and ticks without painting them away ---------- */

const BACKGROUND = '#0e1621';
const swatch = [{ a: 1, b: 10 }, { a: 2, b: 40 }, { a: 3, b: 25 }, { a: 4, b: 60 }];
const sceneWith = (axes, props = {}) => compile({ width: W, height: H, data: swatch, x: 'a', y: 'b', theme: { background: BACKGROUND }, ...props,
  children: [<Line />, ...axes] }).scene;
const colourOf = s => [s.fill, s.stroke].filter(Boolean).map(c => c.toLowerCase());

test('g09 Axis line={false} tickSize={0}: no line shape, and no shape in the background colour', () => {
  const scene = sceneWith([<Axis channel="x" line={false} tickSize={0} />, <Axis channel="y" line={false} tickSize={0} />]);
  expect(scene.back.filter(s => s.t === 'line')).toHaveLength(0);
  expect(scene.back.filter(s => s.t === 'text').length).toBeGreaterThan(0);   // labels stay
  expect(allShapes(scene).some(s => colourOf(s).includes(BACKGROUND))).toBe(false);
});

test('g09 Axis line={false} alone drops the long line and keeps the ticks', () => {
  const scene = sceneWith([<Axis channel="x" line={false} />]);
  const lines = scene.back.filter(s => s.t === 'line');
  expect(lines.length).toBeGreaterThan(0);
  expect(lines.every(s => Math.hypot(s.x2 - s.x1, s.y2 - s.y1) < 10)).toBe(true);
});

/* ---------- g10: an axis title makes room by itself ---------- */

function areaOf(axes) {
  const dots = tap(<Dot />);
  const { scene } = compile({ width: W, height: H, data: swatch, x: 'a', y: 'b', children: [dots, ...axes] });   // no margin prop
  return { area: dots.seen[0].ctx.area, texts: allShapes(scene).filter(s => s.t === 'text') };
}

test('g10 an x axis title is drawn inside the figure and the plot area shrinks for it', () => {
  const without = areaOf([<Axis channel="x" />]);
  const withTitle = areaOf([<Axis channel="x" label="Elapsed seconds" />]);
  const title = withTitle.texts.find(s => s.text === 'Elapsed seconds');
  expect(title).toBeDefined();
  expect(title.y + title.fontSize).toBeLessThanOrEqual(H);
  expect(title.x).toBeGreaterThan(0);
  expect(without.area.bottom - withTitle.area.bottom).toBeGreaterThanOrEqual(FONT_SIZE);
});

test('g10 a y axis title is rotated, inside the figure, and the plot area shrinks for it', () => {
  const without = areaOf([<Axis channel="y" />]);
  const withTitle = areaOf([<Axis channel="y" label="Load (jobs)" />]);
  const title = withTitle.texts.find(s => s.text === 'Load (jobs)');
  expect(title).toBeDefined();
  expect(title.transform).toMatch(/rotate/);
  expect(title.x).toBeGreaterThanOrEqual(0);
  expect(withTitle.area.left - without.area.left).toBeGreaterThanOrEqual(FONT_SIZE);
});

/* ---------- g11: a mark claims room, so end labels need no hand-set margin ---------- */

function endLabelPlot(label) {
  const seen = [];
  const EndLabel = defineMark('end-label', {
    room: (rows, props, { measure }) => ({ right: measure(label, FONT_SIZE) + 4 }),
    render(rows, ctx) {
      seen.push(ctx.area);
      const last = rows.at(-1);
      return [text(ctx.x(last.x) + 4, ctx.y(last.y), label, { textAnchor: 'start', fontFamily: ctx.theme.font, front: true })];
    },
  });
  const { scene } = compile({ width: W, height: H, data: swatch, x: 'a', y: 'b', children: [<Line />, <EndLabel />] });
  return { area: seen[0], label: scene.front[0] };
}

test('g11 the margin follows the width of an end label, with no margin prop', () => {
  const measure = (t) => t.length * FONT_SIZE * 0.6;
  const short = endLabelPlot('ok'), long = endLabelPlot('north cluster');
  for (const { label } of [short, long]) expect(label.x + measure(label.text)).toBeLessThanOrEqual(W + 0.01);
  expect(long.area.right).toBeLessThan(short.area.right);
});

/* ---------- g12: second and third y axes with their own units ---------- */

// Named scales as decided in GAPS 1.7b: `Scale name` declares, `scale` references, `Axis side` places.
const days = d3.range(6).map(i => ({ day: i, temp: 12 + 2 * i - (i % 2), pressure: 1000 + 6 * Math.sin(i), rain: 4 * i * i }));

test('g12 three y axes: each line spans its own scale, each axis is drawn, no custom mark', () => {
  const lines = ['temp', 'pressure', 'rain'].map(f => tap(<Line y={f} scale={{ y: f }} />));
  const { scene } = compile({ width: 400, height: H, data: days, x: 'day', children: [
    ...lines,
    ...['temp', 'pressure', 'rain'].map(f => <Scale channel="y" name={f} domain={d3.extent(days, d => d[f])} />),   // explicit, so each line spans its scale
    <Axis channel="y" scale="temp" side="left" />, <Axis channel="y" scale="pressure" side="right" />, <Axis channel="y" scale="rain" side="right" />,
  ] });
  const { area } = lines[0].seen[0].ctx;
  const paths = scene.marks.filter(s => s.t === 'path');
  expect(paths).toHaveLength(3);
  for (const p of paths) {
    const ys = pathPoints(p.d).map(pt => pt[1]);
    near(Math.min(...ys), area.top, 1);
    near(Math.max(...ys), area.bottom, 1);
  }
  const verticals = scene.back.filter(s => s.t === 'line' && s.x1 === s.x2 && s.y2 - s.y1 >= area.height - 1);
  expect(new Set(verticals.map(s => s.x1)).size).toBe(3);
});

/* ---------- g13: the grid follows the axis ticks ---------- */

const loads = [{ h: 1, load: 12 }, { h: 2, load: 87 }, { h: 3, load: 44 }, { h: 4, load: 130 }];
const gridYs = (scene, area) => scene.back.filter(s => s.t === 'line' && s.y1 === s.y2 && Math.abs(s.x2 - s.x1 - area.width) < 1).map(s => s.y1);
const tickYs = (scene, area) => scene.back.filter(s => s.t === 'line' && s.y1 === s.y2 && s.x2 === area.left && s.x1 < area.left).map(s => s.y1);

test('g13 with no ticks anywhere, grid lines sit on the axis ticks', () => {
  const grid = <Grid channel="y" />, dots = tap(<Dot />);
  const { scene } = compile({ width: W, height: H, data: loads, x: 'h', y: 'load', children: [grid, dots, <Axis channel="y" />] });
  expect(grid.props.ticks).toBeUndefined();   // the tick list is not written twice
  const { area } = dots.seen[0].ctx;
  expect(tickYs(scene, area).length).toBeGreaterThan(2);
  expect(gridYs(scene, area)).toEqual(tickYs(scene, area));   // scene values are rounded alike
});

test('g13 explicit axis ticks are followed by a grid that names none', () => {
  const dots = tap(<Dot />);
  const { scene } = compile({ width: W, height: H, data: loads, x: 'h', y: 'load', children: [<Grid channel="y" />, dots, <Axis channel="y" ticks={[0, 50, 100]} />] });
  const { area, y } = dots.seen[0].ctx;
  gridYs(scene, area).forEach((g, i) => near(g, [0, 50, 100].map(y)[i], 0.02));
  expect(gridYs(scene, area)).toHaveLength(3);
});

/* ---------- g14: even grid intervals that end at the top ---------- */

function gridLines(data, field) {
  const dots = tap(<Dot />);
  const { scene } = compile({ width: W, height: H, data, x: 'h', y: field, children: [<Grid channel="y" />, dots] });
  const { area } = dots.seen[0].ctx;
  return { ys: d3.sort(gridYs(scene, area)), area };
}

test('g14 default y grid lines are evenly spaced', () => {
  const { ys } = gridLines(loads, 'load');
  const gaps = d3.pairs(ys, (a, b) => b - a);
  expect(gaps.length).toBeGreaterThan(1);
  gaps.forEach(g => near(g, gaps[0], 0.05));
});

test('g14 with no options, the last y grid line is at the top of the plot', () => {
  const { ys, area } = gridLines(loads, 'load');   // the largest value, 130, is not a round tick
  near(ys[0], area.top, 0.5);
  const gaps = d3.pairs(ys, (a, b) => b - a);
  gaps.forEach(g => near(g, gaps[0], 0.05));
});

/* ---------- g15: legends read the scale ---------- */

const kinds = [{ id: 1, kind: 'north', n: 4 }, { id: 2, kind: 'south', n: 9 }, { id: 3, kind: 'east', n: 6 }];

test('g15 the Plot colour scale already exposes keys and, when continuous, its stops', () => {
  const byKind = tap(<Dot />), byValue = tap(<Dot />);
  compile({ width: W, height: H, data: kinds, x: 'id', y: 'n', color: 'kind', children: [byKind] });
  compile({ width: W, height: H, data: kinds, x: 'id', y: 'n', color: 'n', children: [byValue, <Scale channel="color" range={['#eef', '#33c']} />] });
  expect(byKind.seen[0].ctx.color.domain()).toEqual(['north', 'south', 'east']);
  expect(byValue.seen[0].ctx.color.range()).toEqual(['#eef', '#33c']);
  expect(byValue.seen[0].ctx.color.domain()).toEqual([4, 9]);
});

// Decided (GAPS 1.8): a `Legend` guide reads the trained colour domain and claims room.
test('g15 a Legend guide draws one swatch per key from the trained scale and shrinks the plot area', () => {
  const Legend = need('Legend');
  const withLegend = tap(<Dot />), without = tap(<Dot />);
  const base = { width: W, height: H, data: kinds, x: 'id', y: 'n', color: 'kind' };
  const { scene } = compile({ ...base, children: [withLegend, <Legend channel="color" side="top" />] });
  compile({ ...base, children: [without] });
  const { color, area } = withLegend.seen[0].ctx;
  const swatches = scene.back.filter(s => s.t === 'rect' && ['north', 'south', 'east'].some(k => s.fill === color(k)));
  expect(swatches.map(s => s.fill)).toEqual(['north', 'south', 'east'].map(color));
  expect(area.top).toBeGreaterThan(without.seen[0].ctx.area.top);   // no margin prop: the legend claimed its row
});

test('g15 a Legend on a sequential colour draws stepped swatches from the range, and rejects side="left"', () => {
  const Legend = need('Legend');
  const base = { width: W, height: H, data: kinds, x: 'id', y: 'n', color: 'n' };
  const range = <Scale channel="color" range={['#eef', '#33c']} />, dots = tap(<Dot />);
  const { scene } = compile({ ...base, children: [dots, range, <Legend channel="color" side="bottom" />] });
  const { color } = dots.seen[0].ctx, fills = scene.back.filter(s => s.t === 'rect').map(s => s.fill);
  expect(fills[0]).toBe(color(4));      // the trained scale's own colours, from the ends of its domain
  expect(fills.at(-1)).toBe(color(9));
  expect(new Set(fills).size).toBeGreaterThan(2);   // stepped, not just the two ends
  expect(() => compile({ ...base, children: [<Dot />, range, <Legend channel="color" side="left" />] }))
    .toThrow(/Legend color: side "left" must be top or bottom/);
});

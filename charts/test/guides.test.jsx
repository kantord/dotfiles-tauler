// Guides: the margin stage's claims (GAPS 1.7-seam, done), axis chrome, the Legend guide and
// named scales. Fixtures are kept in grammar/__svg__/ like the other drawings.
import { test, expect, beforeEach } from 'vitest';
import { drawFigure, figureKeys, resetFigures } from '../../test/tauler.js';
import { Plot } from '../Plot.jsx';
import { compile, Scale, Axis, Grid, Layer, Legend } from '../core.jsx';
import { GUIDES } from '../guides.jsx';
import { Line, Dot } from '../marks.jsx';

beforeEach(resetFigures);

const W = 320, H = 160;
const tap = mark => {
  const seen = [];
  return { ...mark, seen, render: (rows, ctx) => { seen.push(ctx); return mark.render(rows, ctx); } };
};
const snapshot = name => expect(drawFigure(figureKeys()[0])).toMatchFileSnapshot(`./grammar/__svg__/guide-${name}.svg`);
const readings = [{ t: 1, v: 12, kind: 'north', n: 4 }, { t: 2, v: 40, kind: 'south', n: 9 }, { t: 3, v: 25, kind: 'east', n: 6 }, { t: 4, v: 33, kind: 'north', n: 7 }];
const areaOf = (children, props = {}) => {
  const dots = tap(<Dot />);
  compile({ width: W, height: H, data: readings, x: 't', y: 'v', ...props, children: [dots, ...children] });
  return dots.seen[0].area;
};

/* ---------- the seam: a guide claims room, and the area shrinks by exactly that ---------- */

// A guide is `{ claim, shapes }` in GUIDES; a stub that claims 30px on top and 22 on the right.
test('a stub guide that claims room on the top and the right shrinks the area by exactly that room', () => {
  GUIDES.stub = { claim: () => ({ room: { top: 30, right: 22 }, side: 'top' }), shapes: () => [] };
  try {
    const stub = { $: 'stub', props: {} };
    const [without, withStub] = [areaOf([]), areaOf([stub])];
    expect(withStub.top).toBe(30);
    expect(W - withStub.right).toBe(22);
    expect([withStub.left, withStub.bottom]).toEqual([without.left, without.bottom]);
    expect(withStub.width).toBe(without.width - (22 - 8));   // claims are a max with the 8px seed, not a sum
    expect(areaOf([stub], { margin: { top: 5 } }).top).toBe(5);   // the `margin` prop is applied last
  } finally { delete GUIDES.stub; }
});

test('guides are claimed after the axes, and see the margins the axes produced', () => {
  let seen;
  GUIDES.stub = { claim: (props, st) => { seen = { ...st.margin }; return { room: {}, side: 'top' }; }, shapes: () => [] };
  try {
    areaOf([{ $: 'stub', props: {} }, <Axis channel="y" />, <Axis channel="x" />]);   // written first, claimed last
    expect(seen.left).toBeGreaterThan(8);
    expect(seen.bottom).toBe(24);
  } finally { delete GUIDES.stub; }
});

/* ---------- Legend ---------- */

test('a Legend claims one row: the plot area starts a row lower, and the legend sits above it', () => {
  const without = areaOf([]), withLegend = areaOf([<Legend channel="color" side="top" />], { color: 'kind' });
  expect(withLegend.top - without.top).toBeGreaterThan(8);
  const bottom = areaOf([<Legend channel="color" side="bottom" />], { color: 'kind' });
  expect(without.bottom - bottom.bottom).toBeGreaterThan(8);
});

test('legend: a top legend over an ordinal colour', async () => {
  <Plot width={W} height={H} data={readings} x="t" y="v" color="kind"><Line /><Dot /><Legend channel="color" side="top" /><Axis channel="x" /></Plot>;
  await snapshot('legend-top');
});

test('legend: a bottom legend stacks under the x axis labels', async () => {
  <Plot width={W} height={H} data={readings} x="t" y="v" color="kind"><Dot /><Axis channel="x" /><Axis channel="y" /><Legend channel="color" side="bottom" /></Plot>;
  await snapshot('legend-bottom');
});

test('legend: a sequential colour is a stepped ramp with its two ends labelled', async () => {
  <Plot width={W} height={H} data={readings} x="t" y="v" color="n"><Dot /><Legend channel="color" /></Plot>;
  await snapshot('legend-sequential');
});

test('legend: labels that do not fit are cut with an ellipsis, like y axis labels', async () => {
  const long = readings.map((r, i) => ({ ...r, kind: ['north-east lowlands', 'south-west highlands', 'central plateau', 'eastern coast'][i] }));
  const { scene } = compile({ width: 200, height: H, data: long, x: 't', y: 'v', color: 'kind', children: [<Dot />, <Legend channel="color" />] });
  expect(scene.back.filter(s => s.t === 'text').some(s => s.text.endsWith('…'))).toBe(true);
  <Plot width={200} height={H} data={long} x="t" y="v" color="kind"><Dot /><Legend channel="color" /></Plot>;
  await snapshot('legend-cut');
});

test('Legend rejects an unknown channel and side, and draws nothing without a colour scale', () => {
  const plot = child => compile({ width: W, height: H, data: readings, x: 't', y: 'v', color: 'kind', children: [<Dot />, child] });
  expect(() => plot(<Legend channel="size" />)).toThrow(/Legend: unknown channel 'size'/);
  expect(() => plot(<Legend side="right" />)).toThrow(/Legend color: side "right" must be top or bottom/);
  const { scene } = compile({ width: W, height: H, data: readings, x: 't', y: 'v', children: [<Dot />, <Legend />] });
  expect(scene.back).toHaveLength(0);
});

/* ---------- axis chrome ---------- */

test('Axis tickSize and line drop the shapes, and a title adds its room to the side it is on', () => {
  const shapes = axis => compile({ width: W, height: H, data: readings, x: 't', y: 'v', children: [<Dot />, axis] }).scene.back;
  const lines = axis => shapes(axis).filter(s => s.t === 'line').length;
  expect(lines(<Axis channel="x" />)).toBe(1 + 4);          // the long line and four ticks
  expect(lines(<Axis channel="x" line={false} />)).toBe(4);
  expect(lines(<Axis channel="x" tickSize={0} />)).toBe(1);
  const titled = side => areaOf([<Axis channel="x" side={side} label="seconds" />]), plain = side => areaOf([<Axis channel="x" side={side} />]);
  expect(plain('bottom').bottom - titled('bottom').bottom).toBeGreaterThanOrEqual(11);
  expect(titled('top').top - plain('top').top).toBeGreaterThanOrEqual(11);
});

/* ---------- named scales ---------- */

const data = [{ d: 1, a: 2, b: 300 }, { d: 2, a: 3, b: 100 }, { d: 3, a: 5, b: 200 }];

test('a mark binds a named scale, and a Layer binds one for its marks, which may override it key by key', () => {
  const bound = tap(<Line y="a" scale={{ y: 'big' }} />), inherited = tap(<Line y="b" />), overridden = tap(<Line y="b" scale={{ y: 'default' }} />);
  compile({ width: W, height: H, data, x: 'd', children: [<Scale channel="y" name="big" />,
    <Layer scale={{ y: 'big' }}>{inherited}{overridden}</Layer>, bound] });
  expect(inherited.seen[0].y(300)).toBeLessThan(inherited.seen[0].y(100));
  expect(overridden.seen[0].y(300)).toBe(overridden.seen[0].area.top);   // 'default' trains on b alone: [100, 300]
  expect(bound.seen[0].y(3)).toBe(inherited.seen[0].y(3));   // 'big' trains on a and b together
  expect(overridden.seen[0].y(3)).not.toBe(bound.seen[0].y(3));
});

test('named scale errors name the piece, the channel and the problem', () => {
  const plot = children => compile({ width: W, height: H, data, x: 'd', y: 'a', children });
  expect(() => plot([<Dot />, <Scale channel="y" name="right" />, <Axis channel="y" scale="rain" side="right" />]))
    .toThrow('Axis y: unknown scale "rain"; declared: (default), right');
  expect(() => plot([<Dot />, <Scale channel="y" name="rain" />, <Scale channel="y" name="rain" />]))
    .toThrow('Scale y: name "rain" declared twice');
  expect(() => plot([<Dot />, <Axis channel="y" side="top" />])).toThrow('Axis y: side "top" must be left or right');
  expect(() => plot([<Dot />, <Axis channel="x" side="left" />])).toThrow('Axis x: side "left" must be bottom or top');
  expect(() => plot([<Dot scale={{ y: 'rain' }} />])).toThrow('dot y: unknown scale "rain"; declared: (default)');
  expect(() => plot([<Dot />, <Scale channel="y" name="rain" />, <Axis channel="y" />, <Layer scale={{ y: 'nope' }}><Dot /></Layer>]))
    .toThrow('unknown scale "nope"');
});

test('a Grid follows the primary axis unless it names a scale; two right axes stack outward', () => {
  const dots = tap(<Line y="a" />);
  const children = grid => [dots, <Line y="b" scale={{ y: 'big' }} />, <Scale channel="y" name="big" />,
    <Axis channel="y" />, <Axis channel="y" scale="big" side="right" />, <Axis channel="y" scale="big" side="right" label="b" />, grid];
  const run = grid => compile({ width: 400, height: H, data, x: 'd', children: children(grid) }).scene.back;
  const verticals = run(<Grid channel="x" />).filter(s => s.t === 'line' && s.x1 === s.x2 && s.y2 - s.y1 > 50).map(s => s.x1);
  const { area } = dots.seen[0];
  expect(new Set(verticals.filter(x => x <= area.left || x >= area.right)).size).toBe(3);   // left, right, and the second right axis further out
  const rows = back => back.filter(s => s.t === 'line' && s.y1 === s.y2);
  const gridYs = (back, from) => rows(back).filter(s => s.x1 === area.left && s.x2 === area.right).map(s => s.y1);
  const tickYs = back => rows(back).filter(s => s.x1 === area.left - 4).map(s => s.y1);
  const rightTickYs = back => rows(back).filter(s => s.x1 === area.right && s.x2 === area.right + 4).map(s => s.y1);
  const primary = run(<Grid channel="y" />), named = run(<Grid channel="y" scale="big" />);
  expect(gridYs(primary)).toEqual(tickYs(primary));
  expect(gridYs(named)).toEqual(rightTickYs(named));
  expect(gridYs(named)).not.toEqual(gridYs(primary));
});

test('two Legends on one side stack: the second sits a row beyond the first', () => {
  const rowsOf = side => compile({ width: W, height: H, data: readings, x: 't', y: 'v', color: 'kind', children: [<Dot />, <Legend channel="color" side={side} />, <Legend channel="color" side={side} />] })
    .scene.back.filter(s => s.t === 'rect').map(s => s.y);
  const top = [...new Set(rowsOf('top'))], bottom = [...new Set(rowsOf('bottom'))];
  expect(top).toHaveLength(2);
  expect(Math.abs(top[1] - top[0])).toBeGreaterThanOrEqual(11);
  expect(bottom).toHaveLength(2);
  expect(Math.abs(bottom[1] - bottom[0])).toBeGreaterThanOrEqual(11);
});

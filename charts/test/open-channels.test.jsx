// Open scale types, mark-declared channels, size/shape/opacity channels and mark room
// (GAPS 1.1, 2.1; SPEC 5.4, 5.6, 5.7). The gap examples g02-g06 and g11 are in test/gaps/.
import { test, expect } from 'vitest';
import '../../test/tauler.js';
import { compile, defineScale, defineChannel, defineMark, sizeScale, opacityScale, shapeScale, Scale, Axis } from '../core.jsx';
import { Dot, Rect, Line } from '../marks.jsx';
import { tap, near, W, H } from './gaps/support.js';

const data = [{ a: 1, b: 4 }, { a: 2, b: 9 }, { a: 3, b: 16 }];
const plot = children => compile({ width: W, height: H, data, x: 'a', y: 'b', children });

test('pow takes an exponent', () => {
  const dots = tap(<Dot />);
  plot([dots, <Scale channel="y" type="pow" exponent={2} domain={[0, 16]} />]);
  const { y } = dots.seen[0].ctx;
  near((y(0) - y(4)) / (y(0) - y(16)), 1 / 16, 1e-6);
});

test('a test-defined band-like type and threshold-like type go through the same contract', () => {
  defineScale('halves', {
    band: true,
    train: values => [...new Set(values)],
    build: (domain, range) => Object.assign(v => range[0] + (domain.indexOf(v) + 0.5) * (range[1] - range[0]) / domain.length, { domain: () => domain }),
  });
  defineScale('sign', {
    train: () => [0],
    build: (domain, range) => Object.assign(v => (v < domain[0] ? range[0] : range[1]), { domain: () => domain }),
  });
  const dots = tap(<Dot color="n" />);
  const { scene } = compile({ width: W, height: H, data: [{ a: 'p', b: 1, n: -2 }, { a: 'q', b: 2, n: 5 }], x: 'a', y: 'b',
    children: [dots, <Scale channel="x" type="halves" />, <Scale channel="color" type="sign" range={['blue', 'red']} />] });
  expect(scene.marks.map(s => s.fill)).toEqual(['blue', 'red']);
  expect(dots.seen[0].ctx.x('p')).toBeLessThan(dots.seen[0].ctx.x('q'));
});

test('defining a type twice, or a channel for an unknown scale, throws', () => {
  expect(() => defineScale('linear', { build: () => null })).toThrow(/already/);
  expect(() => defineScale('nobuild', {})).toThrow(/build/);
  expect(() => defineChannel('density', { scale: 'colour' })).toThrow(/colour/);
  expect(() => defineChannel('size', { scale: 'color' })).toThrow(/already/);
});

test('a declared channel colours a mark, and trains only the scale it names', () => {
  defineChannel('heat', { scale: 'color' });
  const warm = rows => { rows.forEach((r, i) => { r.heat = i; }); return rows; };
  const { scene } = plot([<Dot position={warm} />]);
  const fills = scene.marks.map(s => s.fill);
  expect(new Set(fills).size).toBe(3);
});

test('a threshold scale without a domain throws, naming the channel', () => {
  expect(() => plot([<Dot color="b" />, <Scale channel="color" type="threshold" />])).toThrow(/color.*domain/);
});

test('size on a mark with no size meaning throws; an explicit r wins', () => {
  expect(() => plot([<Rect size="b" />])).toThrow(/size/);
  expect(() => plot([<Line size="b" />])).toThrow(/size/);
  const { scene } = plot([<Dot size="b" r={5} />]);
  expect(scene.marks.every(s => s.r === 5)).toBe(true);
});

test('shape names outside d3 symbols throw; each symbol draws a path with a translate', () => {
  const { scene } = plot([<Dot shape="a" />, <Scale channel="shape" range={['star', 'wye', 'triangle']} />]);
  expect(scene.marks.every(s => s.t === 'path' && /^translate/.test(s.transform))).toBe(true);
  expect(() => plot([<Dot shape="a" />, <Scale channel="shape" range={['blob']} />])).toThrow(/blob/);
});

test('a constant opacity is still a style prop', () => {
  expect(plot([<Dot opacity={0.4} />]).scene.marks.every(s => s.opacity === 0.4)).toBe(true);
});

test('legend helpers return what a legend needs', () => {
  const size = sizeScale([0, 36], [0, 10], 'sqrt');
  near(size(9), 5, 1e-9);
  expect(size.domain()).toEqual([0, 36]);
  expect(opacityScale([0, 1]).domain()).toEqual([0, 1]);
  const shape = shapeScale(['rock', 'ice', 'gas']);
  expect(shape('ice')).toBe('cross');
  expect(shape.domain()).toEqual(['rock', 'ice', 'gas']);
});

test('a mark claims room, and a guide on that side stacks beyond it', () => {
  const Wide = defineMark('wide', { room: () => ({ right: 50 }), render: () => [] });
  const seen = tap(<Dot />);
  const without = plot([seen, <Axis channel="y" side="right" />]);
  const withRoom = plot([seen, <Wide />, <Axis channel="y" side="right" />]);
  const area = i => seen.seen[i].ctx.area;
  near(area(1).right, area(0).right - 50, 0.5);   // the axis moved out by the mark's room
  expect(withRoom.key).not.toBe(without.key);
});

// Text: per-font widths, wrapping, rotation and fit (GAPS 1.6, 3.8b done; SPEC 5.4, 9). Invented strings.
import { test, expect } from 'vitest';
import '../../test/tauler.js';
import { compile, Axis, Scale, defaultMeasure, defineMark } from '../core.jsx';
import { polar } from '../polar.jsx';
import { Text, Line } from '../marks.jsx';
import { measureFor, kindOf } from '../fonts.jsx';
import { wrap, extentOf } from '../typeset.jsx';

test('the default theme font measures 0.6 em a character, as before', () => {
  expect(measureFor('ui-monospace, monospace')('abcd', 10)).toBe(defaultMeasure('abcd', 10));
  expect(measureFor('Some Unknown Face')('abcd', 10)).toBe(24);
  expect(measureFor('JetBrains Mono')('iiii', 10)).toBe(24);   // every advance is 600 in that face
});

test('a sans or serif stack uses its table: advances read from Liberation Sans and Serif', () => {
  expect(kindOf('"Helvetica Neue", Arial, sans-serif')).toBe('sans');
  expect(kindOf('Georgia, serif')).toBe('serif');
  expect(kindOf('Unheard Of, sans-serif')).toBe('sans');
  expect(measureFor('sans-serif')('Hi', 1000)).toBe(722 + 222);
  expect(measureFor('serif')('Hi', 1000)).toBe(722 + 278);
  expect(measureFor('sans-serif')('é…', 1000)).toBe(556 + 1000);   // an accent is measured as its base letter
  expect(measureFor('sans-serif')('iii', 10)).toBeLessThan(measureFor('sans-serif')('WWW', 10));
});

test('wrap keeps every line inside the width, in order, and cuts a word wider than it', () => {
  const m = measureFor('sans-serif'), text = 'Quarterly average request throughput\nsecond paragraph';
  for (const width of [30, 60, 90, 200]) {
    const lines = wrap(text, width, m, 11);
    lines.forEach(l => expect(m(l, 11)).toBeLessThanOrEqual(width));
    expect(lines.join('').replace(/\s/g, '')).toBe(text.replace(/\s/g, ''));
  }
  expect(wrap('one\ntwo', 0, m, 11)).toEqual(['one', 'two']);   // no width: only explicit breaks
});

test('a rotated box reaches past its anchor by the rotated corners', () => {
  const r = extentOf(40, 10, -90, 'end');   // vertical text rising from the anchor
  expect(r.down).toBeCloseTo(40); expect(r.left).toBeCloseTo(0); expect(r.right).toBeCloseTo(10);
});

test('a rotated x axis makes room for its labels instead of clipping them', () => {
  const data = ['Harbour', 'Old mill', 'Lighthouse'].map((p, i) => ({ p, n: i }));
  const spec = angle => compile({ width: 240, height: 140, data, x: 'p', y: 'n', children: [<Line />, <Axis channel="x" labelAngle={angle} />] }).scene;
  const area = s => Math.max(...s.back.filter(t => t.t === 'text').map(t => t.y));
  expect(area(spec(-45))).toBeLessThan(140);
  const turned = spec(-45).back.filter(t => t.t === 'text' && t.textAnchor === 'end');
  expect(turned).toHaveLength(3);
  expect(spec(undefined).back.some(t => t.transform)).toBe(false);
});

test('labelAngle is for the bottom x axis only; Text fit needs a box', () => {
  const build = child => () => compile({ width: 240, height: 140, data: [{ a: 1, b: 2 }], x: 'a', y: 'b', children: [child] });
  expect(build(<Axis channel="y" labelAngle={30} />)).toThrow(/labelAngle/);
  expect(build(<Axis channel="x" side="top" labelAngle={30} />)).toThrow(/labelAngle/);
  expect(build(<Text text="x" fit />)).toThrow(/box channels/);
});

test('Text angle turns every line of a block about one anchor', () => {
  const { scene } = compile({ width: 240, height: 140, data: [{ k: 1 }], x: 'k', y: 'k',
    children: [<Text text={() => 'two words'} width={30} angle={-30} />, <Scale channel="x" domain={[0, 2]} />] });
  const lines = scene.front;
  expect(lines.length).toBeGreaterThan(1);
  expect(new Set(lines.map(l => l.transform)).size).toBe(1);
  expect(lines[0].transform).toMatch(/^rotate\(-30 /);
});

test('wrap returns when one character is wider than the width', () => {
  expect(wrap('W', 3, measureFor('sans-serif'), 11)).toEqual(['W']);
  expect(wrap('WWW', 3, measureFor('sans-serif'), 11)).toEqual(['W', 'W', 'W']);
});

test('a Text box under polar sits at the wedge, where ctx.point puts its middle', () => {
  let ctx;
  const Spy = defineMark('spy', { render: (rows, c) => { ctx = c; return []; } });
  const { scene } = compile({ width: 240, height: 240, data: [{ a: 0.2, b: 0.4, c: 0.5, d: 0.9 }], coord: polar(),
    children: [Spy(), <Text text={() => 'hi'} x1="a" x2="b" y1="c" y2="d" />, <Scale channel="x" domain={[0, 1]} />, <Scale channel="y" domain={[0, 1]} />] });
  const [px, py] = ctx.point(0.3, 0.7), label = scene.front[0];
  expect(label.x).toBeCloseTo(px, 1);
  expect(Math.abs(label.y - py)).toBeLessThan(11);   // within a line of the wedge middle
});

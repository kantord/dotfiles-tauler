import { test, expect } from 'vitest';
import assert from 'node:assert/strict';
import { compile, defineMark, Axis, Scale } from '../core.jsx';
import { Line } from '../marks.jsx';
import { series } from './fixtures.js';

function areaOf(props, ...children) {
  let area;
  const Spy = defineMark('spy', { render: (rows, ctx) => { area = ctx.area; return []; } });
  compile({ width: 248, height: 110, data: series, x: 't', y: 'cpu', ...props, children: [Spy(), ...children] });
  return area;
}

test('`margin` overrides the computed margin per side', () => {
  const auto = areaOf({}, Axis({ channel: 'y' }));
  assert.ok(auto.left > 8);
  const fixed = areaOf({ margin: { left: 4, top: 0 } }, Axis({ channel: 'y' }));
  assert.equal(fixed.left, 4);
  assert.equal(fixed.top, 0);
  assert.equal(fixed.right, auto.right);
});

test('tick labels are computed once per axis', () => {
  let calls = 0;
  const format = v => { calls++; return String(v); };
  const { scene } = compile({ width: 248, height: 110, data: series, x: 't', y: 'cpu',
    children: [Line(), Axis({ channel: 'y', ticks: 3, format })] });
  const labels = scene.back.filter(s => s.t === 'text').length;
  assert.ok(labels > 0);
  assert.equal(calls, labels);
});

test('a tick count on a band axis keeps every k-th label', () => {
  const data = 'abcdefgh'.split('').map(k => ({ k, v: 1 }));
  const labels = ticks => compile({ width: 248, height: 110, data, x: 'k', y: 'v', children: [Line(), Axis({ channel: 'x', ticks })] })
    .scene.back.filter(s => s.t === 'text').map(s => s.text);
  assert.deepEqual(labels(4), ['a', 'c', 'e', 'g']);
  assert.deepEqual(labels(['b', 'h']), ['b', 'h']);
});

// Label boxes along one axis, from the scene's text shapes.
const labelBoxes = (scene, horizontal) => scene.back.filter(s => s.t === 'text').map(s => horizontal
  ? [s.x - s.text.length * 11 * 0.3, s.x + s.text.length * 11 * 0.3] : [s.y - 5.5, s.y + 5.5]).sort((a, b) => a[0] - b[0]);
const overlaps = boxes => boxes.some((b, i) => i && b[0] < boxes[i - 1][1]);

test('band labels are thinned so they never overlap', () => {
  const data = ['compact', 'midsize', 'suv', 'pickup', 'minivan', 'subcompact', '2seater'].map(k => ({ k, v: 1 }));
  const { scene } = compile({ width: 320, height: 110, data, x: 'k', y: 'v', children: [Line(), Axis({ channel: 'x' })] });
  const boxes = labelBoxes(scene, true);
  expect(boxes.length).toBeGreaterThan(1);
  expect(overlaps(boxes)).toBe(false);
});

test('log axis labels never overlap', () => {
  const data = [{ a: 1.6, b: 12 }, { a: 6.8, b: 40 }];
  const { scene } = compile({ width: 320, height: 200, data, x: 'a', y: 'b',
    children: [Line(), Scale({ channel: 'x', type: 'log' }), Scale({ channel: 'y', type: 'log' }), Axis({ channel: 'y' })] });
  const boxes = labelBoxes(scene, false);
  expect(boxes.length).toBeGreaterThan(1);
  expect(overlaps(boxes)).toBe(false);
});

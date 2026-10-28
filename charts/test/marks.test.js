import { test, expect } from 'vitest';
import assert from 'node:assert/strict';
import { compile, defineMark } from '../core.jsx';

const plot = (children, extra = {}) => compile({ width: 200, height: 100,
  data: [{ a: 1, b: 2 }, { a: 3, b: 4 }], x: 'a', y: 'b', children, ...extra });

test('a custom mark\'s shapes reach the scene', () => {
  const Star = defineMark('star', { render: (rows, { x, y }) =>
    rows.map(r => ({ t: 'circle', cx: x(r.x), cy: y(r.y), r: 1 })) });
  const { scene } = plot([Star()]);
  assert.equal(scene.marks.filter(s => s.t === 'circle').length, 2);
});

test('ctx has everything a third-party mark needs', () => {
  let seen;
  const Spy = defineMark('spy', { render: (rows, ctx) => { seen = ctx; return []; } });
  plot([Spy({ value: 'b', fill: d => (d.a > 1 ? 'red' : 'blue') })]);
  assert.deepEqual(Object.keys(seen).sort(),
    ['area', 'bandwidth', 'color', 'coord', 'field', 'line', 'measure', 'point', 'projection', 'props', 'resolve', 'shape', 'size', 'theme', 'x', 'y']);
  assert.deepEqual(Object.keys(seen.area).sort(), ['bottom', 'height', 'left', 'right', 'top', 'width']);
  assert.equal(seen.bandwidth.x(), 0);
  assert.equal(seen.x(1), seen.area.left);
  const [r0, r1] = [{ d: { a: 1, b: 2 } }, { d: { a: 3, b: 4 } }];
  assert.equal(seen.field(r1, 'value'), 4);
  assert.equal(seen.resolve(r0, 'fill'), 'blue');
  assert.equal(seen.resolve(r0, 'stroke', 'none'), 'none');
});

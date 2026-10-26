import { test, expect } from 'vitest';
import assert from 'node:assert/strict';
import { compile, defineMark, stack, dodge } from '../core.jsx';
import { Rect, Bar, Area } from '../marks.jsx';

const run = (rows, position, mark = 'bar') => position(rows.map(d => ({ d, ...d })), { props: {}, mark });
const ends = rows => rows.map(r => [r.y1, r.y2]);

test('stack piles rows sharing x in first-seen order of the series', () => {
  const rows = run([{ x: 1, y: 2, color: 'a' }, { x: 1, y: 3, color: 'b' }, { x: 2, y: 1, color: 'a' }], stack());
  assert.deepEqual(ends(rows), [[0, 2], [2, 5], [0, 1]]);
});

test('negatives pile separately downward from 0', () => {
  const rows = run([{ x: 1, y: 2, color: 'a' }, { x: 1, y: -3, color: 'b' }, { x: 1, y: -1, color: 'c' }], stack());
  assert.deepEqual(ends(rows), [[0, 2], [0, -3], [-3, -4]]);
});

test('`group` splits series before colour does', () => {
  const rows = run([{ x: 1, y: 2, group: 'g', color: 'a' }, { x: 1, y: 3, group: 'h', color: 'a' }], stack());
  assert.deepEqual(ends(rows), [[0, 2], [2, 5]]);
});

test('offset expand normalises each pile to 1, and the y domain follows', () => {
  const rows = run([{ x: 1, y: 40, color: 'a' }, { x: 1, y: 40, color: 'b' }], stack({ offset: 'expand' }));
  assert.deepEqual(ends(rows), [[0, 0.5], [0.5, 1]]);
  let ctx;
  const Spy = defineMark('spy', { render: (r, c) => { ctx = c; return []; } });
  compile({ width: 100, height: 100, data: [{ x: 1, y: 40, c: 'a' }, { x: 1, y: 40, c: 'b' }], x: 'x', y: 'y', color: 'c',
    children: [Spy({ position: stack({ offset: 'expand' }) })] });
  assert.equal(ctx.y(1), ctx.area.top);
});

test('interval bars (a histogram) pile by their x1 when they have no x', () => {
  const rows = run([{ x1: 0, x2: 5, y: 2, color: 'a' }, { x1: 0, x2: 5, y: 3, color: 'b' }, { x1: 5, x2: 10, y: 1, color: 'a' }], stack());
  assert.deepEqual(ends(rows), [[0, 2], [2, 5], [0, 1]]);
});

test('along x stacks horizontally, grouped by y', () => {
  const rows = run([{ y: 'r', x: 2, color: 'a' }, { y: 'r', x: 3, color: 'b' }], stack({ along: 'x' }));
  assert.deepEqual(rows.map(r => [r.x1, r.x2]), [[0, 2], [2, 5]]);
});

test('for an Area, a missing (x, series) cell counts as 0', () => {
  const rows = run([{ x: 1, y: 2, color: 'a' }, { x: 1, y: 3, color: 'b' }, { x: 2, y: 1, color: 'a' }], stack(), 'area');
  const b = rows.filter(r => r.color === 'b');
  assert.deepEqual(b.map(r => [r.x, r.y1, r.y2]), [[1, 2, 5], [2, 1, 1]]);
});

test('dodge writes u1 u2 slots, and Rect narrows its band to them', () => {
  const rows = run([{ x: 'k', color: 'a' }, { x: 'k', color: 'b' }], dodge({ padding: 0 }));
  assert.deepEqual(rows.map(r => [r.u1, r.u2]), [[0, 0.5], [0.5, 1]]);
  const { scene } = compile({ width: 200, height: 100, data: [{ k: 'p', g: 'a', v: 1 }, { k: 'p', g: 'b', v: 2 }],
    x: 'k', y: 'v', color: 'g', children: [Bar({ position: dodge() })] });
  const [a, b] = scene.marks;
  assert.ok(a.x + a.width <= b.x, 'side by side');
  assert.ok(Math.abs(a.width - b.width) < 0.01);
});


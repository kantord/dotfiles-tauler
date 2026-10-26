import { test, expect } from 'vitest';
import assert from 'node:assert/strict';
import { compile } from '../core.jsx';
import { Arc } from '../marks.jsx';

const parts = [{ k: 'a', n: 1 }, { k: 'b', n: 1 }, { k: 'c', n: 2 }];
const theme = { palette: ['#111111', '#222222', '#333333'] };
const pie = props => compile({ width: 100, height: 100, theme, children: [Arc({ data: parts, value: 'n', color: 'k', ...props })] });

test('a plot with no position channel (a pie) compiles: one wedge per row, coloured by key', () => {
  const { scene } = pie();
  assert.equal(scene.marks.length, 3);
  assert.deepEqual(scene.marks.map(s => s.fill), theme.palette);
  for (const s of scene.marks) assert.equal(s.transform, 'translate(50,50)');
});

test('`value` is a field name: the wedge for n=2 is half the pie', () => {
  const [, , half] = pie().scene.marks;
  assert.match(half.d, /^M0,42A42,42,0,[01],1,0,-42L0,0Z$/);   // from 6 o'clock back to 12
});

test('`inner` makes a donut, and the key is stable', () => {
  const a = pie({ inner: 0.6 }), b = pie({ inner: 0.6 });
  assert.equal(a.key, b.key);
  assert.notEqual(a.key, pie().key);
});

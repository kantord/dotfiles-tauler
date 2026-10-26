import { test, expect } from 'vitest';
import assert from 'node:assert/strict';
import { compile, defineMark, Layer } from '../core.jsx';

// A mark that draws nothing and records what it was given.
function spy() {
  const seen = [];
  const Spy = defineMark('spy', { render: (rows, ctx) => { seen.push({ rows, ctx }); return []; } });
  return { Spy, seen };
}
const data = [{ t: 1, v: 10, lo: 5, hi: 20, s: 'a' }, { t: 3, v: 30, lo: 25, hi: 40, s: 'b' }];
const plot = (children, extra) => compile({ width: 200, height: 100, data, x: 't', y: 'v', children, ...extra });
const channelsOf = row => Object.keys(row).filter(k => k !== 'd').sort();

test('a mark inherits every channel it does not set', () => {
  const { Spy, seen } = spy();
  plot([Spy({ group: 's' })], { color: 's' });
  assert.deepEqual(channelsOf(seen[0].rows[0]), ['color', 'group', 'x', 'y']);
});

test('setting any channel of an axis drops the inherited ones of that axis only', () => {
  const { Spy, seen } = spy();
  plot([Spy({ y1: 'lo', y2: 'hi' })]);
  assert.deepEqual(channelsOf(seen[0].rows[0]), ['x', 'y1', 'y2']);
});

test('channel={null} opts out of one inherited channel', () => {
  const { Spy, seen } = spy();
  plot([Spy({ color: null })], { color: 's' });
  assert.deepEqual(channelsOf(seen[0].rows[0]), ['x', 'y']);
});

test('a Layer shares its data and channels; the per-axis drop applies to it too', () => {
  const { Spy, seen } = spy();
  plot([Layer({ data: [{ when: 2 }], x: 'when', children: [Spy({ y1: -Infinity, y2: Infinity })] })]);
  assert.deepEqual(seen[0].rows.map(r => [r.x, r.y1, r.y2]), [[2, -Infinity, Infinity]]);
});

test('a mark with no own data and only constant channels is one row and inherits nothing', () => {
  const { Spy, seen } = spy();
  plot([Spy({ y1: 15, y2: 15, x1: -Infinity, x2: Infinity })], { color: 's' });
  assert.equal(seen[0].rows.length, 1);
  assert.deepEqual(channelsOf(seen[0].rows[0]), ['x1', 'x2', 'y1', 'y2']);
});

test('±Infinity is the plot edge and never trains a domain', () => {
  const { Spy, seen } = spy();
  plot([Spy(), Spy({ y1: -Infinity, y2: Infinity })]);
  const { x, y, area } = seen[1].ctx;
  assert.equal(y(-Infinity), area.bottom);
  assert.equal(y(Infinity), area.top);
  assert.equal(x(-Infinity), area.left);
  assert.equal(y(10), area.bottom);   // domain is the data's [10, 30], not [-Inf, Inf]
});

test('a row trains its interval when it has one, else its point', () => {
  const { Spy, seen } = spy();
  plot([Spy({ position: rows => rows.map(r => ({ ...r, y1: 0, y2: 1 })) })]);
  const { y, area } = seen[0].ctx;
  assert.equal(y(1), area.top);   // the raw y = 30 did not stretch the domain
});

test('x1 and x2 train the x scale', () => {
  const { Spy, seen } = spy();
  plot([Spy({ x1: 'lo', x2: 'hi' })]);
  const { x, area } = seen[0].ctx;
  assert.equal(x(40), area.right);
});

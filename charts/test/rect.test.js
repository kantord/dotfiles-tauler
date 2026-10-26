import { test, expect } from 'vitest';
import assert from 'node:assert/strict';
import { compile, Scale } from '../core.jsx';
import * as marks from '../marks.jsx';
const { Rect, Bar, Link, Area, Text } = marks;

const W = 200, H = 100;
const scene = (children, props = {}) => compile({ width: W, height: H, ...props, children }).scene;
const only = (shapes, t) => shapes.filter(s => s.t === t);
const close = (a, b) => assert.ok(Math.abs(a - b) < 0.02, `${a} != ${b}`);

test('Rect with intervals on both axes spans them', () => {
  const s = scene([Rect({ x1: 'a', x2: 'b', y1: 'c', y2: 'e' }), Scale({ channel: 'x', domain: [0, 10] }),
    Scale({ channel: 'y', domain: [0, 10] })], { data: [{ a: 0, b: 10, c: 0, e: 10 }] });
  const [r] = only(s.marks, 'rect');
  close(r.x, 8); close(r.width, W - 16); close(r.y, 8); close(r.height, H - 16);
});

test('Rect point on a band scale fills the band, less `inset` each side', () => {
  const data = [{ k: 'a', lo: 0, hi: 5 }, { k: 'b', lo: 1, hi: 4 }];
  const [plain] = only(scene([Rect({ x: 'k', y1: 'lo', y2: 'hi' })], { data }).marks, 'rect');
  const [inset] = only(scene([Rect({ x: 'k', y1: 'lo', y2: 'hi', inset: 3 })], { data }).marks, 'rect');
  close(inset.x, plain.x + 3); close(inset.width, plain.width - 6);
});

test('Rect point on a continuous scale is centred, `width` px wide', () => {
  const data = [{ t: 5, o: 1, c: 2 }];
  const [r] = only(scene([Rect({ x: 't', y1: 'o', y2: 'c', width: 4 }), Scale({ channel: 'x', domain: [0, 10] })], { data }).marks, 'rect');
  close(r.x + r.width / 2, W / 2); close(r.width, 4);
});

test('a zero-height stroked Rect is a line across the band (box median)', () => {
  const s = scene([Rect({ x: 'k', y1: 'm', y2: 'm', fill: 'none', stroke: '#000' })], { data: [{ k: 'a', m: 3 }, { k: 'b', m: 4 }] });
  assert.equal(only(s.marks, 'line').length, 2);
  assert.equal(only(s.marks, 'rect').length, 0);
});

test('Bar over a time x works: y is the value axis, x a centred 6px bar', () => {
  const data = [0, 1, 2].map(i => ({ day: new Date(Date.UTC(2026, 9, 20 + i)), n: i + 1 }));
  const rects = only(scene([Bar({ x: 'day', y: 'n' })], { data }).marks, 'rect');
  assert.equal(rects.length, 3);
  for (const r of rects) close(r.width, 6);
});

test('a horizontal Bar takes x as its value axis and adds no `0` band', () => {
  const data = [{ name: 'a', v: 4 }, { name: 'b', v: 8 }];
  const s = scene([Bar({ x: 'v', y: 'name' })], { data });
  const rects = only(s.marks, 'rect');
  assert.equal(rects.length, 2);
  for (const r of rects) close(r.x, 8);   // every bar starts at x = 0, the left edge
  assert.ok(rects.every(r => r.height > 20));   // two bands, not three
});

test('Area y alone fills from 0; an Area range does not pull 0 into the domain', () => {
  const data = [{ t: 0, lo: 50, hi: 60, v: 55 }, { t: 1, lo: 52, hi: 62, v: 57 }];
  const [range] = only(scene([Area({ x: 't', y1: 'lo', y2: 'hi' }), Text({ x: 't', y: 'v', text: 'x' })], { data }).marks, 'path');
  assert.match(range.d, /^M8,/);
  const ys = range.d.match(/[\d.]+/g).map(Number).filter((_, i) => i % 2);
  assert.ok(Math.max(...ys) <= H - 8 + 0.01 && Math.min(...ys) >= 8 - 0.01);
  assert.ok(Math.max(...ys) - Math.min(...ys) > 50, 'the range spans the plot, not a sliver near the top');
});

test('Link reaches the plot edges at ±Infinity and uses the band centre on a band scale', () => {
  const s = scene([Link({ x1: -Infinity, x2: Infinity, y1: 2, y2: 2 }), Rect({ x: 'k', y1: 0, y2: 'v' }),
    Link({ x: 'k', y1: 0, y2: 'v', stroke: '#000' })], { data: [{ k: 'a', v: 4 }] });
  const [edge, centre] = only(s.marks, 'line');
  close(edge.x1, 8); close(edge.x2, W - 8);
  const [rect] = only(s.marks, 'rect');
  close(centre.x1, rect.x + rect.width / 2);
});

test('Text content is the `text` prop; there is no label channel and no Rule', () => {
  const s = scene([Text({ x: 'k', y: 'v', text: d => `${d.v}!` })], { data: [{ k: 'a', v: 4 }] });
  assert.equal(s.front[0].text, '4!');
  assert.equal(marks.Rule, undefined);
});

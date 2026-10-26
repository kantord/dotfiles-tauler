// Regressions from the post-merge review of the chart library.
import { test, expect } from 'vitest';
import * as d3 from 'd3';
import { compile, Axis, Grid, Scale } from '../core.jsx';
import { Rect, Link, Line } from '../marks.jsx';

test('a zero-height Rect with only a fill still shows: its line is stroked with the fill', () => {
  const { scene } = compile({ width: 200, height: 100, data: [{ t: 1, open: 5, close: 5 }, { t: 2, open: 4, close: 6 }],
    children: [Rect({ x: 't', y1: 'open', y2: 'close', fill: 'red' })] });
  const [doji] = scene.marks.filter(s => s.t === 'line');
  expect(doji).toMatchObject({ stroke: 'red', strokeWidth: 1 });
});

test('grid lines sit on the axis labels of the same channel', () => {
  const data = d3.range(10).map(i => ({ i, v: i }));   // 5 grid lines over 2 labels before the fix
  for (const height of [121, 130, 140, 182]) {
    const { scene } = compile({ width: 248, height, data, x: 'i', y: 'v',
      children: [Line(), Grid({ channel: 'y' }), Axis({ channel: 'y' })] });
    const labels = scene.back.filter(s => s.t === 'text').map(s => s.y);
    const grid = scene.back.filter(s => s.t === 'line' && s.y1 === s.y2 && s.x2 - s.x1 > 50).map(s => s.y1);
    expect(grid.length).toBeGreaterThan(0);
    expect(grid).toEqual(labels);
  }
});

test('a plot of only edge-to-edge annotations compiles', () => {
  const { scene } = compile({ width: 200, height: 100,
    children: [Link({ x1: -Infinity, x2: Infinity, y1: -Infinity, y2: -Infinity }),
      Rect({ x1: -Infinity, x2: Infinity, y1: -Infinity, y2: Infinity, fill: '#eee' })] });
  expect(scene.marks.map(s => s.t)).toEqual(['line', 'rect']);
  expect(scene.marks[1]).toMatchObject({ x: 8, y: 8, width: 184, height: 84 });
});

test('Date bands are labelled at their own precision, not as days', () => {
  const labels = hours => compile({ width: 400, height: 100, x: 't', y: 'v',
    data: hours.map(h => ({ t: new Date(Date.UTC(2026, 9, 24, h)), v: h })),
    children: [Line(), Scale({ channel: 'x', type: 'band' }), Axis({ channel: 'x' })] })
    .scene.back.filter(s => s.t === 'text').map(s => s.text);
  expect(labels([14, 15, 16])).toEqual(['02 PM', '03 PM', '04 PM']);
  expect(labels([0, 24, 48])).toEqual(['Sat 24', 'Oct 25', 'Mon 26']);   // d3 marks a Sunday as a week
});

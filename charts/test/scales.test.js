import { test, expect } from 'vitest';
import assert from 'node:assert/strict';
import * as d3 from 'd3';
import { compile, defineMark, Scale } from '../core.jsx';

function ctxOf(props, ...children) {
  let ctx;
  const Spy = defineMark('spy', { render: (rows, c) => { ctx = c; ctx.rows = rows; return []; } });
  compile({ width: 200, height: 100, ...props, children: [Spy(), ...children] });
  return ctx;
}
const order = (ctx, values) => d3.sort(values, v => ctx.x(v));

test('inference reads every value: a number before a string still makes a band', () => {
  const ctx = ctxOf({ data: [{ k: 1 }, { k: 'a' }], x: 'k' });
  assert.ok(ctx.bandwidth.x() > 0);
});

test('a band domain is sorted for numbers and Dates, first-seen for strings', () => {
  const nums = ctxOf({ data: [{ k: 3 }, { k: 1 }, { k: 2 }], x: 'k' }, Scale({ channel: 'x', type: 'band' }));
  assert.deepEqual(order(nums, [3, 1, 2]), [1, 2, 3]);
  const words = ctxOf({ data: [{ k: 'b' }, { k: 'a' }], x: 'k' });
  assert.deepEqual(order(words, ['a', 'b']), ['b', 'a']);
});

test('an explicit band domain keeps its empty bands', () => {
  const ctx = ctxOf({ data: [{ h: 3, v: 1 }], x: 'h', y: 'v' }, Scale({ channel: 'x', type: 'band', domain: d3.range(24) }));
  assert.ok(ctx.x(23) > ctx.x(3));
  assert.ok(Math.abs(ctx.bandwidth.x() - (ctx.area.width / 24) * 0.8) < 0.5);
});

test('band padding: 0.2 when the other axis is continuous, 0 when both are bands', () => {
  const bars = ctxOf({ data: [{ k: 'a', v: 1 }, { k: 'b', v: 2 }], x: 'k', y: 'v' });
  assert.ok(Math.abs(bars.bandwidth.x() - bars.area.width / 2 * 0.8) < 0.01);
  const heat = ctxOf({ data: [{ k: 'a', r: 'p' }, { k: 'b', r: 'q' }], x: 'k', y: 'r' });
  assert.equal(heat.bandwidth.x(), heat.area.width / 2);
  assert.ok(heat.y('p') < heat.y('q'), 'a y band runs top-down');
});

test('JSON has no Dates: type="time" coerces ISO strings; without it they are bands', () => {
  const data = [{ t: '2026-10-24T14:00:00Z' }, { t: '2026-10-24T15:00:00Z' }];
  const time = ctxOf({ data, x: 't' }, Scale({ channel: 'x', type: 'time' }));
  assert.ok(time.rows[0].x instanceof Date);
  assert.equal(time.bandwidth.x(), 0);
  assert.equal(time.x(new Date('2026-10-24T14:00:00Z')), time.area.left);
  assert.ok(ctxOf({ data, x: 't' }).bandwidth.x() > 0);
});

test('nice applies to time and log unless a domain is set', () => {
  const t = ctxOf({ data: [{ t: new Date(Date.UTC(2026, 0, 1, 0, 7)) }, { t: new Date(Date.UTC(2026, 0, 1, 0, 53)) }], x: 't' });
  assert.equal(t.x(new Date(Date.UTC(2026, 0, 1, 0, 5))), t.area.left);   // 00:07 rounds down to 00:05
  const log = ctxOf({ data: [{ v: 3 }, { v: 700 }], y: 'v' }, Scale({ channel: 'y', type: 'log' }));
  assert.equal(log.y(1), log.area.bottom);
  assert.equal(log.y(1000), log.area.top);
});

test('a log scale with a value <= 0 throws, naming the channel', () => {
  assert.throws(() => ctxOf({ data: [{ v: 0 }, { v: 10 }], y: 'v' }, Scale({ channel: 'y', type: 'log' })), /Scale y.*log/);
});

test('numeric colour is sequential; its low end stays visible against the background', () => {
  const theme = { line: '#000000', palette: ['#ffffff'] };
  const ctx = ctxOf({ theme, data: [{ n: 0 }, { n: 10 }], color: 'n' });
  assert.equal(d3.rgb(ctx.color(10)).formatHex(), '#ffffff');
  assert.equal(d3.rgb(ctx.color(0)).formatHex(), d3.rgb(d3.interpolateRgb('#000000', '#ffffff')(0.15)).formatHex());
});

test('a 3-stop colour range is diverging around the middle of its domain', () => {
  const ctx = ctxOf({ data: [{ n: -5 }, { n: 20 }], color: 'n' },
    Scale({ channel: 'color', domain: [-10, 0, 10], range: ['#0000ff', '#ffffff', '#ff0000'] }));
  assert.equal(d3.rgb(ctx.color(0)).formatHex(), '#ffffff');
  assert.equal(d3.rgb(ctx.color(10)).formatHex(), '#ff0000');
});

test('string colour is ordinal, keys in first-seen order over the palette', () => {
  const ctx = ctxOf({ theme: { palette: ['#111111', '#222222'] }, data: [{ s: 'b' }, { s: 'a' }], color: 's' });
  assert.deepEqual(ctx.color.domain(), ['b', 'a']);
  assert.equal(ctx.color('a'), '#222222');
});

test('nice never cuts data off (d3 shrinks a domain whose span is at float precision)', () => {
  const ctx = ctxOf({ data: [{ k: -999999.9999999983 }, { k: -999999.9999999979 }], x: 'k' });
  expect(ctx.x(-999999.9999999979)).toBeLessThanOrEqual(ctx.area.right);
});

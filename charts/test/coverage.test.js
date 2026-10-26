// SPEC section 7: the charts in the coverage table that the grammar suite (grammar/) does not
// draw compile to the expected number of shapes, and to the same key twice.
import { test, expect } from 'vitest';
import * as d3 from 'd3';
import { compile, Scale, stack } from '../core.jsx';
import { Line, Area, Rect, Bar, Dot, Link, Text } from '../marks.jsx';
import { bin2d, kde, cumsum } from '../stats.jsx';

const t = i => new Date(Date.UTC(2026, 9, 24, 14, i));
const ts = d3.range(12).map(i => ({ t: t(i), v: 40 + 10 * Math.sin(i), lo: 30 + i, hi: 50 + i, mean: 40 + i }));
const cats = [{ cat: 'a', g: 'x', v: 3 }, { cat: 'a', g: 'y', v: 2 }, { cat: 'b', g: 'x', v: 5 }, { cat: 'b', g: 'y', v: -1 }];
const samples = d3.range(40).map(i => ({ latency: (i * 37) % 23, g: i % 3 ? 'p' : 'q', a: i % 7, b: (i * 5) % 11 }));
const shapes = scene => scene.marks.length + scene.front.length;

const CHARTS = {
  'area range + mean': [{ data: ts, x: 't' }, [Area({ y1: 'lo', y2: 'hi', fillOpacity: 0.2 }), Line({ y: 'mean' })], 2],
  'stacked area': [{ data: cats, x: 'cat', y: 'v', color: 'g' }, [Area({ position: stack() })], 2],
  density: [{ data: kde(samples, { value: 'latency', points: 30 }) }, [Area({ x: 'x', y: 'density' })], 1],
  '2D histogram': [{ data: bin2d(samples, { x: 'a', y: 'b', thresholds: 3 }) }, [Rect({ x1: 'x0', x2: 'x1', y1: 'y0', y2: 'y1', color: 'count' })], null],
  heatmap: [{ data: d3.range(24).map(h => ({ hour: h, day: h % 2 ? 'mon' : 'tue', n: h })) },
    [Scale({ channel: 'x', type: 'band', domain: d3.range(24) }), Rect({ x: 'hour', y: 'day', color: 'n' })], 24],
  'lollipop / error bars': [{ data: cats.slice(0, 2), x: 'cat', y: 'v' }, [Link({ x1: 'cat', x2: 'cat', y1: 0, y2: 'v' }), Dot()], 4],
  candlestick: [{ data: ts.map((d, i) => ({ ...d, low: d.lo - 3, high: d.hi + 3, open: d.lo, close: i === 3 ? d.lo : d.hi })) }, [
    Link({ x1: 't', x2: 't', y1: 'low', y2: 'high' }), Rect({ x: 't', y1: 'open', y2: 'close', width: 5, fill: d => (d.close > d.open ? 'green' : 'red') })], 24],
  Gantt: [{ data: [{ task: 'a', start: t(0), end: t(30) }, { task: 'b', start: t(10), end: t(50) }] },
    [Scale({ channel: 'x', type: 'time' }), Rect({ x1: 'start', x2: 'end', y: 'task' })], 2],
  waterfall: [{ data: cumsum([{ step: 'a', v: 5 }, { step: 'b', v: -2 }, { step: 'c', v: 4 }], { value: 'v' }) }, [Rect({ x: 'step', y1: 'from', y2: 'to' })], 3],
  bullet: [{ data: [{ m: 'cpu', range: 100, actual: 70 }], x: 'm' }, [Rect({ y1: 0, y2: 'range', inset: 0 }), Rect({ y1: 0, y2: 'actual', inset: 8 })], 2],
  'slope chart': [{ data: [{ year: 2020, v: 1, name: 'a' }, { year: 2024, v: 3, name: 'a' }, { year: 2020, v: 2, name: 'b' }, { year: 2024, v: 1, name: 'b' }] },
    [Scale({ channel: 'x', type: 'band' }), Line({ x: 'year', y: 'v', group: 'name' })], 2],
  'shaded region / threshold': [{ data: ts, x: 't', y: 'v' }, [Line(), Rect({ x1: t(2), x2: t(4), y1: -Infinity, y2: Infinity }),
    Link({ x1: -Infinity, x2: Infinity, y1: 45, y2: 45 })], 3],
  'connected scatter': [{ data: samples.slice(0, 5), x: 'a', y: 'b' }, [Line({ sort: false }), Dot()], 6],
  'value labels on bars': [{ data: cats.slice(0, 2), x: 'cat', y: 'v' }, [Bar(), Text({ y: 'v', text: d => d.v, dy: d => (d.v < 0 ? 12 : -4) })], 4],
  'streamgraph / Likert': [{ data: d3.stack().keys(['p', 'q']).offset(d3.stackOffsetWiggle)([{ i: 0, p: 1, q: 2 }, { i: 1, p: 2, q: 1 }])
    .flatMap(s => s.map((p, i) => ({ x: i, y1: p[0], y2: p[1], s: s.key }))) }, [Area({ x: 'x', y1: 'y1', y2: 'y2', color: 's' })], 2],
};

// Geometry, not just counts: a doji among the candles. (Stacks and box plots: grammar/.)
const SNAPSHOT = new Set(['candlestick']);

for (const [name, [props, children, count]] of Object.entries(CHARTS)) {
  test(name, () => {
    const make = () => compile({ width: 248, height: 110, ...props, children });
    const first = make();
    if (count != null) expect(shapes(first.scene)).toBe(count);
    else expect(shapes(first.scene)).toBeGreaterThan(0);
    expect(make().key).toBe(first.key);
    if (SNAPSHOT.has(name)) expect(first.scene.marks).toMatchSnapshot();
  });
}

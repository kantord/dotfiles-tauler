// Properties: invariants that must hold for any data, checked on generated inputs (fast-check).
// A failure prints the shrunk input; turn it into an ordinary regression test.
import { test, expect } from 'vitest';
import fc from 'fast-check';
import * as d3 from 'd3';
import { compile, defineMark, stack, dodge, hash53, Scale } from '../core.jsx';
import { Line, Area, Bar, Dot, Text } from '../marks.jsx';
import { bin, ecdf, kde, boxStats } from '../stats.jsx';

// A fixed seed keeps runs reproducible; FC_SEED=<n> FC_RUNS=2000 pnpm test sweeps new inputs.
fc.configureGlobal({ seed: Number(process.env.FC_SEED ?? 20261027), numRuns: Number(process.env.FC_RUNS ?? 100) });

// Subnormal numbers (below 2.2e-308) break d3.bin's nice() in d3 7.9.0: it drops values or
// throws. No status-bar data has them, so they are generated as 0.
const value = fc.double({ min: -1e6, max: 1e6, noNaN: true, noDefaultInfinity: true })
  .map(v => (Math.abs(v) < 2.3e-308 ? 0 : v));
const maybe = arb => fc.option(arb, { nil: null, freq: 8 });
const points = fc.array(fc.record({ x: value, y: maybe(value) }), { maxLength: 30 });
const series = fc.constantFrom('a', 'b', 'c');

function spy() {
  const seen = [];
  return { seen, Spy: defineMark('spy', { render: (rows, ctx) => { seen.push({ rows, ctx }); return []; } }) };
}
const numbersIn = shape => Object.entries(shape).filter(([k, v]) => typeof v === 'number' && k !== 'r');
const plot = (data, children) => compile({ width: 200, height: 100, data, x: 'x', y: 'y', children });

test('compile never throws, and no shape has a NaN or infinite coordinate', () => {
  fc.assert(fc.property(points, data => {
    const { scene } = plot(data, [Area(), Line(), Bar(), Dot(), Text({ text: 'x' })]);
    for (const shape of [...scene.marks, ...scene.front, ...scene.back]) {
      for (const [, v] of numbersIn(shape)) expect(Number.isFinite(v)).toBe(true);
    }
  }));
});

test('the same props always give the same key', () => {
  fc.assert(fc.property(points, data => {
    expect(plot(data, [Line(), Dot()]).key).toBe(plot(data, [Line(), Dot()]).key);
  }));
});

test('every dot sits inside the plot area, and a bigger y is never lower', () => {
  fc.assert(fc.property(points, data => {
    const { seen, Spy } = spy();
    plot(data, [Spy()]);
    const [{ rows, ctx } = {}] = seen;
    if (!ctx?.y || !rows.length) return;
    const placed = rows.filter(r => r.y != null).map(r => ({ y: r.y, px: ctx.y(r.y), x: ctx.x(r.x) }));
    for (const p of placed) {
      expect(p.px).toBeGreaterThanOrEqual(ctx.area.top - 1e-6);
      expect(p.px).toBeLessThanOrEqual(ctx.area.bottom + 1e-6);
      expect(p.x).toBeGreaterThanOrEqual(ctx.area.left - 1e-6);
      expect(p.x).toBeLessThanOrEqual(ctx.area.right + 1e-6);
    }
    const sorted = d3.sort(placed, p => p.y);
    for (let i = 1; i < sorted.length; i++) expect(sorted[i].px).toBeLessThanOrEqual(sorted[i - 1].px + 1e-6);
  }));
});

const stackRows = fc.array(fc.record({ x: fc.integer({ min: 0, max: 3 }), y: value, color: series }), { maxLength: 24 })
  .map(rows => rows.map(d => ({ d, ...d })));

test('stack: piles are contiguous, positives sum up and negatives sum down from 0', () => {
  fc.assert(fc.property(stackRows, rows => {
    stack()(rows, { mark: 'bar' });
    for (const pile of d3.group(rows, r => r.x).values()) {
      const up = pile.filter(r => r.y >= 0), down = pile.filter(r => r.y < 0);
      for (const part of [up, down]) {
        const sorted = d3.sort(part, r => Math.abs(r.y1), r => Math.abs(r.y2));
        for (let i = 1; i < sorted.length; i++) expect(sorted[i].y1).toBeCloseTo(sorted[i - 1].y2, 6);
      }
      expect(d3.max(up, r => r.y2) ?? 0).toBeCloseTo(d3.sum(up, r => r.y), 4);
      expect(d3.min(down, r => r.y2) ?? 0).toBeCloseTo(d3.sum(down, r => r.y), 4);
    }
  }));
});

test('stack expand: no pile reaches past 1 either way', () => {
  fc.assert(fc.property(stackRows, rows => {
    stack({ offset: 'expand' })(rows, { mark: 'bar' });
    for (const r of rows) expect(Math.abs(r.y2)).toBeLessThanOrEqual(1 + 1e-9);
  }));
});

test('dodge: slots are inside the band and never overlap', () => {
  fc.assert(fc.property(stackRows, fc.double({ min: 0, max: 0.9, noNaN: true }), (rows, padding) => {
    dodge({ padding })(rows);
    for (const band of d3.group(rows, r => r.x).values()) {   // each band shares itself among the series in it
      const slots = d3.sort(new Map(band.map(r => [r.color, [r.u1, r.u2]])).values(), s => s[0]);
      for (const [u1, u2] of slots) { expect(u1).toBeGreaterThanOrEqual(0); expect(u2).toBeLessThanOrEqual(1 + 1e-9); expect(u2).toBeGreaterThan(u1); }
      for (let i = 1; i < slots.length; i++) expect(slots[i][0]).toBeGreaterThanOrEqual(slots[i - 1][1] - 1e-9);
    }
  }));
});

const values = fc.array(value, { minLength: 1, maxLength: 60 }).map(v => v.map(x => ({ v: x })));

test('bin: every value is counted once, in contiguous bins', () => {
  fc.assert(fc.property(values, fc.integer({ min: 1, max: 20 }), (data, thresholds) => {
    const bins = bin(data, { value: 'v', thresholds });
    expect(d3.sum(bins, b => b.count)).toBe(data.length);
    for (let i = 1; i < bins.length; i++) expect(bins[i].x0).toBe(bins[i - 1].x1);
  }));
});

test('ecdf climbs to 1 in x order; kde is never negative; box statistics are ordered', () => {
  fc.assert(fc.property(values, data => {
    const steps = ecdf(data, { value: 'v' });
    expect(steps.at(-1).p).toBe(1);
    for (let i = 1; i < steps.length; i++) { expect(steps[i].x).toBeGreaterThanOrEqual(steps[i - 1].x); expect(steps[i].p).toBeGreaterThan(steps[i - 1].p); }
    for (const p of kde(data, { value: 'v', points: 20 })) { expect(p.density).toBeGreaterThanOrEqual(0); expect(Number.isFinite(p.density)).toBe(true); }
    const [box] = boxStats(data, { by: () => 'all', value: 'v' });
    expect([box.lo, box.q1, box.med, box.q3, box.hi]).toEqual([box.lo, box.q1, box.med, box.q3, box.hi].sort((a, b) => a - b));
  }));
});

const circles = scene => scene.marks.filter(s => s.t === 'circle').map(s => `${s.cx},${s.cy}`).sort();

test('shuffling the rows draws the same dots', () => {
  fc.assert(fc.property(points.chain(data => fc.tuple(fc.constant(data), fc.shuffledSubarray(data, { minLength: data.length }))), ([data, shuffled]) => {
    expect(circles(plot(shuffled, [Dot()]).scene)).toEqual(circles(plot(data, [Dot()]).scene));
  }));
});

test('scaling the data and its domain together leaves the pixels where they were', () => {
  const unit = fc.array(fc.record({ x: fc.double({ min: 0, max: 1, noNaN: true }), y: fc.double({ min: 0, max: 1, noNaN: true }) }), { minLength: 1, maxLength: 20 });
  fc.assert(fc.property(unit, fc.constantFrom(2, 10, 1000), (data, k) => {
    const draw = (rows, top) => compile({ width: 200, height: 100, data: rows, x: 'x', y: 'y',
      children: [Scale({ channel: 'x', domain: [0, top] }), Scale({ channel: 'y', domain: [0, top] }), Dot()] }).scene;
    const a = draw(data, 1).marks, b = draw(data.map(d => ({ x: d.x * k, y: d.y * k })), k).marks;
    a.forEach((s, i) => { expect(b[i].cx).toBeCloseTo(s.cx, 1); expect(b[i].cy).toBeCloseTo(s.cy, 1); });
  }));
});


// Cost budget helper (GAPS 0.3 is done; SPEC 10 records the Node/QuickJS factor). Test code only:
// it reads the clock, which the library never may.
import { compile, Axis, Grid } from '../core.jsx';
import { Area, Line } from '../marks.jsx';

export const BUDGET = 0.25;   // a new stage may cost this fraction of the reference plot

// The reference plot of SPEC 10: Grid + Area + Line + two Axes, time x, `rows` rows.
export const referenceProps = (rows = 500) => ({
  width: 248, height: 110, x: 't', y: 'cpu', y1: 'mem',
  data: Array.from({ length: rows }, (_, i) => ({ t: new Date(Date.UTC(2026, 9, 24, 14, i)), cpu: 30 + 20 * Math.sin(i / 6), mem: 55 + 5 * Math.sin(i / 20) })),
  children: [Grid({ channel: 'y' }), Area({ y: 'mem', y1: undefined }), Line({ y: 'cpu' }), Axis({ channel: 'x' }), Axis({ channel: 'y' })],
});

const time = fn => { const t = performance.now(); fn(); return performance.now() - t; };
const middle = times => times.sort((a, b) => a - b)[times.length >> 1];

// Median milliseconds of `runs` calls, after two warm-up calls.
export function median(fn, runs = 15) {
  fn(); fn();
  return middle(Array.from({ length: runs }, () => time(fn)));
}

// Load only ever inflates a time, so the gates below take the smallest of a few alternating-loop
// ratios (`ATTEMPTS`), each the lower of the ratio of medians and the ratio of fastest samples; a
// real slowdown shows in every attempt and both ratios.
const ATTEMPTS = 3;
const lowest = measure => Math.min(...Array.from({ length: ATTEMPTS }, measure));

// `a` as a multiple of `b`: the two are timed alternately in one loop (median of `runs`), so
// warm-up and machine load affect both alike.
export function ratioOf(a, b, { runs = 31 } = {}) {
  for (let i = 0; i < 3; i++) { a(); b(); }
  return lowest(() => {
    const as = [], bs = [];
    for (let i = 0; i < runs; i++) { as.push(time(a)); bs.push(time(b)); }
    return Math.min(middle(as) / middle(bs), Math.min(...as) / Math.min(...bs));
  });
}

// `stage` as a fraction of the reference plot.
export function costOf(stage, { rows = 500, runs = 31 } = {}) {
  const props = referenceProps(rows);
  return ratioOf(stage, () => compile(props), { runs });
}

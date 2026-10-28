// Recipe: a violin. `kde` per group, then an ordinary horizontal `Area`; no mark of its own.
// The groups sit on a numeric x scale at 1, 2, 3..., each shape mirrored about its centre; label the
// axis with `<Axis channel="x" ticks={[1, 2, 3]} format={i => names[i - 1]}/>`:
//
//   const { rows, names } = violin(samples, { by: 'group', value: 'ms' });
//   <Plot data={rows} y="y" x1="x1" x2="x2" group="key"><Area/><Axis channel="x" ticks={...} .../></Plot>
//
// (Dodge's `u1/u2` do not apply to `Area`: a violin's half-width differs row by row, so the slot
// is not a constant of the series, and a band scale would put the category labels in for free
// only at the price of a new `Area` branch. Not worth it for one chart.)
import * as d3 from 'd3';
import { kde } from '../stats.jsx';
import { read } from '../fields.jsx';

// Rows { key, y, x1, x2 } for the groups of `by` in first-seen order, `width` (default 0.4 of the
// distance between two groups) the half-width of the widest density, shared by all groups.
export function violin(data, { by, value, width = 0.4, points = 40 }) {
  const groups = d3.groups(data, read(by)), curves = groups.map(([, rows]) => kde(rows, { value, points })), peak = d3.max(curves.flat(), c => c.density);
  return {
    names: groups.map(([key]) => key),
    rows: groups.flatMap(([key], k) => curves[k].map(c => ({ key, y: c.x, x1: k + 1 - (width * c.density) / peak, x2: k + 1 + (width * c.density) / peak }))),
  };
}

// Statistics as plain `data -> data` functions, called in the layout before <Plot> (SPEC 6).
// They run on the loop every Tick, so keep windows small. `value` (and `x`, `y`, `by`) is a
// field name or a function of the datum, like a channel.
import * as d3 from 'd3';
import { read, num } from './fields.jsx';


// Equal-width bins: [{ x0, x1, count }]. `thresholds` is a count, or the bin edges: then the
// bins are exactly those edges (d3 alone would start the first at the data's minimum and give
// a maximum that sits on an edge a bin of its own), and values outside them are dropped.
export function bin(data, { value, thresholds = 10 }) {
  const binner = d3.bin().value(read(value));
  const values = data.map(read(value)).filter(v => v != null && !Number.isNaN(+v));
  if (thresholds === 1) {   // d3 7.9.0 gives this one bin infinite edges
    return values.length ? [{ x0: d3.min(values), x1: d3.max(values), count: values.length }] : [];
  }
  // Dates: a count becomes round time edges (every 5 minutes, every day...), kept as Dates.
  if (!Array.isArray(thresholds) && values[0] instanceof Date) {
    const time = d3.scaleUtc().domain(d3.extent(values)).nice(thresholds), [low, high] = time.domain();
    thresholds = d3.sort(new Set([+low, ...time.ticks(thresholds).map(Number), +high])).map(t => new Date(t));
  }
  if (Array.isArray(thresholds)) binner.domain([thresholds[0], thresholds.at(-1)]).thresholds(thresholds.slice(1, -1));
  else binner.thresholds(thresholds);
  return binner(data).map(b => ({ x0: b.x0, x1: b.x1, count: b.length }));
}

// A 2D histogram for <Rect x1 x2 y1 y2 color="count">: non-empty cells only,
// [{ x0, x1, y0, y1, count }].
export function bin2d(data, { x, y, thresholds = 10 }) {
  const getY = read(y);
  const edges = d3.bin().value(getY).thresholds(thresholds)(data).map(b => b.x0);
  const [, yMax] = d3.extent(data, getY);
  const columns = d3.bin().value(read(x)).thresholds(thresholds)(data);
  return columns.flatMap(column => d3.bin().value(getY).domain([edges[0], yMax]).thresholds(edges.slice(1))(column)
    .filter(cell => cell.length)
    .map(cell => ({ x0: column.x0, x1: column.x1, y0: cell.x0, y1: cell.x1, count: cell.length })));
}

// One row per key: [{ key, value }]; `reduce` defaults to the count.
export function group(data, by, reduce = rows => rows.length) {
  return d3.rollups(data, reduce, read(by)).map(([key, value]) => ({ key, value }));
}

// Runs `fn(series rows) -> one output (or null: dropped) per row` within each series (`by`, a
// field or function; all the data when absent). Rows keep their input order. Input must already
// be ordered within each series: nothing here sorts.
function perSeries(data, by, fn) {
  const out = new Array(data.length);
  const groups = by == null ? [data.map((_, i) => i)] : [...d3.group(data.map((_, i) => i), i => read(by)(data[i])).values()];
  for (const indices of groups) fn(indices.map(i => data[i]), indices).forEach((row, k) => { out[indices[k]] = row; });
  return out.filter(row => row != null);
}

// Each datum with the `reduce` (the mean) over the trailing `window` values of its series, in
// `as`. `reduce` may be an object `{ name: reducer }`: one output per name. `partial: false`
// drops rows whose window is not yet full.
export function rolling(data, { by, value, window = 5, reduce = d3.mean, as = 'rolling', partial = true }) {
  const reducers = typeof reduce === 'function' ? { [as]: reduce } : reduce;
  return perSeries(data, by, rows => {
    const values = rows.map(read(value));
    return rows.map((d, i) => {
      if (!partial && i < window - 1) return null;
      const slice = values.slice(Math.max(0, i - window + 1), i + 1);
      return { ...d, ...Object.fromEntries(Object.entries(reducers).map(([name, fn]) => [name, fn(slice)])) };
    });
  });
}

// Each datum with the running total of its series before (`from`) and after (`to`) it: a
// waterfall's steps. A missing value (null, NaN) adds nothing: its row has `from` = `to`.
export function cumsum(data, { by, value }) {
  return perSeries(data, by, rows => {
    let total = 0;
    return rows.map((d, i) => {
      const v = num(read(value)(d, i, rows)), from = total;
      if (Number.isFinite(v)) total += v;
      return { ...d, from, to: total };
    });
  });
}

// Each datum with `as` set to its value over the first value of its series (1 at the start): an
// index chart.
export function normalize(data, { by, value, as = 'normalized' }) {
  return perSeries(data, by, rows => rows.map(d => ({ ...d, [as]: read(value)(d) / read(value)(rows[0]) })));
}

// The final row of each series.
export const last = (data, { by }) => perSeries(data, by, rows => rows.map((d, i) => i === rows.length - 1 ? d : null));

// Wide rows to long rows: one row per key in `keys`, the key in `key` and its value in `value`.
export function fold(data, { keys, key = 'key', value = 'value' }) {
  return data.flatMap(d => {
    const rest = Object.fromEntries(Object.entries(d).filter(([k]) => !keys.includes(k)));
    return keys.map(k => ({ ...rest, [key]: k, [value]: d[k] }));
  });
}

// One row per `by`: `{ key, ...named outputs }`, each output a function of the group's rows.
export function groupBy(data, { by, outputs }) {
  return d3.groups(data, read(by)).map(([key, rows]) =>
    ({ key, ...Object.fromEntries(Object.entries(outputs).map(([name, fn]) => [name, fn(rows)])) }));
}

// Each datum with `as` set to its rank by `value` (1 is the smallest, or the largest when
// `descending`; ties, Dates included, share the lower rank; a missing or NaN value has none: null).
// Rows keep their order.
export function rank(data, { value, as = 'rank', descending = false }) {
  const keys = data.map(d => { const v = read(value)(d); return v == null || Number.isNaN(v) ? null : v instanceof Date ? +v : v; });
  const sorted = d3.sort(keys.filter(k => k !== null), descending ? d3.descending : d3.ascending), first = new Map();
  sorted.forEach((k, i) => { if (!first.has(k)) first.set(k, i + 1); });
  return data.map((d, i) => ({ ...d, [as]: keys[i] === null ? null : first.get(keys[i]) }));
}

// A Gaussian kernel density estimate at `points` evenly spaced xs: [{ x, density }].
// `bandwidth` defaults to Silverman's rule. No finite value, or a `bandwidth` that is not above 0,
// give []; one point is the density at the middle of the range.
export function kde(data, { value, bandwidth, points = 50 }) {
  const values = data.map(read(value)).filter(Number.isFinite);
  if (!values.length || !(bandwidth == null || bandwidth > 0)) return [];
  const bw = bandwidth ?? 1.06 * (d3.deviation(values) || 1) * values.length ** -0.2;
  const [lo, hi] = d3.extent(values);
  const k = 1 / (Math.sqrt(2 * Math.PI) * bw * values.length);
  return d3.range(points).map(i => {
    const x = lo - 3 * bw + (points > 1 ? i / (points - 1) : 0.5) * (hi - lo + 6 * bw);
    return { x, density: k * d3.sum(values, v => Math.exp(-0.5 * ((x - v) / bw) ** 2)) };
  });
}

// The empirical CDF, a step per value: [{ x, p }] sorted by x. Draw with <Line curve="step-after">.
export function ecdf(data, { value }) {
  const values = d3.sort(data.map(read(value)).filter(Number.isFinite));
  return values.map((x, i) => ({ x, p: (i + 1) / values.length }));
}

// Tukey box statistics per `by`: [{ key, lo, q1, med, q3, hi, outliers }]. Whiskers end at the
// furthest value within 1.5 IQR; `outliers` holds the data beyond them. A group with no finite
// value has no row.
export function boxStats(data, { by, value }) {
  const get = read(value);
  return d3.groups(data, read(by)).flatMap(([key, rows]) => {
    const values = d3.sort(rows.map(get).filter(Number.isFinite));
    if (!values.length) return [];
    const [q1, med, q3] = [0.25, 0.5, 0.75].map(p => d3.quantileSorted(values, p));
    const reach = 1.5 * (q3 - q1);
    const inside = values.filter(v => v >= q1 - reach && v <= q3 + reach);
    // The hinges bound the whiskers (ggplot2 does the same): with every value beyond a hinge
    // an outlier, the whisker stops at the hinge rather than inside the box.
    return [{ key, lo: Math.min(q1, inside[0]), q1, med, q3, hi: Math.max(q3, inside.at(-1)),
      outliers: rows.filter(d => get(d) < inside[0] || get(d) > inside.at(-1)) }];
  });
}
export { treemap, tree, pack, partition } from './layouts.jsx';
export { flow } from './flow.jsx';
export { orderBy, dateRange } from './domains.jsx';
export { hexbin } from './hexbin.jsx';
export { regress, difference, waterfall } from './composites.jsx';
export { delaunay, contours, densityContours } from './spatial.jsx';

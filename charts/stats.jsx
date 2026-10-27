// Statistics as plain `data -> data` functions, called in the layout before <Plot> (SPEC 6).
// They run on the loop every Tick, so keep windows small. `value` (and `x`, `y`, `by`) is a
// field name or a function of the datum, like a channel.
import * as d3 from 'd3';

const read = a => typeof a === 'function' ? a : d => d[a];

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
    const time = d3.scaleTime().domain(d3.extent(values)).nice(thresholds), [low, high] = time.domain();
    thresholds = d3.sort(new Set([+low, ...time.ticks(thresholds).map(Number), +high])).map(t => new Date(t));
  }
  if (Array.isArray(thresholds)) binner.domain([thresholds[0], thresholds.at(-1)]).thresholds(thresholds.slice(1, -1));
  else binner.thresholds(thresholds);
  return binner(data).map(b => ({ x0: b.x0, x1: b.x1, count: b.length }));
}

// A 2D histogram for <Rect x1 x2 y1 y2 color="count">: non-empty cells only.
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

// Each datum with `as` set to `reduce` (the mean) over the trailing `window` values.
export function rolling(data, { value, window = 5, reduce = d3.mean, as = 'rolling' }) {
  const values = data.map(read(value));
  return data.map((d, i) => ({ ...d, [as]: reduce(values.slice(Math.max(0, i - window + 1), i + 1)) }));
}

// Each datum with the running total before (`from`) and after (`to`) it: a waterfall's steps.
export function cumsum(data, { value }) {
  let total = 0;
  return data.map((d, i, all) => ({ ...d, from: total, to: (total += read(value)(d, i, all)) }));
}

// A Gaussian kernel density estimate at `points` evenly spaced xs: [{ x, density }].
// `bandwidth` defaults to Silverman's rule.
export function kde(data, { value, bandwidth, points = 50 }) {
  const values = data.map(read(value)).filter(Number.isFinite);
  const bw = bandwidth ?? 1.06 * (d3.deviation(values) || 1) * values.length ** -0.2;
  const [lo, hi] = d3.extent(values);
  const k = 1 / (Math.sqrt(2 * Math.PI) * bw * values.length);
  return d3.range(points).map(i => {
    const x = lo - 3 * bw + (i / (points - 1)) * (hi - lo + 6 * bw);
    return { x, density: k * d3.sum(values, v => Math.exp(-0.5 * ((x - v) / bw) ** 2)) };
  });
}

// The empirical CDF, a step per value: [{ x, p }] sorted by x. Draw with <Line curve="step-after">.
export function ecdf(data, { value }) {
  const values = d3.sort(data.map(read(value)).filter(Number.isFinite));
  return values.map((x, i) => ({ x, p: (i + 1) / values.length }));
}

// Tukey box statistics per `by`: [{ key, lo, q1, med, q3, hi, outliers }]. Whiskers end at the
// furthest value within 1.5 IQR; `outliers` holds the data beyond them.
export function boxStats(data, { by, value }) {
  const get = read(value);
  return d3.groups(data, read(by)).map(([key, rows]) => {
    const values = d3.sort(rows.map(get).filter(Number.isFinite));
    const [q1, med, q3] = [0.25, 0.5, 0.75].map(p => d3.quantileSorted(values, p));
    const reach = 1.5 * (q3 - q1);
    const inside = values.filter(v => v >= q1 - reach && v <= q3 + reach);
    // The hinges bound the whiskers (ggplot2 does the same): with every value beyond a hinge
    // an outlier, the whisker stops at the hinge rather than inside the box.
    return { key, lo: Math.min(q1, inside[0]), q1, med, q3, hi: Math.max(q3, inside.at(-1)),
      outliers: rows.filter(d => get(d) < inside[0] || get(d) > inside.at(-1)) };
  });
}

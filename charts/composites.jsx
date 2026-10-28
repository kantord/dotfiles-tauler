// Statistics that make one derived chart out of ordinary marks (SPEC 6): a fitted line with a
// band, the gap between two series, a staircase of running totals.
import * as d3 from 'd3';
import { cumsum } from './stats.jsx';
import { read, num } from './fields.jsx';


// Least-squares line through (x, y): `points` evenly spaced rows [{ x, y, y1, y2 }] from the
// smallest x to the largest, `y1`..`y2` the band of the fitted mean, `z` standard errors wide
// (default 1.96, the normal approximation: a little narrow for fewer than about 30 rows). Draw it
// with `<Area y1="y1" y2="y2"/>` and `<Line y="y"/>`. Rows with a non-finite x or y are dropped; fewer
// than three rows, or all x equal, give [].
export function regress(data, { x, y, points = 24, z = 1.96 }) {
  const rows = data.map(d => [num(read(x)(d)), num(read(y)(d))]).filter(p => p.every(Number.isFinite));
  const n = rows.length, [mx, my] = [d3.mean(rows, p => p[0]), d3.mean(rows, p => p[1])];
  const sxx = d3.sum(rows, p => (p[0] - mx) ** 2);
  if (n < 3 || !sxx) return [];
  const slope = d3.sum(rows, p => (p[0] - mx) * (p[1] - my)) / sxx, intercept = my - slope * mx;
  const s = Math.sqrt(d3.sum(rows, p => (p[1] - intercept - slope * p[0]) ** 2) / (n - 2));
  const [lo, hi] = d3.extent(rows, p => p[0]);
  return d3.range(points).map(i => {
    const at = lo + ((hi - lo) * i) / (points - 1), fit = intercept + slope * at;
    const half = z * s * Math.sqrt(1 / n + (at - mx) ** 2 / sxx);
    return { x: at, y: fit, y1: fit - half, y2: fit + half };
  });
}

// The gap between series `a` and `b` of the rows' series field `by`, at the x both have, in
// increasing x: [{ x, y1, y2, sign, run }], `y1` the value of `a`, `y2` of `b`, `sign` the sign of
// y1 - y2 and `run` which stretch of one sign the row is in. Where the series cross, linear
// interpolation adds a row with y1 = y2, in both stretches, so the two fills meet. Draw each sign
// with an `<Area y1="y1" y2="y2" group="run">` over that sign's rows.
export function difference(data, { x, y, by, a, b }) {
  const [getX, getY, getBy] = [read(x), read(y), read(by)];
  const side = name => new Map(data.filter(d => getBy(d) === name).map(d => [+getX(d), +getY(d)]));
  const [left, right] = [side(a), side(b)];
  const xs = d3.sort([...left.keys()].filter(k => right.has(k)));
  const rows = [];
  let run = 0, sign = 0;
  const push = (at, y1, y2, s) => rows.push({ x: at, y1, y2, sign: s, run });
  xs.forEach((at, i) => {
    const [y1, y2] = [left.get(at), right.get(at)], s = Math.sign(y1 - y2);
    if (sign && s && s !== sign) {   // crossed between the previous x and this one
      const [p, q] = [xs[i - 1], at], [g0, g1] = [left.get(p) - right.get(p), y1 - y2], t = g0 / (g0 - g1);
      const cx = p + t * (q - p), cy = left.get(p) + t * (y1 - left.get(p));
      push(cx, cy, cy, sign); run++; push(cx, cy, cy, s);
    }
    push(at, y1, y2, s || sign);
    sign = s || sign;
  });
  return rows;
}

// Running totals of `value` for <Rect y1="from" y2="to">: each row keeps its fields and gains `from`,
// `to` and `delta` (0 for a missing value), as `cumsum` gives them. `total` (true, or fields to merge
// into it, such as a label) appends a last row from 0 to the grand total, with `total: true`.
export function waterfall(data, { value, total = false }) {
  const rows = cumsum(data, { value }).map((r, i) => {
    const delta = num(read(value)(data[i], i));
    return { ...data[i], delta: Number.isFinite(delta) ? delta : 0, from: r.from, to: r.to };
  });
  return total ? [...rows, { ...(total === true ? {} : total), from: 0, to: rows.at(-1)?.to ?? 0, total: true }] : rows;
}

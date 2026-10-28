// Statistics that return polygon rows for the Polygon mark (SPEC 6): Delaunay triangles, contours
// of a grid, contours of a point density. Each row is { points: ring, holes: [rings] } plus its own fields.
import * as d3 from 'd3';
import { read, num } from './fields.jsx';

const finite = (data, x, y) => data.map(d => [num(read(x)(d)), num(read(y)(d))]).filter(p => p.every(Number.isFinite));
// The same points with the index of the row each came from.
const sitesOf = (data, x, y) => data.map((d, i) => ({ p: [num(read(x)(d)), num(read(y)(d))], i })).filter(({ p }) => p.every(Number.isFinite));

// One row per polygon of d3's contour MultiPolygons, `map`ping each [x, y] from the grid's units.
const polygons = (contours, map) => contours.flatMap(c => c.coordinates.map(([outer, ...holes]) =>
  ({ level: c.value, points: outer.map(map), holes: holes.map(ring => ring.map(map)) })));

// The Delaunay triangulation of the points: [{ points: [[x, y] x 3], ids }], `ids` the indices of
// the three rows in `data`. Rows with a non-finite x or y are dropped; the ids still index `data`.
export function delaunay(data, { x, y }) {
  const sites = sitesOf(data, x, y);
  if (sites.length < 3) return [];
  const { triangles } = d3.Delaunay.from(sites.map(s => s.p));
  return d3.range(0, triangles.length, 3).map(i => {
    const picked = [triangles[i], triangles[i + 1], triangles[i + 2]].map(k => sites[k]);
    return { points: picked.map(s => s.p), ids: picked.map(s => s.i) };
  });
}

// Contour polygons of a grid of `width` x `height` values (row by row, a flat array).
// `thresholds` is a count or the levels. Row (i, j) sits at
// (x[0] + i / (width - 1) * (x[1] - x[0]), y[0] + j / (height - 1) * (y[1] - y[0])): by default
// the grid's own indices, so a y that grows upward needs y = [top, bottom] of the data. Rows:
// [{ level, points, holes }], one per polygon.
export function contours(values, { width, height, thresholds = 10, x = [0, width - 1], y = [0, height - 1] }) {
  const at = (i, n, [a, b]) => a + ((i - 0.5) / (n - 1)) * (b - a);   // d3's rings run through cell centres + 0.5
  return polygons(d3.contours().size([width, height]).thresholds(thresholds)(Array.from(values)), p => [at(p[0], width, x), at(p[1], height, y)]);
}

// Contours of the density of points (a Gaussian kernel of `bandwidth` data units in x and y;
// default Scott's rule on the larger spread). `level` is d3's density, in arbitrary units: use
// it to order or colour, not to read. The cost is that of a grid of at most about 120 by 120
// cells, not of the number of rows; the statistic still runs on every update, so add a `key` to
// the Plot when the rows rarely change (SPEC 5.11). Rows: [{ level, points, holes }].
export function densityContours(data, { x, y, bandwidth, thresholds = 10 }) {
  const rows = finite(data, x, y);
  if (rows.length < 2) return [];
  const [xs, ys] = [d3.extent(rows, p => p[0]), d3.extent(rows, p => p[1])];
  const bw = bandwidth ?? (d3.max([d3.deviation(rows, p => p[0]), d3.deviation(rows, p => p[1])]) || 1) * rows.length ** (-1 / 6);
  const pad = 3 * bw, span = Math.max(xs[1] - xs[0], ys[1] - ys[0]) + 2 * pad;
  const k = Math.min(12 / bw, 480 / span);   // grid units per data unit: 3 cells of 4 per bandwidth, at most 120 cells across
  const size = [Math.ceil((xs[1] - xs[0] + 2 * pad) * k), Math.ceil((ys[1] - ys[0] + 2 * pad) * k)];
  const contour = d3.contourDensity().x(p => (p[0] - xs[0] + pad) * k).y(p => (p[1] - ys[0] + pad) * k)
    .size(size).bandwidth(bw * k).cellSize(4).thresholds(thresholds);
  return polygons(contour(rows), p => [xs[0] - pad + p[0] / k, ys[0] - pad + p[1] / k]);
}

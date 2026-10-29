// hexbin: two-dimensional density as hexagonal cells, a statistic for the Polygon mark (SPEC 6).
// d3-hexbin is not in tauler's d3 bundle, so the hexagon maths is written here: each point goes to the
// nearest of the four candidate centres around it (regular hexagons are the cells nearest a centre).
import * as d3 from 'd3';
import { read, num } from './fields.jsx';

const SIN60 = Math.sin(Math.PI / 3);

// On a small plot the cells are squashed unless the Polygon plot's scales are told the data extent: an
// inferred domain is niced past the data and read from the polygon corners, and the default margins
// shrink the area. Pass explicit data-extent domains with a zero margin (the hexbin example does), or
// at least `margin` zero with `nice={false}` on both Scales. Height over width of a cell, measured at
// 248 x 110 (regular is 1.155): default scales and margins 0.49, margin 0 0.71, margin 0 and
// `nice={false}` 1.07, explicit domains and margin 0 1.155 (SPEC 6; charts/test/usability.test.jsx).
// Cells of `binWidth` (data units along x, flat side to flat side) holding at least one row:
// [{ cx, cy, count, points }], `points` the six corners in data space. Rows with no finite x or y
// are dropped. Hexagons are regular in data space; with the plot's pixel `width` and `height`
// (the extents of x and y fill them), regular on screen too, up to the margins, which are not
// accounted for. Cells are anchored at the minimum of the data, so they do not move when
// another row is added inside the extent.
export function hexbin(data, { x, y, binWidth, width, height }) {
  const [getX, getY] = [read(x), read(y)];
  const rows = data.map(d => [num(getX(d)), num(getY(d))]).filter(p => p.every(Number.isFinite));
  if (!rows.length) return [];
  const [[x0, x1], [y0, y1]] = [d3.extent(rows, p => p[0]), d3.extent(rows, p => p[1])];
  const w = binWidth ?? ((x1 - x0) / 20 || 1);
  // Work in pixel-like units: (sx, sy) per data unit; 1 and 1 when the figure's size is unknown.
  const sx = width && x1 > x0 ? width / (x1 - x0) : 1, sy = height && y1 > y0 ? height / (y1 - y0) : sx;
  const radius = (w * sx) / (2 * SIN60), dx = radius * 2 * SIN60, dy = radius * 1.5;
  const cells = new Map();
  for (const [px, py] of rows) {
    const [u, v] = [(px - x0) * sx, (py - y0) * sy];
    // The nearest centre is in one of the two rows around v and, in each, one of the two columns around u.
    let best = null;
    for (const r of [Math.floor(v / dy), Math.floor(v / dy) + 1]) {
      const c0 = Math.floor(u / dx - (r & 1) / 2);
      for (const c of [c0, c0 + 1]) {
        const d = (u - (c + (r & 1) / 2) * dx) ** 2 + (v - r * dy) ** 2;
        if (!best || d < best.d) best = { d, column: c, row: r };
      }
    }
    const { column, row } = best;
    const key = column + ',' + row, cell = cells.get(key);
    if (cell) cell.count++; else cells.set(key, { column, row, count: 1 });
  }
  return [...cells.values()].map(({ column, row, count }) => {
    const [u, v] = [(column + (row & 1) / 2) * dx, row * dy];
    return { cx: x0 + u / sx, cy: y0 + v / sy, count,
      points: d3.range(6).map(k => [x0 + (u + radius * Math.cos(Math.PI / 6 + (k * Math.PI) / 3)) / sx, y0 + (v + radius * Math.sin(Math.PI / 6 + (k * Math.PI) / 3)) / sy]) };
  });
}

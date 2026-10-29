// The Polygon mark: rings in data space (SPEC 5.2). Hexagons, Delaunay triangles and contours
// are statistics that return rows for it.
import * as d3 from 'd3';
import { defineMark } from './core.jsx';
import { RECT, styleOf } from './effects.jsx';

const get = (row, v) => typeof v === 'function' ? v(row.d) : typeof v === 'string' ? row.d?.[v] : undefined;
// A row's rings: the outer one (`points`), then its holes (`holes`, a list of rings, optional).
const ringsOf = (row, props) => {
  const outer = get(row, props.points);
  return outer?.length ? [outer, ...(get(row, props.holes ?? 'holes') ?? [])] : [];
};

// One closed path per row: `points` (a field or function of the datum) is a ring of [x, y] in
// data space; `holes` (default the field `holes`) are rings cut out of it. The rings train the x
// and y scales, so a plot of polygons alone needs no x or y channel. A ring with a point the coord
// hides is not drawn. `colorTo="stroke"` draws outlines coloured by the colour channel (fill none).
export const Polygon = defineMark('polygon', {
  domain(rows, props) {
    const points = rows.flatMap(r => ringsOf(r, props)[0] ?? []).filter(p => p.every(Number.isFinite));
    return { x: points.map(p => p[0]), y: points.map(p => p[1]) };
  },
  render(rows, ctx) {
    const { fill, stroke, colorTo } = ctx.props;
    if (fill === 'none' && stroke == null && colorTo !== 'stroke') throw new Error('Polygon: fill "none" with no stroke draws nothing; set stroke or colorTo="stroke"');
    return rows.flatMap(r => polygonShape(r, ctx));
  },
});

function polygonShape(r, ctx) {
  const rings = ringsOf(r, ctx.props).map(ring => ring.map(p => ctx.point(p[0], p[1])));
  if (!rings.length || rings.some(ring => ring.some(p => !p))) return [];
  // A hole wound the same way as its outer ring would be filled, not cut: turn it round.
  const outerArea = d3.polygonArea(rings[0]);
  const wound = rings.map((ring, i) => (i && d3.polygonArea(ring) * outerArea > 0 ? ring.slice().reverse() : ring));
  // Coloured by stroke (`colorTo`), a Polygon is an outline: its fill defaults to none.
  const style = styleOf(ctx, r, RECT);
  if (ctx.props.colorTo === 'stroke') style.fill = ctx.resolve(r, 'fill', 'none');
  return [{ t: 'path', d: wound.map(ring => d3.line().digits(2)(ring) + 'Z').join(''), ...style }];
}

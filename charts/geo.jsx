// Map marks: GeoJSON drawn through the Plot's projection (`<Plot projection="equal-earth">`),
// which core fits to the plot area around `fit` (the whole globe by default). Plain `builtinMark`s.
//
// Maps make long paths, and the figure's key is a hash of the drawing, so a map with detailed
// shapes is cheaper with a `key` on its Plot (see the README): then it is compiled only when
// tauler draws it, not every Tick.
import * as d3 from 'd3';
import { builtinMark } from './core.jsx';

const projectionOf = ctx => {
  if (!ctx.projection) throw new Error('Geo and GeoDot need a projection: <Plot projection="equal-earth">');
  return ctx.projection;
};

// d3-geo reads a ring's direction as which side is inside: clockwise, the ring; counter-clockwise,
// everything else. GeoJSON from most tools (RFC 7946) winds the other way, so a polygon that
// would cover more than half the globe, which no real shape does, is turned around.
function rewind(geometry) {
  const turn = rings => rings.map(r => r.slice().reverse());
  const fix = coords => (d3.geoArea({ type: 'Polygon', coordinates: coords }) > 2 * Math.PI ? turn(coords) : coords);
  if (!geometry) return geometry;
  if (geometry.type === 'Feature') return { ...geometry, geometry: rewind(geometry.geometry) };
  if (geometry.type === 'FeatureCollection') return { ...geometry, features: geometry.features.map(rewind) };
  if (geometry.type === 'Polygon') return { ...geometry, coordinates: fix(geometry.coordinates) };
  if (geometry.type === 'MultiPolygon') return { ...geometry, coordinates: geometry.coordinates.map(fix) };
  return geometry;
}

// One path per row; each row is GeoJSON (a Feature, a geometry, `{ type: 'Sphere' }`, a
// graticule). A `color` channel colours the fill: a choropleth.
export const Geo = builtinMark('geo', {
  render(rows, ctx) {
    const path = d3.geoPath(projectionOf(ctx)).digits(2);
    return rows.flatMap(r => {
      const d = path(rewind(r.d));
      return d ? [{ t: 'path', d, fill: ctx.resolve(r, 'fill'), fillOpacity: ctx.resolve(r, 'fillOpacity'),
        stroke: ctx.resolve(r, 'stroke'), strokeWidth: ctx.resolve(r, 'strokeWidth'), opacity: ctx.resolve(r, 'opacity') }] : [];
    });
  },
});

// A dot per row at `lon`, `lat` (fields of those names unless set). A dot the projection hides
// (the far side of a globe) is not drawn.
export const GeoDot = builtinMark('geo-dot', {
  render(rows, ctx) {
    const path = d3.geoPath(projectionOf(ctx)).digits(2);
    const read = (r, prop) => (ctx.props[prop] == null ? r.d?.[prop] : ctx.field(r, prop));
    return rows.flatMap(r => {
      const d = path.pointRadius(ctx.resolve(r, 'r', 3))({ type: 'Point', coordinates: [read(r, 'lon'), read(r, 'lat')] });
      return d ? [{ t: 'path', d, fill: ctx.resolve(r, 'fill'), stroke: ctx.resolve(r, 'stroke'), opacity: ctx.resolve(r, 'opacity') }] : [];
    });
  },
});

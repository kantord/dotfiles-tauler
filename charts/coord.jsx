// Coordinates: how a data (x, y) becomes a pixel. A coord is `{ channels?, bind(area) }`; `bind`
// returns what the mark context exposes as `ctx.point` and `ctx.line` (SPEC 5.4):
//   point(x, y, scales) -> [px, py], or null when the coord hides the point;
//   line(points, scales) -> a path `d` for [x, y] pairs (null entries break the line), densified
//     along the coord's own geometry.
// `channels` are the defaults for the Plot's channels. `geo` ignores the scales and reads `lon` and
// `lat` as `x` and `y`, so no x/y scale is trained under it. Depends on d3 only.
import * as d3 from 'd3';

// A d3-geo projection (a name such as 'equal-earth', or a projection) fitted to `area` around
// `fit` (GeoJSON; the whole globe by default).
export function fitProjection(projection, fit, area) {
  let p = projection;
  if (typeof p === 'string') {
    const make = d3['geo' + p.replace(/(?:^|-)(\w)/g, (_, c) => c.toUpperCase())];
    if (!make) throw new Error(`Plot: d3 has no projection named '${projection}'`);
    p = make();
  }
  return p.fitExtent([[area.left, area.top], [area.right, area.bottom]], fit ?? { type: 'Sphere' });
}

export const geo = (projection, { fit } = {}) => ({
  channels: { x: 'lon', y: 'lat' },
  bind(area) {
    const p = fitProjection(projection, fit, area), path = d3.geoPath(p).digits(2);
    // A projection called on a point does not clip: hide what lies beyond its clip angle (the
    // far side of a globe) here.
    const clip = p.clipAngle?.(), [lambda, phi] = p.rotate?.() ?? [0, 0], centre = [-lambda, -phi];
    const hidden = (x, y) => clip > 0 && d3.geoDistance([x, y], centre) > (clip * Math.PI) / 180;
    return {
      projection: p,
      point: (x, y) => (x == null || y == null || hidden(x, y) ? null : p([x, y])),
      // Each run of points is a great-circle path, which d3-geo resamples and clips for us.
      line(points) {
        const runs = [[]];
        for (const pt of points) { if (pt == null) runs.push([]); else runs.at(-1).push(pt); }
        return runs.filter(r => r.length > 1).map(r => path({ type: 'LineString', coordinates: r })).join('');
      },
    };
  },
});

// The Plot's coord: `coord`, else `projection` (sugar for `geo(projection, { fit })`).
export const coordOf = ({ coord, projection, fit }) => coord ?? (projection != null ? geo(projection, { fit }) : undefined);

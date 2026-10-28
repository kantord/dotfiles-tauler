// The Swarm mark: a beeswarm (SPEC 5.2, 5.3). It needs pixel positions (a dot's radius against its
// place), so it is a mark, not a data-space position; it does not use the pixel stage.
import { defineMark, top } from './core.jsx';
import { keyOf } from './scales.jsx';
import { EFFECTS, styleOf } from './effects.jsx';

const SLACK = 0.02;   // px; the scene rounds to 2 places, which could otherwise bring two dots under touching

// Offsets along the category axis for dots at `places` (pixels along the value axis) with `radii`:
// in order along the value axis, each dot takes the free spot nearest the centre line, found among
// 0 and the spots that touch an already-placed dot.
function offsets(places, radii) {
  const order = places.map((_, i) => i).sort((a, b) => places[a] - places[b] || a - b), placed = [], out = new Array(places.length).fill(0);
  for (const i of order) {
    const near = placed.filter(j => Math.abs(places[i] - places[j]) < radii[i] + radii[j] + SLACK);
    const free = o => near.every(j => Math.hypot(o - out[j], places[i] - places[j]) >= radii[i] + radii[j] + SLACK - 1e-9);
    const spots = [0, ...near.flatMap(j => {
      const reach = Math.sqrt((radii[i] + radii[j] + SLACK) ** 2 - (places[i] - places[j]) ** 2);
      return [out[j] - reach, out[j] + reach];
    })].sort((a, b) => Math.abs(a) - Math.abs(b) || b - a);
    out[i] = spots.find(free) ?? 0;
    placed.push(i);
  }
  return out;
}

// A circle per row at its value, moved along the category axis (the band axis, x first) so that
// no two circles overlap: the larger the radius, the wider the swarm. Dots in a dodge slot swarm
// about the slot's middle. A swarm is not limited to its band: too many or too large dots spill
// into the next band, so lower `r` or widen the plot. `r` is the radius in px (or the size channel).
export const Swarm = defineMark('swarm', {
  size: 'r',
  render(rows, ctx) {
    const horizontal = !ctx.bandwidth.x() && ctx.bandwidth.y() > 0;
    if (!ctx.bandwidth.x() && !horizontal) throw new Error('Swarm: needs a band or point scale on x or y (<Scale channel="x" type="band"/>)');
    const used = rows.filter(r => top(r) != null && ctx.point(r.x, top(r), r));
    const groups = new Map();
    for (const r of used) {
      const k = keyOf(horizontal ? top(r) : r.x) + '|' + (r.u1 ?? '');
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(r);
    }
    const shift = new Map();
    for (const group of groups.values()) {
      const points = group.map(r => ctx.point(r.x, top(r), r)), radii = group.map(r => ctx.resolve(r, 'r', 3));
      const o = offsets(points.map(p => p[horizontal ? 0 : 1]), radii);
      group.forEach((r, i) => shift.set(r, [points[i], radii[i], o[i]]));
    }
    return used.map(r => {
      const [p, radius, o] = shift.get(r);
      return { t: 'circle', cx: p[0] + (horizontal ? 0 : o), cy: p[1] + (horizontal ? o : 0), r: radius,
        ...styleOf(ctx, r, ['fill', 'stroke', 'opacity', 'strokeWidth', 'strokeDasharray', 'strokeOpacity', ...EFFECTS]) };
    });
  },
});

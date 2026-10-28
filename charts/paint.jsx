// Paints: values a shape's `fill` or `stroke` may hold besides a colour string (SPEC 5.5).
// A paint is a plain object in the scene (so it is part of the key); `drawScene` writes each
// distinct one once into the <svg>'s <defs> and points the shape at it.

const SIDES = { bottom: [0, 0, 0, 1], top: [0, 1, 0, 0], right: [0, 0, 1, 0], left: [1, 0, 0, 0] };

// A linear gradient. `stops`: `{ offset 0..1, color, opacity? }`. `to` ('bottom', 'top', 'left',
// 'right') runs it across the shape's own box; `x1 y1 x2 y2` with `user: true` are pixel
// positions in the figure instead (a stroke along a whole plot: a flat line has no box height).
export function linearGradient({ stops, to = 'bottom', x1, y1, x2, y2, user = false }) {
  if (!Array.isArray(stops) || stops.length < 2) throw new Error('linearGradient: stops must list at least two { offset, color }');
  if (user) return { paint: 'linearGradient', user, x1, y1, x2, y2, stops };
  if (!SIDES[to]) throw new Error(`linearGradient: to must be one of ${Object.keys(SIDES).join(', ')}`);
  const [a, b, c, d] = SIDES[to];
  return { paint: 'linearGradient', x1: a, y1: b, x2: c, y2: d, stops };
}

// A radial gradient across the shape's box, centred at (cx, cy) with radius r (fractions of it).
export function radialGradient({ stops, cx = 0.5, cy = 0.5, r = 0.5 }) {
  if (!Array.isArray(stops) || stops.length < 2) throw new Error('radialGradient: stops must list at least two { offset, color }');
  return { paint: 'radialGradient', cx, cy, r, stops };
}

// A repeating tile of `size` px square holding `shapes` (scene shapes), turned by `angle` degrees.
export const pattern = ({ shapes, size = 6, angle = 0 }) => ({ paint: 'pattern', size, angle, shapes });

// Parallel lines `gap` px apart, `width` px thick, at `angle` degrees: a hatched region.
export const hatch = ({ color, gap = 5, width = 1.25, angle = 45 } = {}) =>
  pattern({ size: gap, angle, shapes: [{ t: 'line', x1: 0, y1: 0, x2: 0, y2: gap, stroke: color, strokeWidth: width }] });

// What a mark's `pattern` prop means: a name ('hatch'), or a paint made by `pattern`.
export function patternOf(spec, color) {
  if (spec === 'hatch') return hatch({ color });
  if (spec?.paint === 'pattern') return spec;
  throw new Error(`pattern: use 'hatch' or a pattern(...) paint, got ${JSON.stringify(spec)}`);
}

export const isPaint = v => v != null && typeof v === 'object' && typeof v.paint === 'string';

// Writes `paint` into `defs` (a d3 selection of <defs>) under `id`. `drawShape` draws a pattern's tile.
export function drawPaint(defs, paint, id, drawShape) {
  const stopsOf = el => paint.stops.forEach(s => el.append('stop').attr('offset', s.offset).attr('stop-color', s.color)
    .attr('stop-opacity', s.opacity ?? null));
  if (paint.paint === 'linearGradient') {
    const el = defs.append('linearGradient').attr('id', id).attr('x1', paint.x1).attr('y1', paint.y1).attr('x2', paint.x2).attr('y2', paint.y2);
    if (paint.user) el.attr('gradientUnits', 'userSpaceOnUse');
    stopsOf(el);
  } else if (paint.paint === 'radialGradient') {
    stopsOf(defs.append('radialGradient').attr('id', id).attr('cx', paint.cx).attr('cy', paint.cy).attr('r', paint.r));
  } else if (paint.paint === 'pattern') {
    const el = defs.append('pattern').attr('id', id).attr('patternUnits', 'userSpaceOnUse').attr('width', paint.size).attr('height', paint.size);
    if (paint.angle) el.attr('patternTransform', `rotate(${paint.angle})`);
    for (const shape of paint.shapes) drawShape(el, shape);
  } else throw new Error(`drawScene: unknown paint '${paint.paint}'`);
}

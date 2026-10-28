// Effects: values a shape's `filter`, `markerStart`, `markerEnd`, `mask` or `clip` may hold (SPEC 5.5).
// Like a paint, each is a plain object in the scene (so it is part of the key; `def` names the
// SVG element it becomes) and `drawScene` writes each distinct one once into <defs>.

// A Gaussian blur of standard deviation `std` px. (A filter's region is the shape's box, so a
// flat line, which has no height, cannot be filtered; put it in a Group.)
export const blur = ({ std = 2 } = {}) => ({ def: 'filter', effect: 'blur', std });

// A shadow offset by (dx, dy) px, blurred by `std`.
export const dropShadow = ({ dx = 1, dy = 1, std = 2, color = '#000', opacity = 0.4 } = {}) =>
  ({ def: 'filter', effect: 'dropShadow', dx, dy, std, color, opacity });

// A marker drawn at a path's or line's ends: `shapes` (scene shapes) in a `viewBox` square, `size`
// px wide, with (refX, refY) on the line's end, turned to follow the line.
export const marker = ({ shapes, size = 7, viewBox = '0 0 10 10', refX = 10, refY = 5 }) =>
  ({ def: 'marker', size, viewBox, refX, refY, shapes });

// An arrowhead pointing along the line; its colour is the line's own stroke unless given.
export const arrowhead = ({ color = 'context-stroke', size = 7 } = {}) =>
  marker({ size, shapes: [{ t: 'path', d: 'M0,0L10,5L0,10Z', fill: color }] });

// A mask: where its `shapes` are light the masked shape shows, where dark it fades.
export const mask = ({ shapes }) => ({ def: 'mask', shapes });

// A clip region: a rectangle in figure pixels, or path data.
export const clipRect = ({ x, y, width, height }) => ({ def: 'clipPath', shapes: [{ t: 'rect', x, y, width, height }] });
export const clipPath = d => ({ def: 'clipPath', shapes: [{ t: 'path', d }] });

export const isDef = v => v != null && typeof v === 'object' && typeof v.def === 'string';

// Writes `effect` into `defs` (a d3 selection of <defs>) under `id`. `drawShape(el, shape)` draws
// the shapes inside a marker, mask or clip path.
export function drawDef(defs, effect, id, drawShape) {
  if (effect.def === 'filter') {
    const el = defs.append('filter').attr('id', id);
    if (effect.effect === 'blur') el.append('feGaussianBlur').attr('stdDeviation', effect.std);
    else el.append('feDropShadow').attr('dx', effect.dx).attr('dy', effect.dy).attr('stdDeviation', effect.std)
      .attr('flood-color', effect.color).attr('flood-opacity', effect.opacity);
  } else if (effect.def === 'marker') {
    const el = defs.append('marker').attr('id', id).attr('viewBox', effect.viewBox).attr('refX', effect.refX).attr('refY', effect.refY)
      .attr('markerWidth', effect.size).attr('markerHeight', effect.size).attr('markerUnits', 'userSpaceOnUse').attr('orient', 'auto');
    for (const shape of effect.shapes) drawShape(el, shape);
  } else if (effect.def === 'mask' || effect.def === 'clipPath') {
    const el = defs.append(effect.def).attr('id', id);
    for (const shape of effect.shapes) drawShape(el, shape);
  } else throw new Error(`drawScene: unknown effect '${effect.def}'`);
}

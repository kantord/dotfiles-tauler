// Scene: plain shapes with explicit style, the mark context, the key hash, and the only code
// that touches the DOM (drawScene).
import * as d3 from 'd3';
import { valueOf, at } from './scales.jsx';
import { isPaint, drawPaint } from './paint.jsx';
import { isDef, drawDef } from './defs.jsx';

export const FONT_SIZE = 11;
export const CLIP_BLEED = 4;

/* ---------- scene: plain shapes with explicit style ---------- */

export const line = (x1, y1, x2, y2, style) => ({ t: 'line', x1, y1, x2, y2, ...style });
export const text = (x, y, content, style) => ({ t: 'text', x, y, text: content, fontSize: FONT_SIZE, ...style });
// A full-width or full-height line across the plot area at `p`.
export const across = (area, horizontal, p, style) =>
  horizontal ? line(area.left, p, area.right, p, style) : line(p, area.top, p, area.bottom, style);

// `label`, shortened with an ellipsis until it measures at most `room` px.
export function fit(label, room, measure) {
  if (measure(label, FONT_SIZE) <= room) return label;
  let cut = label;
  while (cut && measure(cut + '…', FONT_SIZE) > room) cut = cut.slice(0, -1);
  return cut.trimEnd() + '…';
}

// The scale a layer reads per channel: the default one, or the one it binds by name.
export const bindScales = (layer, scales) =>
  Object.fromEntries(Object.entries(scales).map(([c, byName]) => [c, byName[layer.scale?.[c] ?? 'default']]));

// What a mark's render() gets: pixel positions, the plot area, and how to read its props.
export function context(layer, scales, area, env) {
  const { props, color: target, size: sizeTarget } = layer, { theme } = env;
  scales = bindScales(layer, scales);
  // value -> pixel, the band centre on a band scale; ±Infinity is the plot's edge.
  // A plot of only ±Infinity annotations trains no scale; its edges still have positions.
  // Given a row that carries a slot (`u1 u2`, from dodge or jitter), a band point sits at the
  // slot's middle: `point` takes the row. A row's pixel offset (`dx dy`, from a pixel-stage
  // position) is added by `point` after the coord.
  const along = (scale, low, high) => (v, row) =>
    v === -Infinity ? low : v === Infinity ? high : !scale ? NaN : at(scale, v, row);
  const [x, y] = [along(scales.x, area.left, area.right), along(scales.y, area.bottom, area.top)];
  const bandwidth = scale => () => scale?.bandwidth?.() ?? 0;
  const coord = env.bound;
  return {
    x: v => x(v),
    y: v => y(v),
    // A joint mapping (the coord's, when the Plot has one): [px, py], or null where the coord
    // hides the point.
    point(px, py, row) {
      const p = coord ? coord.point(px, py, scales, row) : [x(px, row), y(py, row)];
      return p && (row?.dx || row?.dy) ? [p[0] + (row.dx ?? 0), p[1] + (row.dy ?? 0)] : p;
    },
    // A path `d` through [x, y] pairs (null entries break it), densified along the coord;
    // `curve` is a d3 curve, used when there is no coord.
    line: (points, { curve = d3.curveLinear } = {}) => (coord ? coord.line(points, scales, { curve })
      : d3.line().digits(2).defined(p => p != null).x(p => x(p[0])).y(p => y(p[1])).curve(curve)(points)),
    // A wedge from pixel intervals along x and y, when the coord draws them as wedges (polar).
    ...(coord?.wedge && { wedge: (xs, ys, opts) => coord.wedge(xs, ys, scales, opts) }),
    coord,
    color: scales.color,
    size: scales.size,     // value -> the size channel's range (the radius of a Dot)
    shape: scales.shape,   // value -> a d3 symbol name
    area,
    bandwidth: { x: bandwidth(scales.x), y: bandwidth(scales.y) },
    theme, props,
    // A style prop: a function of the datum, else a constant, else (for the prop a channel
    // feeds: colour, size, `opacity`) that channel's scale, else `fallback`. An `opacity`
    // given as a field name is the channel, not a constant.
    resolve(row, prop, fallback) {
      const v = props[prop], channel = prop === target ? 'color' : prop === sizeTarget ? 'size' : prop === 'opacity' ? 'opacity' : null;
      if (typeof v === 'function') return v(row.d);
      if (v != null && !(channel === 'opacity' && typeof v === 'string')) return v;
      const value = channel && valueOf(row, channel);
      if (value != null && scales[channel]) return scales[channel](value);
      return channel === 'color' ? fallback ?? theme.palette[0] : fallback;
    },
    // A value prop: a field name or a function of the datum.
    field(row, prop) {
      const v = props[prop];
      return typeof v === 'function' ? v(row.d) : typeof v === 'string' ? row.d?.[v] : v;
    },
    measure: env.measure,
    projection: env.projection,   // a d3-geo projection fitted to the area, when the coord is `geo`
  };
}

// cyrb53 (c) 2018 bryc, public domain or MIT, attribution appreciated
// (https://github.com/bryc/code/blob/master/jshash/experimental/cyrb53.js), seed 0:
// 53 bits, so two different scenes practically never share a key (and a Picture).
export function hash53(str) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
const round = v => typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 100) / 100 : v;
export const tidy = shape => {
  const out = {};
  for (const k in shape) if (shape[k] != null) out[k] = k === 'children' ? shape[k].map(tidy) : round(shape[k]);
  return out;
};

/* ---------- draw: the only part that touches the DOM ---------- */

// The scene schema (SPEC 5.5): SVG attribute names in camelCase, written kebab-cased.
const GEOMETRY = {
  rect: ['x', 'y', 'width', 'height', 'rx'],
  circle: ['cx', 'cy', 'r'],
  line: ['x1', 'y1', 'x2', 'y2'],
  path: ['d'],
  text: ['x', 'y', 'dy'],
  image: ['x', 'y', 'width', 'height', 'href'],
  g: [],
};
const STYLE = ['fill', 'stroke', 'strokeWidth', 'strokeDasharray', 'strokeOpacity', 'fillOpacity', 'opacity',
  'textAnchor', 'fontSize', 'fontFamily', 'fontWeight', 'transform', 'strokeLinecap', 'strokeLinejoin',
  'filter', 'markerStart', 'markerEnd', 'mask', 'clip', 'blend'];
// Style fields that are written under another attribute name.
const ATTRIBUTE = { clip: 'clip-path' };
const kebab = name => name.replace(/[A-Z]/g, c => '-' + c.toLowerCase());

// `refUrl` turns a paint or effect object into the `url(#id)` that points at its <defs> entry.
function drawShape(group, shape, refUrl = v => v) {
  const el = group.append(shape.t);
  for (const k of [...GEOMETRY[shape.t], ...STYLE]) {
    if (shape[k] == null) continue;
    const v = isPaint(shape[k]) || isDef(shape[k]) ? refUrl(shape[k]) : shape[k];
    if (k === 'blend') el.attr('style', `mix-blend-mode:${v}`);
    else el.attr(ATTRIBUTE[k] ?? kebab(k), shape.t === 'rect' && (k === 'width' || k === 'height') ? Math.max(0, v) : v);
  }
  if (shape.crisp) el.attr('shape-rendering', 'crispEdges');
  if (shape.t === 'text') el.text(shape.text);
  for (const child of shape.children ?? []) drawShape(el, child, refUrl);
}

// Draws `scene` into `svg`, a d3 selection of an empty <svg>. `clipId` must be unique on the page;
// it also prefixes the ids of the paints and effects (gradients, patterns, filters, markers, masks,
// clip paths), one <defs> entry per distinct one.
export function drawScene(svg, scene, clipId) {
  const { clip } = scene, defs = svg.append('defs'), ids = new Map();
  defs.append('clipPath').attr('id', clipId)
    .append('rect').attr('x', clip.x).attr('y', clip.y).attr('width', clip.w).attr('height', clip.h);
  const refUrl = def => {
    const json = JSON.stringify(def);
    if (!ids.has(json)) {
      ids.set(json, `${clipId}-paint-${ids.size}`);
      (isDef(def) ? drawDef : drawPaint)(defs, def, ids.get(json), (el, shape) => drawShape(el, shape, refUrl));
    }
    return `url(#${ids.get(json)})`;
  };
  for (const [shapes, clipped] of [[scene.back, false], [scene.marks, true], [scene.front, false]]) {
    const group = svg.append('g');
    if (clipped) group.attr('clip-path', `url(#${clipId})`);
    for (const shape of shapes) drawShape(group, shape, refUrl);
  }
}

// The built-in marks. They use only `defineMark` and `ctx`, the same seam a third-party mark has.
import * as d3 from 'd3';
import { defineMark, top } from './core.jsx';
import { valueOf } from './scales.jsx';
import { linearGradient, patternOf } from './paint.jsx';
import { EFFECTS, RECT, LINE, styleOf } from './effects.jsx';

export { Image, Group } from './effects.jsx';
export { Text } from './text.jsx';
export { Polygon } from './polygon.jsx';
export { RuleX, RuleY, TickX, TickY } from './rules.jsx';
export { Swarm } from './swarm.jsx';

// A d3 curve by name ('step-after' is d3.curveStepAfter, 'monotone' d3.curveMonotoneX), or a
// d3 curve itself.
function curve(name = 'linear') {
  if (typeof name === 'function') return name;
  const found = name === 'monotone' ? d3.curveMonotoneX : d3['curve' + name.replace(/(?:^|-)(\w)/g, (_, c) => c.toUpperCase())];
  if (!found) throw new Error(`Line/Area: d3 has no curve named '${name}'`);
  return found;
}

// One path per group and colour, points in pixel order along `along` unless `sort={false}`.
// Styles read the first real row: stack() may have added rows with no datum.
function paths(rows, ctx, along, build, style, splitColor = true) {
  return d3.groups(rows, r => r.group, splitColor ? r => r.color : () => 0).flatMap(([, byColor]) => byColor.map(([, group]) => {
    const sorted = ctx.props.sort === false || (ctx.coord && !ctx.coord.positions) ? group : d3.sort(group, r => ctx[along](r[along]));
    return { t: 'path', d: build(sorted) + (ctx.props.closed ? 'Z' : ''), ...style(group.find(r => r.d != null) ?? group[0], group) };
  }));
}

// With `gradient` (and not under a coord) the colour channel does not split the line: one path
// per group, its stroke a gradient along x that takes the colour scale's colour at each vertex.
// So the colour must be a function of x, or the stops fold back on themselves.
function gradientStroke(group, ctx) {
  const points = d3.sort(group.filter(r => top(r) != null && r.color != null), r => ctx.x(r.x));
  const [x1, x2] = [ctx.x(points[0]?.x), ctx.x(points.at(-1)?.x)];
  if (!ctx.color || !(x2 > x1)) return undefined;
  return linearGradient({ user: true, x1, y1: 0, x2, y2: 0,
    stops: points.map(r => ({ offset: (ctx.x(r.x) - x1) / (x2 - x1), color: ctx.color(r.color) })) });
}

export const Line = defineMark('line', {
  color: 'stroke',
  render(rows, ctx) {
    const p = ctx.props, smooth = p.gradient && !ctx.coord;
    const build = group => ctx.line(group.map(r => (top(r) != null ? [r.x, top(r)] : null)), { curve: curve(p.curve) });
    return paths(rows, ctx, 'x', build, (row, group) => ({ fill: 'none', ...styleOf(ctx, row, LINE),
      ...(smooth && { stroke: gradientStroke(group, ctx) ?? ctx.resolve(row, 'stroke') }),
      strokeWidth: ctx.resolve(row, 'strokeWidth', 1.75) }), !smooth);
  },
});

const hasInterval = (rows, axis) => rows.some(r => r[axis + '1'] != null || r[axis + '2'] != null);

// A ribbon per row, from (x1, y1) to (x2, y2): `thickness1` and `thickness2` (a field, function
// or number) are its extent in y data units at the two ends, centred on the line. With
// `curve="link-horizontal"` the edges are d3's horizontal links (a flow's band).
const thicknesses = (row, props) => ['thickness1', 'thickness2'].map(n => {
  const v = props[n];
  return +(typeof v === 'function' ? v(row.d) : typeof v === 'string' ? row.d?.[v] : v) || 0;
});
const ribbonReach = (rows, props) => ({ y: rows.flatMap(r => {
  const [w1, w2] = thicknesses(r, props);
  return [r.y1 - w1 / 2, r.y1 + w1 / 2, r.y2 - w2 / 2, r.y2 + w2 / 2];
}).filter(Number.isFinite) });

function ribbons(rows, ctx) {
  const round = v => Math.round(v * 100) / 100, bezier = ctx.props.curve === 'link-horizontal';
  const link = d3.linkHorizontal().x(p => p[0]).y(p => p[1]).digits(2);
  return rows.filter(r => r.x1 != null && r.x2 != null && r.y1 != null && r.y2 != null).map(r => {
    const [w1, w2] = thicknesses(r, ctx.props), [xa, xb] = [ctx.x(r.x1), ctx.x(r.x2)];
    const edge = (y, w, sign) => ctx.y(y + sign * w / 2);
    const a = [[xa, edge(r.y1, w1, 1)], [xb, edge(r.y2, w2, 1)]], b = [[xb, edge(r.y2, w2, -1)], [xa, edge(r.y1, w1, -1)]];
    const path = ([from, to]) => bezier ? link({ source: from, target: to }) : `M${round(from[0])},${round(from[1])}L${round(to[0])},${round(to[1])}`;
    return { t: 'path', d: path(a) + path(b).replace('M', 'L') + 'Z', ...styleOf(ctx, r, ['fill', 'fillOpacity', 'opacity', ...EFFECTS]),
      fillOpacity: ctx.resolve(r, 'fillOpacity', 0.85) };
  });
}

// Vertical: `x` with `y1 y2`, or `y` alone, filled from 0. Horizontal: `y` with `x1 x2`.
// A ribbon: `x1 x2 y1 y2` with `thickness1`/`thickness2`.
export const Area = defineMark('area', {
  domain: (rows, props) => (props.thickness1 != null || props.thickness2 != null ? ribbonReach(rows, props)
    : !hasInterval(rows, 'x') && !hasInterval(rows, 'y') ? { y: [0] } : {}),
  render(rows, ctx) {
    if (ctx.props.thickness1 != null || ctx.props.thickness2 != null) return ribbons(rows, ctx);
    const p = ctx.props, generator = d3.area().digits(2).curve(curve(p.curve));
    const horizontal = hasInterval(rows, 'x');
    if (ctx.coord?.positions) {   // polar: both ends of each row's span, through the coord
      const ends = new Map(rows.map(r => [r, horizontal ? [ctx.point(r.x1, r.y, r), ctx.point(r.x2, r.y, r)] : [ctx.point(r.x, r.y1 ?? 0, r), ctx.point(r.x, top(r), r)]]));
      generator.defined(r => ends.get(r).every(Boolean)).x0(r => ends.get(r)[0][0]).y0(r => ends.get(r)[0][1]).x1(r => ends.get(r)[1][0]).y1(r => ends.get(r)[1][1]);
    } else if (horizontal) {
      generator.defined(r => r.x1 != null && r.x2 != null).y(r => ctx.y(r.y)).x0(r => ctx.x(r.x1)).x1(r => ctx.x(r.x2));
    } else {
      generator.defined(r => top(r) != null).x(r => ctx.x(r.x))
        .y0(r => ctx.y(r.y1 ?? 0)).y1(r => ctx.y(top(r)));
    }
    return paths(rows, ctx, horizontal ? 'y' : 'x', generator, row => ({ ...styleOf(ctx, row, ['fill', 'fillOpacity', 'opacity', ...EFFECTS]), fillOpacity: ctx.resolve(row, 'fillOpacity', 0.85) }));
  },
});

// A Bar's value axis is y, unless y is a band scale.
const yIsBand = (rows, options) => options.y?.type === 'band' || rows.some(r => typeof r.y === 'string');

// Where a rectangle sits on one axis, in pixels: an interval's ends; else a point, which on a
// band scale fills the band (less `inset`; narrowed to `u1 u2` by dodge), and on a continuous
// scale runs from `baseline` to the value, or is `width` px centred on it.
function extent(row, axis, ctx, baseline) {
  const position = ctx[axis], band = ctx.bandwidth[axis](), p = ctx.props;
  const start = row[axis + '1'], end = row[axis + '2'];
  if (start != null || end != null) {
    const ends = [position(start ?? end), position(end ?? start)];
    return band ? [Math.min(...ends) - band / 2, Math.max(...ends) + band / 2] : ends;
  }
  const v = row[axis];
  if (v == null || !position) return null;
  if (band) {
    const from = position(v) - band / 2, [u1, u2] = [row.u1 ?? 0, row.u2 ?? 1];
    const inset = p.inset ?? 0;
    return [from + u1 * band + inset, from + u2 * band - inset];
  }
  if (baseline != null) return [position(baseline), position(v)];
  const width = p.width ?? 6;
  return [position(v) - width / 2, position(v) + width / 2];
}

function rects(rows, ctx, baseline, bar = false) {
  const valueAxis = ctx.bandwidth.y() ? 'x' : 'y';
  return rows.flatMap(r => {
    const xs = extent(r, 'x', ctx, valueAxis === 'x' ? baseline : undefined);
    const ys = extent(r, 'y', ctx, valueAxis === 'y' ? baseline : undefined);
    if (!xs || !ys || ![...xs, ...ys].every(Number.isFinite)) return [];   // no value, or none the scale can place
    const [x, right] = [Math.min(...xs), Math.max(...xs)], [y, bottom] = [Math.min(...ys), Math.max(...ys)];
    if (bar && (y === bottom || x === right)) return [];   // a zero-value Bar has no length: nothing to draw
    const style = styleOf(ctx, r, RECT);
    if (ctx.props.pattern != null) style.fill = patternOf(ctx.props.pattern, style.fill ?? ctx.theme.palette[0]);
    if (ctx.wedge) {   // polar: the same extents, as a wedge
      const w = ctx.wedge(xs, ys, { cornerRadius: ctx.resolve(r, 'cornerRadius') });
      if (!w) return [];
      return [w.line ? { t: 'line', x1: w.line[0], y1: w.line[1], x2: w.line[2], y2: w.line[3], ...style, stroke: style.stroke ?? style.fill, strokeWidth: style.strokeWidth ?? 1 }
        : { t: 'path', d: w.d, transform: w.transform, ...style }];
    }
    // SVG draws nothing for a zero-size rect; a flat one is a line (a box plot's median, a
    // doji), stroked with the fill when it has no stroke of its own.
    const flat = { ...style, stroke: style.stroke ?? style.fill, strokeWidth: style.strokeWidth ?? 1 };
    if (y === bottom) return [{ t: 'line', x1: x, y1: y, x2: right, y2: y, ...flat }];
    if (x === right) return [{ t: 'line', x1: x, y1: y, x2: x, y2: bottom, ...flat }];
    const radius = ctx.resolve(r, 'cornerRadius');
    if (Array.isArray(radius)) return [{ t: 'path', d: roundedRect(x, y, right - x, bottom - y, radius), ...style }];
    return [{ t: 'rect', x, y, width: right - x, height: bottom - y, rx: radius ?? ctx.resolve(r, 'rx'), ...style }];
  });
}

// A rectangle as a path with its own radius at each corner: [top-left, top-right, bottom-right,
// bottom-left], each clamped to half the shorter side.
function roundedRect(x, y, w, h, radii) {
  const cap = Math.min(w, h) / 2, n = v => Math.round(v * 100) / 100;
  const [tl, tr, br, bl] = radii.map(v => Math.min(v ?? 0, cap));
  const arc = (r, dx, dy) => (r > 0 ? `A${n(r)},${n(r)} 0 0 1 ${n(dx)},${n(dy)}` : '');
  return `M${n(x + tl)},${n(y)}H${n(x + w - tr)}${arc(tr, x + w, y + tr)}V${n(y + h - br)}${arc(br, x + w - br, y + h)}`
    + `H${n(x + bl)}${arc(bl, x, y + h - bl)}V${n(y + tl)}${arc(tl, x + tl, y)}Z`;
}

const baselineHint = baseline => (rows, props, options) =>
  (props.baseline ?? baseline) == null ? {} : { [yIsBand(rows, options) ? 'x' : 'y']: [props.baseline ?? baseline] };

export const Rect = defineMark('rect', {
  domain: baselineHint(undefined),
  render: (rows, ctx) => rects(rows, ctx, ctx.props.baseline),
});

// A Rect whose single point on its value axis runs from `baseline` (0).
export const Bar = defineMark('bar', {
  domain: baselineHint(0),
  render: (rows, ctx) => rects(rows, ctx, ctx.props.baseline ?? 0, true),
});

// A circle of radius `r` (the size channel feeds it), or, with a `shape` channel, a d3 symbol of
// the same area, centred by a transform. `rx` and `ry` instead give the radii in data units (a
// field, function or number), so a layout in unit space scales with the plot. The scene has
// circles, not ellipses: `rx` is measured on the x scale and wins; `ry` alone on the y scale.
export const Dot = defineMark('dot', {
  size: 'r',
  render: (rows, ctx) => rows.filter(r => top(r) != null).flatMap(r => {
    const p = ctx.point(r.x, top(r), r);
    const axis = ctx.props.rx != null ? 'x' : ctx.props.ry != null ? 'y' : null, at = axis === 'x' ? r.x : top(r);
    const radius = axis ? Math.abs(ctx[axis](at + ctx.field(r, axis === 'x' ? 'rx' : 'ry')) - ctx[axis](at)) : ctx.resolve(r, 'r', 3);
    const style = styleOf(ctx, r, ['fill', 'stroke', 'opacity', 'strokeWidth', 'strokeDasharray', 'strokeOpacity', ...EFFECTS]);
    const symbol = valueOf(r, 'shape') != null && ctx.shape ? ctx.shape(valueOf(r, 'shape')) : 'circle';
    if (!p) return [];
    if (symbol === 'circle') return [{ t: 'circle', cx: p[0], cy: p[1], r: radius, ...style }];
    const type = d3['symbol' + symbol[0].toUpperCase() + symbol.slice(1)];
    if (!type) throw new Error(`Dot: '${symbol}' is not a d3 symbol (use circle, cross, diamond, square, star, triangle, wye)`);
    return [{ t: 'path', d: d3.symbol(type, Math.PI * radius * radius).digits(2)(), transform: `translate(${Math.round(p[0] * 100) / 100},${Math.round(p[1] * 100) / 100})`, ...style }];
  }),
});

// A segment from (x1, y1) to (x2, y2); a missing end takes the point channel. Under a coord it is
// a path along the coord's own geometry (a great circle on a map). `curve="link-horizontal"`
// draws d3's horizontal link (a tree's edge), any other `Line` curve name that curve, instead of a line.
export const Link = defineMark('link', {
  color: 'stroke',
  render: (rows, ctx) => rows.flatMap(r => {
    if ([r.x1 ?? r.x, r.y1 ?? r.y, r.x2 ?? r.x, r.y2 ?? r.y].some(v => v == null || Number.isNaN(v))) return [];   // an end is missing
    const [a, b] = [ctx.point(r.x1 ?? r.x, r.y1 ?? r.y, r), ctx.point(r.x2 ?? r.x, r.y2 ?? r.y, r)];
    const style = { ...styleOf(ctx, r, LINE), strokeWidth: ctx.resolve(r, 'strokeWidth', 1) };
    if (ctx.props.curve != null && ctx.props.curve !== 'linear' && !ctx.coord) {
      const d = ctx.props.curve === 'link-horizontal' ? d3.linkHorizontal().x(p => p[0]).y(p => p[1]).digits(2)({ source: a, target: b })
        : d3.line().digits(2).curve(curve(ctx.props.curve))([a, b]);
      return [{ t: 'path', d, fill: 'none', ...style }];
    }
    if (ctx.coord && !(a && b && ctx.coord.straight?.(a, b))) {
      const d = ctx.line([[r.x1 ?? r.x, r.y1 ?? r.y], [r.x2 ?? r.x, r.y2 ?? r.y]]);
      return d ? [{ t: 'path', d, fill: 'none', ...style }] : [];
    }
    return [{ t: 'line', x1: a[0], y1: a[1], x2: b[0], y2: b[1], ...style }];
  }),
});

// An arrow or tick at each point, turned `angle` degrees clockwise from up (a field or function),
// `length` pixels long (a constant, the same at any figure size). Put `markerEnd={arrowhead()}` on it for a head.
export const Vector = defineMark('vector', {
  color: 'stroke',
  render: (rows, ctx) => rows.flatMap(r => {
    const p = ctx.point(r.x, top(r), r), angle = ctx.field(r, 'angle'), length = ctx.field(r, 'length') ?? 10;
    if (!p || angle == null) return [];
    const a = (angle * Math.PI) / 180;
    const style = { ...styleOf(ctx, r, LINE), strokeWidth: ctx.resolve(r, 'strokeWidth', 1) };
    return [{ t: 'line', x1: p[0], y1: p[1], x2: p[0] + length * Math.sin(a), y2: p[1] - length * Math.cos(a), ...style }];
  }),
});

// A wedge per row: pie, donut (`inner`, a fraction of the radius) or gauge (`startAngle`,
// `endAngle`). `value` is read by the mark, not trained, so a pie needs no x or y scale.
export const Arc = defineMark('arc', {
  render(rows, { area, field, resolve, props, coord }) {
    // Under a polar coord the centre, radius, hole and sweep are the coord's; the mark's own props win.
    const f = coord?.frame ?? {};
    const cx = f.cx ?? (area.left + area.right) / 2, cy = f.cy ?? (area.top + area.bottom) / 2;
    const radius = f.R ?? Math.min(area.width, area.height) / 2;
    const arc = d3.arc().digits(2).innerRadius(props.inner != null ? props.inner * radius : f.inner ?? 0).outerRadius(radius)
      .padAngle(props.padAngle ?? 0).cornerRadius(props.cornerRadius ?? 0);
    return d3.pie().sort(null).startAngle(props.startAngle ?? f.start ?? 0).endAngle(props.endAngle ?? f.end ?? 2 * Math.PI)
      .value(r => field(r, 'value'))(rows)
      .map(a => ({ t: 'path', d: arc(a), transform: `translate(${cx},${cy})`,
        ...Object.fromEntries(['fill', 'stroke', 'opacity', 'strokeWidth', 'strokeDasharray', 'strokeOpacity', ...EFFECTS].map(n => [n, resolve(a.data, n)])) }));
  },
});

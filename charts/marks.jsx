// The built-in marks. They use only `defineMark` and `ctx`, the same seam a third-party mark has.
import * as d3 from 'd3';
import { defineMark, top, text, FONT_SIZE } from './core.jsx';

const CURVES = { linear: d3.curveLinear, 'step-after': d3.curveStepAfter, monotone: d3.curveMonotoneX };
const curve = name => CURVES[name ?? 'linear'] ?? name;

// One path per group and colour, points in pixel order along `along` unless `sort={false}`.
// Styles read the first real row: stack() may have added rows with no datum.
function paths(rows, ctx, along, generator, style) {
  return d3.groups(rows, r => r.group, r => r.color).flatMap(([, byColor]) => byColor.map(([, group]) => {
    const sorted = ctx.props.sort === false ? group : d3.sort(group, r => ctx[along](r[along]));
    return { t: 'path', d: generator(sorted) + (ctx.props.closed ? 'Z' : ''), ...style(group.find(r => r.d != null) ?? group[0]) };
  }));
}

export const Line = defineMark('line', {
  color: 'stroke',
  render(rows, ctx) {
    const p = ctx.props;
    const generator = d3.line().digits(2).defined(r => top(r) != null)
      .x(r => ctx.x(r.x)).y(r => ctx.y(top(r))).curve(curve(p.curve));
    return paths(rows, ctx, 'x', generator, row => ({ fill: 'none', stroke: ctx.resolve(row, 'stroke'),
      strokeWidth: p.strokeWidth ?? 1.75, strokeDasharray: p.strokeDasharray, opacity: p.opacity }));
  },
});

const hasInterval = (rows, axis) => rows.some(r => r[axis + '1'] != null || r[axis + '2'] != null);

// Vertical: `x` with `y1 y2`, or `y` alone, filled from 0. Horizontal: `y` with `x1 x2`.
export const Area = defineMark('area', {
  domain: rows => (!hasInterval(rows, 'x') && !hasInterval(rows, 'y') ? { y: [0] } : {}),
  render(rows, ctx) {
    const p = ctx.props, generator = d3.area().digits(2).curve(curve(p.curve));
    const horizontal = hasInterval(rows, 'x');
    if (horizontal) {
      generator.defined(r => r.x1 != null && r.x2 != null).y(r => ctx.y(r.y)).x0(r => ctx.x(r.x1)).x1(r => ctx.x(r.x2));
    } else {
      generator.defined(r => top(r) != null).x(r => ctx.x(r.x))
        .y0(r => ctx.y(r.y1 ?? 0)).y1(r => ctx.y(top(r)));
    }
    return paths(rows, ctx, horizontal ? 'y' : 'x', generator, row => ({ fill: ctx.resolve(row, 'fill'),
      fillOpacity: p.fillOpacity ?? 0.85, opacity: p.opacity }));
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

function rects(rows, ctx, baseline) {
  const valueAxis = ctx.bandwidth.y() ? 'x' : 'y';
  return rows.flatMap(r => {
    const xs = extent(r, 'x', ctx, valueAxis === 'x' ? baseline : undefined);
    const ys = extent(r, 'y', ctx, valueAxis === 'y' ? baseline : undefined);
    if (!xs || !ys) return [];
    const [x, right] = [Math.min(...xs), Math.max(...xs)], [y, bottom] = [Math.min(...ys), Math.max(...ys)];
    const style = { fill: ctx.resolve(r, 'fill'), stroke: ctx.resolve(r, 'stroke'), strokeWidth: ctx.resolve(r, 'strokeWidth'),
      fillOpacity: ctx.resolve(r, 'fillOpacity'), opacity: ctx.resolve(r, 'opacity') };
    // SVG draws nothing for a zero-size rect; a flat one is a line (a box plot's median, a
    // doji), stroked with the fill when it has no stroke of its own.
    const flat = { ...style, stroke: style.stroke ?? style.fill, strokeWidth: style.strokeWidth ?? 1 };
    if (y === bottom) return [{ t: 'line', x1: x, y1: y, x2: right, y2: y, ...flat }];
    if (x === right) return [{ t: 'line', x1: x, y1: y, x2: x, y2: bottom, ...flat }];
    return [{ t: 'rect', x, y, width: right - x, height: bottom - y, rx: ctx.resolve(r, 'rx'), ...style }];
  });
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
  render: (rows, ctx) => rects(rows, ctx, ctx.props.baseline ?? 0),
});

export const Dot = defineMark('dot', {
  render: (rows, ctx) => rows.filter(r => top(r) != null).map(r => ({ t: 'circle', cx: ctx.x(r.x), cy: ctx.y(top(r)),
    r: ctx.resolve(r, 'r', 3), fill: ctx.resolve(r, 'fill'), stroke: ctx.resolve(r, 'stroke'), opacity: ctx.resolve(r, 'opacity') })),
});

// A segment from (x1, y1) to (x2, y2); a missing end takes the point channel.
export const Link = defineMark('link', {
  color: 'stroke',
  render: (rows, ctx) => rows.map(r => ({ t: 'line',
    x1: ctx.x(r.x1 ?? r.x), y1: ctx.y(r.y1 ?? r.y), x2: ctx.x(r.x2 ?? r.x), y2: ctx.y(r.y2 ?? r.y),
    stroke: ctx.resolve(r, 'stroke'), strokeWidth: ctx.resolve(r, 'strokeWidth', 1),
    strokeDasharray: ctx.resolve(r, 'strokeDasharray'), opacity: ctx.resolve(r, 'opacity') })),
});

// Drawn unclipped, on top: at `x` and the far end of y (`y2 ?? y`).
export const Text = defineMark('text', {
  render(rows, ctx) {
    const { area, theme } = ctx;
    return rows.map(r => text(
      (r.x != null ? ctx.x(r.x) : area.left) + ctx.resolve(r, 'dx', 0),
      (top(r) != null ? ctx.y(top(r)) : area.top) + ctx.resolve(r, 'dy', 0),
      String(ctx.resolve(r, 'text', '')),
      { fontSize: ctx.resolve(r, 'fontSize', FONT_SIZE), fontFamily: theme.font,
        textAnchor: ctx.resolve(r, 'textAnchor', 'middle'), fill: ctx.resolve(r, 'fill', theme.muted), front: true }));
  },
});

// A wedge per row: pie, donut (`inner`, a fraction of the radius) or gauge (`startAngle`,
// `endAngle`). `value` is read by the mark, not trained, so a pie needs no x or y scale.
export const Arc = defineMark('arc', {
  render(rows, { area, field, resolve, props }) {
    const cx = (area.left + area.right) / 2, cy = (area.top + area.bottom) / 2;
    const radius = Math.min(area.width, area.height) / 2;
    const arc = d3.arc().digits(2).innerRadius((props.inner ?? 0) * radius).outerRadius(radius);
    return d3.pie().sort(null).startAngle(props.startAngle ?? 0).endAngle(props.endAngle ?? 2 * Math.PI)
      .value(r => field(r, 'value'))(rows)
      .map(a => ({ t: 'path', d: arc(a), transform: `translate(${cx},${cy})`,
        fill: resolve(a.data, 'fill'), stroke: resolve(a.data, 'stroke'), opacity: resolve(a.data, 'opacity') }));
  },
});

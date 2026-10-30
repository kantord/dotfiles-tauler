// Reference lines and ticks: thin variants of Link and Vector (SPEC 5.2).
import * as d3 from 'd3';
import { builtinMark, top } from './core.jsx';
import { LINE, styleOf } from './effects.jsx';

const lineStyle = (ctx, row) => ({ ...styleOf(ctx, row, LINE), stroke: ctx.resolve(row, 'stroke', ctx.theme.muted), strokeWidth: ctx.resolve(row, 'strokeWidth', 1) });

// A line across the whole plot at each row's value on `axis`; the other axis' ends are its
// `x1`/`x2` (or `y1`/`y2`) channels, else the plot's edges. With constants only (`<RuleY y={90}/>`)
// it is one line and inherits nothing. Under a coord it is a path along the coord.
const rule = axis => builtinMark('rule' + axis, {
  color: 'stroke',
  render: (rows, ctx) => rows.flatMap(r => {
    const across = axis === 'x' ? 'y' : 'x', at = r[axis];
    if (at == null) return [];
    const ends = [r[across + '1'] ?? -Infinity, r[across + '2'] ?? Infinity];
    const style = lineStyle(ctx, r);
    // On a map the plot's edges are the globe's (a meridian runs pole to pole), walked in steps so a parallel curves.
    const place = (axis === 'x' ? e => [at, e] : e => [e, at]), reach = across === 'y' ? 90 : 180;
    const pair = ctx.projection ? d3.range(Math.max(ends[0], -reach), Math.min(ends[1], reach) + 1e-9, 5).map(place) : ends.map(place);
    if (ctx.coord) { const d = ctx.line(pair); return d ? [{ t: 'path', d, fill: 'none', ...style }] : []; }
    const [a, b] = pair.map(p => [ctx.x(p[0]), ctx.y(p[1])]);
    return [{ t: 'line', x1: a[0], y1: a[1], x2: b[0], y2: b[1], ...style }];
  }),
});
// The other axis is not inherited: a rule belongs to one axis.
const free = (build, other) => (props = {}) => build({ [other]: null, ...props });

export const RuleX = free(rule('x'), 'y');
export const RuleY = free(rule('y'), 'x');

// A short line across each point, `length` px long (a constant, or a field or function of the
// datum; default 10): vertical for TickX (a tick on the x axis), horizontal for TickY.
const tick = axis => builtinMark('tick' + axis, {
  color: 'stroke',
  render: (rows, ctx) => rows.flatMap(r => {
    const p = ctx.point(r.x, top(r), r), half = (ctx.field(r, 'length') ?? 10) / 2;
    if (!p) return [];
    const [dx, dy] = axis === 'x' ? [0, half] : [half, 0];
    return [{ t: 'line', x1: p[0] - dx, y1: p[1] - dy, x2: p[0] + dx, y2: p[1] + dy, ...lineStyle(ctx, r) }];
  }),
});
export const TickX = tick('x');
export const TickY = tick('y');

// Polar coordinates (SPEC 5.13): `<Plot coord={polar({ inner, startAngle, endAngle })}>`. A coord in
// the contract of coord.jsx, but one that reads the trained x/y scales (`positions: true`): x is
// the angle and y the radius. Angles are radians, clockwise from straight up, as in d3
// (`pointRadial`, `arc`). Depends on d3, the tick rule of guides.jsx and the line shape.
import * as d3 from 'd3';
import { DEFAULT } from './scales.jsx';
import { tickValues } from './ticks.jsx';
import { line } from './scene.jsx';

const TAU = 2 * Math.PI;
const STEP = TAU / 90;       // the widest angle a densified segment spans
export const GAP = 6;               // px between a label and the point it names
const SHAPES = ['circle', 'polygon'];
const OPEN = 1e-9;

export function polar({ inner = 0, startAngle = 0, endAngle = TAU } = {}) {
  if (!(inner >= 0 && inner < 1)) throw new Error(`polar: inner must be in [0, 1) (a fraction of the radius), got ${inner}`);
  if (!Number.isFinite(startAngle) || !Number.isFinite(endAngle) || startAngle === endAngle) {
    throw new Error('polar: startAngle and endAngle must be different numbers (radians, clockwise from up)');
  }
  return { positions: true, sweep: { start: startAngle, end: endAngle }, bind: area => bind(area, inner, startAngle, endAngle) };
}

function bind(area, inner, start, end) {
  const cx = (area.left + area.right) / 2, cy = (area.top + area.bottom) / 2;
  const R = Math.min(area.width, area.height) / 2, r0 = inner * R;
  const full = Math.abs(end - start) >= TAU - OPEN;
  const angleOf = t => start + t * (end - start), radiusOf = t => r0 + t * (R - r0);
  const xy = (a, r) => { const [x, y] = d3.pointRadial(a, r); return [cx + x, cy + y]; };
  const path = () => d3.line().digits(2).defined(p => p != null);

  // A pixel position along an axis as a fraction of the area. y runs bottom to top on a
  // continuous scale and top to bottom on a band or point scale, so the first category is innermost.
  const norm = (channel, p, discrete) => channel === 'x' ? (p - area.left) / area.width
    : discrete ? (p - area.top) / area.height : (area.bottom - p) / area.height;
  // A data value as a fraction; a band value at its band centre, or its slot's middle.
  function unit(channel, v, scale, row) {
    if (v === -Infinity) return 0;
    if (v === Infinity) return 1;
    if (v == null || !scale) return NaN;
    const p = scale.bandwidth ? scale(v) + scale.bandwidth() * (row?.u1 != null ? (row.u1 + row.u2) / 2 : 0.5) : scale(v);
    return norm(channel, p, !!scale.step);
  }
  const polarOf = (x, y, scales, row) => {
    const a = unit('x', x, scales.x, row), r = unit('y', y, scales.y, row);
    return Number.isFinite(a) && Number.isFinite(r) ? [angleOf(a), radiusOf(r)] : null;
  };
  const point = (x, y, scales, row) => { const p = polarOf(x, y, scales, row); return p && xy(...p); };

  // Between two points on a continuous angle the path follows (angle, radius) linearly: a circle
  // arc, a spiral. On a band or point angle it is a chord, so a radar is a polygon.
  function lineThrough(points, scales, { curve = d3.curveLinear } = {}) {
    const discrete = !!scales.x?.step, out = [];
    for (const pt of points) {
      const cur = pt && polarOf(pt[0], pt[1], scales);
      const prev = out.at(-1);
      if (cur && prev && !discrete) {
        const n = Math.ceil(Math.abs(cur[0] - prev[0]) / STEP);
        for (let k = 1; k < n; k++) out.push([prev[0] + (cur[0] - prev[0]) * k / n, prev[1] + (cur[1] - prev[1]) * k / n]);
      }
      out.push(cur);
    }
    return path().curve(curve)(out.map(p => p && xy(...p)));
  }

  // A wedge from pixel intervals along x and y (a Rect's own extents): a `d` to translate by
  // `transform`, or a `line` when it has no angle.
  function wedge(xs, ys, scales, { cornerRadius = 0 } = {}) {
    const discrete = !!scales.y?.step;
    const [a0, a1] = d3.extent(xs, p => angleOf(norm('x', p))), [ra, rb] = d3.extent(ys, p => radiusOf(norm('y', p, discrete)));
    if (![a0, a1, ra, rb].every(Number.isFinite)) return null;
    if (a0 === a1) return { line: [...xy(a0, ra), ...xy(a0, rb)] };
    const d = d3.arc().digits(2).cornerRadius(cornerRadius)({ innerRadius: ra, outerRadius: rb, startAngle: a0, endAngle: a1 });
    return { d, transform: `translate(${cx},${cy})` };
  }

  // Where a label goes and how it is anchored, from the angle of its point: outside, away from the centre.
  function label([px, py]) {
    const dx = px - cx, dy = py - cy, d = Math.hypot(dx, dy);
    if (d < 1e-6) return { x: px, y: py, textAnchor: 'middle' };
    const sin = dx / d, cos = -dy / d, anchor = Math.abs(sin) < 0.05 ? 'middle' : sin > 0 ? 'start' : 'end';
    return { x: px + sin * GAP, y: py - cos * GAP, textAnchor: anchor, dy: anchor !== 'middle' ? '0.32em' : cos < 0 ? '0.71em' : undefined };
  }

  // The ticks of the angle as angles: a full circle drops a last tick that meets the first.
  function angleTicks(scale, ticks) {
    if (!scale) return [];
    const values = Array.isArray(ticks) ? ticks : tickValues(scale, { channel: 'x', ticks }, R * Math.abs(end - start));
    const angles = values.map(v => angleOf(unit('x', v, scale)));
    return full && angles.length > 1 && Math.abs(angles.at(-1) - angles[0]) >= TAU - 1e-6 ? angles.slice(0, -1) : angles;
  }
  // A path at radius r through `around` (default: the whole sweep, as a circle arc).
  function ring(r, around, closed = false) {
    const steps = Math.ceil(Math.abs(end - start) / (TAU / 120));
    const angles = around ?? d3.range(steps + 1).map(i => start + (end - start) * i / steps);
    return path()(angles.map(a => xy(a, r))) + (closed && full ? 'Z' : '');
  }

  // Rings at the y ticks and spokes at the x ticks (or band centres); see SPEC 5.13. `axisTicks(channel,
  // scale)` gives the tick values of an Axis for the channel, which the grid follows unless it has `ticks`.
  function grid(g, scales, theme, axisTicks = () => undefined) {
    const channel = g.channel ?? 'y', shape = g.shape ?? 'circle';
    if (!SHAPES.includes(shape)) throw new Error(`Grid: unknown shape '${shape}' (use ${SHAPES.join(' or ')})`);
    const scaleOf = c => scales[c]?.[c === channel ? g.scale ?? DEFAULT : DEFAULT];
    const [sx, sy] = [scaleOf('x'), scaleOf('y')];
    const style = { stroke: g.tone === 'soft' ? theme.lineSoft : theme.line };
    const angles = angleTicks(sx, channel === 'x' && g.ticks != null ? g.ticks : axisTicks('x', g.scale));
    const shapes = [];
    if (channel === 'y' && sy) {
      const values = g.ticks == null ? axisTicks('y', g.scale) ?? tickValues(sy, { channel: 'y' }, 2 * R) : tickValues(sy, { channel: 'y', ticks: g.ticks }, 2 * R);
      const radii = values.map(v => radiusOf(unit('y', v, sy))).filter(r => r > 0.5);
      const around = shape === 'polygon' && angles.length > 1 ? angles : undefined;
      for (const r of d3.sort(radii)) shapes.push({ t: 'path', d: ring(r, around, shape === 'polygon'), fill: 'none', ...style });
    }
    if (g.spokes !== false || channel === 'x') for (const a of angles) shapes.push(line(...xy(a, r0), ...xy(a, R), style));
    return shapes;
  }

  // Two pixel points on one angle (a needle) are a straight line, not a path.
  const straight = (a, b) => {
    const [ax, ay, bx, by] = [a[0] - cx, a[1] - cy, b[0] - cx, b[1] - cy];
    return Math.abs(ax * by - ay * bx) < 1e-6 && ax * bx + ay * by >= 0;
  };

  // For axes (polaraxis.jsx): the angle and radius of a value on a scale, and a pixel point at both.
  const angle = (v, scale) => angleOf(unit('x', v, scale)), radius = (v, scale) => radiusOf(unit('y', v, scale));

  return { positions: true, point, line: lineThrough, wedge, label, grid, straight, at: xy, angle, radius, ring, angleTicks, centre: [cx, cy], frame: { cx, cy, R, inner: r0, start, end } };
}

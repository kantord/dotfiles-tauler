// Axes under a polar coord (SPEC 5.13): `Axis channel="x"` labels the angle around the rim, and
// `Axis channel="y"` the radius along a spoke. Both are the `axis` guide of guides.jsx, which hands
// over here when the coord reads the position scales; the geometry comes from the coord's own
// bound helpers (`angle`, `radius`, `at`, `ring`, `label`, `frame`).
import { buildScale, DEFAULT } from './scales.jsx';
import { FONT_SIZE, line, text } from './scene.jsx';
import { tickLabels } from './ticks.jsx';
import { GAP } from './polar.jsx';

const TAU = 2 * Math.PI, TICK_SIZE = 4, TICK_PADDING = 6;

function refuse(props) {
  const channel = props.channel ?? 'x';
  for (const [prop, why] of [['label', 'has no title'], ['labelAngle', 'does not turn labels'], ['at', 'is not placed inside the plot']]) {
    if (props[prop] !== undefined) throw new Error(`Axis ${channel}: under a polar coord an axis ${why} (${prop})`);
  }
  if (channel === 'x' && props.side !== undefined) throw new Error('Axis x: under a polar coord the angle axis has no side; a y axis takes left or right of its spoke');
  if (channel === 'y' && props.angle !== undefined && !Number.isFinite(props.angle)) throw new Error('Axis y: angle is in radians');
}

export const polarAxis = {
  claim(props, { domains, width, height, env }) {
    refuse(props);
    const channel = props.channel ?? 'x', domain = domains[channel]?.[props.scale ?? DEFAULT];
    if (!domain) return { room: {} };
    const { start, end } = env.coord.sweep, full = Math.abs(end - start) >= TAU - 1e-9;
    const R = Math.max(1, Math.min(width, height) / 2 - 8);   // before the labels take their room
    const length = channel === 'x' ? R * Math.abs(end - start) : 2 * R;
    const scale = buildScale(domain, [0, length], env.theme, channel);
    let ticks = tickLabels(scale, props, length, env.measure);
    if (channel === 'y') return { room: {}, data: { ticks } };
    const angleOf = t => start + (scale.bandwidth ? scale(t.value) + scale.bandwidth() / 2 : scale(t.value)) / length * (end - start);
    if (full && ticks.length > 1 && Math.abs(angleOf(ticks.at(-1)) - angleOf(ticks[0])) >= TAU - 1e-6) ticks = ticks.slice(0, -1);
    // Each label hangs outside the rim, away from the centre: wide to the sides, one line above or below.
    const room = {}, reach = (props.tickSize ?? TICK_SIZE) + GAP + 2;
    const need = (side, size) => { room[side] = Math.max(room[side] ?? 0, Math.ceil(size + reach)); };
    for (const t of ticks) {
      const a = angleOf(t), sin = Math.sin(a), width1 = env.measure(t.label, FONT_SIZE);
      if (Math.abs(sin) >= 0.05) need(sin > 0 ? 'right' : 'left', width1);
      else need(Math.cos(a) > 0 ? 'top' : 'bottom', FONT_SIZE);
    }
    return { room, data: { ticks } };
  },
  shapes(props, data, scales, area, env) {
    const scale = scales[props.channel ?? 'x']?.[props.scale ?? DEFAULT];
    if (!scale || !data) return [];
    const { bound, theme } = env, { R, inner, start } = bound.frame, tick = props.tickSize ?? TICK_SIZE;
    const stroke = { stroke: theme.lineStrong, crisp: true }, style = { fontFamily: theme.font, fill: theme.muted };
    const shapes = [];
    if ((props.channel ?? 'x') === 'x') {
      if (props.line !== false) shapes.push({ t: 'path', d: bound.ring(R), fill: 'none', stroke: theme.lineStrong });
      for (const { value, label } of data.ticks) {
        const a = bound.angle(value, scale); if (!Number.isFinite(a)) continue;
        if (tick > 0) shapes.push(line(...bound.at(a, R), ...bound.at(a, R + tick), stroke));
        if (!label) continue;
        const { x, y, textAnchor, dy } = bound.label(bound.at(a, R + tick));
        shapes.push(text(x, y, label, { ...style, textAnchor, ...(dy ? { dy } : {}) }));
      }
      return shapes;
    }
    // A spoke from the hole to the rim; `left` and `right` are the sides of a walk outward along it.
    const a = props.angle ?? start, sign = props.side === 'right' ? 1 : -1, [px, py] = [Math.cos(a) * sign, Math.sin(a) * sign];
    if (props.line !== false) shapes.push(line(...bound.at(a, inner), ...bound.at(a, R), stroke));
    for (const { value, label } of data.ticks) {
      const r = bound.radius(value, scale); if (!Number.isFinite(r)) continue;
      const [x, y] = bound.at(a, r);
      if (tick > 0) shapes.push(line(x, y, x + px * tick, y + py * tick, stroke));
      if (!label) continue;
      const anchor = Math.abs(px) < 0.05 ? 'middle' : px > 0 ? 'start' : 'end';
      shapes.push(text(x + px * (tick + TICK_PADDING), y + py * (tick + TICK_PADDING), label,
        { ...style, textAnchor: anchor, ...(anchor !== 'middle' ? { dy: '0.32em' } : py > 0 ? { dy: '0.71em' } : {}) }));
    }
    return shapes;
  },
};

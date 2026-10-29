// Guides: ticks, the room their labels need, and the axis and grid shapes.
import * as d3 from 'd3';
import { buildScale, at, DEFAULT } from './scales.jsx';
import { FONT_SIZE, line, text, across, fit } from './scene.jsx';
import { legend } from './legend.jsx';
import { extentOf, rotation } from './typeset.jsx';
import { isHorizontal, tickValues, tickLabels, tickCount } from './ticks.jsx';
import { polarAxis } from './polaraxis.jsx';

const TICK_SIZE = 4, TICK_PADDING = 6, TITLE = FONT_SIZE + 4;

const SIDES = { x: ['bottom', 'top'], y: ['left', 'right'] };
// A turned label hangs from its tick: its end at the tick for a rise, its start for a fall.
const anchorOf = angle => angle < 0 ? 'end' : angle > 0 ? 'start' : 'middle';
const sideOf = axis => axis.side ?? SIDES[axis.channel ?? 'x'][0];

// The count a y scale's domain is niced for: that of the Axis reading the scale (its `ticks` when a
// number) at the scale's final length, so the last tick is the domain end. x uses 10.
export function niceCount(guides, channel, name, length) {
  if (channel !== 'y') return 10;
  const axis = guides.find(g => g.kind === 'axis' && !g.props.guide && (g.props.channel ?? 'x') === 'y' && (g.props.scale ?? DEFAULT) === name)?.props;
  return tickCount({ channel, ticks: typeof axis?.ticks === 'number' ? axis.ticks : undefined }, length);
}

// The ticks of a y axis on the scale as built, over the final plot height; the claim made its
// `claimed` ticks over an estimated length, only to size the margin. When the values agree they
// are kept (labels are formatted once per axis); labels are cut to `space` px.
export function finalTicks(props, scale, area, env, { ticks: claimed, space }) {
  const values = tickValues(scale, props, area.height);
  if (values.length === claimed.length && values.every((v, i) => +v === +claimed[i].value)) return claimed;
  const ticks = tickLabels(scale, props, area.height, env.measure);
  if (space !== undefined) for (const t of ticks) t.label = fit(t.label, space, env.measure);
  return ticks;
}

export function checkChannel(piece, channel, allowed) {
  if (!allowed.includes(channel)) throw new Error(`${piece}: unknown channel '${channel}' (use ${allowed.join(', ')})`);
}

/* ---------- guides: each is { check?, claim, shapes } and is claimed in the margin stage ---------- */

// claim(props, st) -> { room, extent?, data? }, with st = { domains, width, height, env, placed, margin }:
//   room    the margin each side needs, { top?, right?, bottom?, left? }
//   side    the side it sits on
//   extent  how far the guide reaches outward on that side; later guides on it start beyond it
//           (`st.placed`)
//   data    what shapes(props, data, scales, area, env) needs
const axis = {
  check(props) {
    const channel = props.channel ?? 'x';
    checkChannel('Axis', channel, Object.keys(SIDES));
    if (props.labelAngle !== undefined && (channel !== 'x' || sideOf(props) !== 'bottom' || !Number.isFinite(props.labelAngle))) throw new Error('Axis: labelAngle (degrees) turns the labels of a bottom x axis');
    if (props.side !== undefined && !SIDES[channel].includes(props.side)) {
      throw new Error(`Axis ${channel}: side "${props.side}" must be ${SIDES[channel].join(' or ')}`);
    }
    if (props.at !== undefined && props.label) throw new Error('Axis: an axis inside the plot (at) has no room for a title; drop label');
  },
  claim(props, { domains, width, height, env, placed }) {
    if (env.coord?.positions) return polarAxis.claim(props, { domains, width, height, env });
    const channel = props.channel ?? 'x', domain = domains[channel]?.[props.scale ?? DEFAULT];
    if (!domain) return { room: {}, side: sideOf(props) };
    const horizontal = isHorizontal(props), side = sideOf(props), tick = props.tickSize ?? TICK_SIZE;
    const length = Math.max(60, horizontal ? width - 80 : height - 40);
    const scale = buildScale(domain, [0, length], env.theme, channel, niceCount([{ kind: 'axis', props }], channel, props.scale ?? DEFAULT, length));
    const ticks = tickLabels(scale, props, length, env.measure);
    const labels = ticks.map(t => t.label), widest = d3.max(labels, l => env.measure(l, FONT_SIZE)) ?? 0;
    const room = {};
    let reach, space;
    if (horizontal) {
      // A turned label hangs from the tick at its anchor: it needs room below, and past the plot's sides.
      const turned = labels.map(l => extentOf(env.measure(l, FONT_SIZE), FONT_SIZE, props.labelAngle ?? 0, anchorOf(props.labelAngle)));
      reach = tick + TICK_PADDING + (props.labelAngle ? Math.ceil(d3.max(turned, b => b.down) ?? FONT_SIZE) : FONT_SIZE) + 3;
      if (props.labelAngle) {
        room.left = Math.ceil(d3.max(ticks, (t, i) => turned[i].left - (at(scale, t.value) ?? 0)) ?? 0) + 2;
        room.right = Math.ceil(d3.max(ticks, (t, i) => turned[i].right - (length - (at(scale, t.value) ?? 0))) ?? 0) + 2;
      } else if (!scale.bandwidth && labels.length) {   // the end labels overhang the plot area
        room.left = Math.ceil(env.measure(labels[0], FONT_SIZE) / 2) + 2;
        room.right = Math.ceil(env.measure(labels.at(-1), FONT_SIZE) / 2) + 2;
      }
    } else {
      // Labels take at most a third of the width; longer ones are cut with an ellipsis.
      space = width / 3;
      if (widest > space) for (const t of ticks) t.label = fit(t.label, space, env.measure);
      reach = Math.ceil(tick + TICK_PADDING + Math.min(widest, space)) + 2;
    }
    if (props.at !== undefined) return { room, side, data: { ticks, reach, space } };   // inside the plot: it claims no room on a side
    const extent = reach + (props.label ? TITLE : 0);
    room[side] = placed[side] + extent;
    return { room, extent, side, data: { ticks, offset: placed[side], reach, space } };
  },
  shapes(props, data, scales, area, env) {
    if (env.coord?.positions) return polarAxis.shapes(props, data, scales, area, env);
    const { offset, reach } = data ?? {};
    const scale = scales[props.channel ?? 'x']?.[props.scale ?? DEFAULT]; if (!scale) return [];
    const ticks = isHorizontal(props) ? data.ticks : finalTicks(props, scale, area, env, data);
    const { theme } = env, horizontal = isHorizontal(props), side = sideOf(props);
    const sign = side === 'bottom' || side === 'right' ? 1 : -1, tick = props.tickSize ?? TICK_SIZE;
    const crossing = scales[horizontal ? 'y' : 'x']?.[DEFAULT];   // the scale an inside axis sits on
    const base = props.at !== undefined ? crossing && at(crossing, props.at) : { bottom: area.bottom, top: area.top, left: area.left, right: area.right }[side] + sign * offset;
    if (base == null || Number.isNaN(base)) return [];
    const stroke = { stroke: theme.lineStrong, crisp: true };
    const label = { fontFamily: theme.font, fill: theme.muted };
    const shapes = [];
    if (props.line !== false) shapes.push(horizontal ? line(area.left, base, area.right, base, stroke) : line(base, area.top, base, area.bottom, stroke));
    for (const { value, label: content } of ticks) {
      const p = at(scale, value); if (p == null || Number.isNaN(p)) continue;
      const far = base + sign * (tick + TICK_PADDING);
      if (tick > 0) {
        const [near, away] = sign > 0 ? [base, base + tick] : [base - tick, base];
        shapes.push(horizontal ? line(p, near, p, away, stroke) : line(near, p, away, p, stroke));
      }
      if (!content) continue;
      const turn = horizontal && props.labelAngle ? { transform: rotation(props.labelAngle, p, far) } : {};
      shapes.push(horizontal ? text(p, far, content, { ...label, ...(sign > 0 ? { dy: '0.71em' } : {}), textAnchor: anchorOf(props.labelAngle), ...turn })
        : text(far, p, content, { ...label, dy: '0.32em', textAnchor: sign > 0 ? 'start' : 'end' }));
    }
    if (props.label) {
      const edge = base + sign * reach, mid = horizontal ? (area.left + area.right) / 2 : (area.top + area.bottom) / 2;
      const style = { ...label, textAnchor: 'middle' };
      if (horizontal) shapes.push(text(mid, edge + sign * (sign > 0 ? 2 : 3), props.label, { ...style, ...(sign > 0 ? { dy: '0.71em' } : {}) }));
      else {
        const x = sign > 0 ? edge + TITLE - 2 : edge - TITLE + 2;   // the edge of the title's column
        shapes.push(text(x, mid, props.label, { ...style, dy: '0.71em', transform: `rotate(${sign > 0 ? 90 : -90} ${Math.round(x * 100) / 100} ${Math.round(mid * 100) / 100})` }));
      }
    }
    return shapes;
  },
};

export const GUIDES = { axis, legend };

// `defineGuide(name, { check?, claim, shapes })` registers a guide kind and returns its piece,
// `<Name {...props} />`; an `Axis` takes one for itself with `guide={...}` (SPEC 5.7).
const complete = (who, guide) => {
  if (typeof guide?.claim !== 'function' || typeof guide?.shapes !== 'function') throw new Error(`${who}: a guide needs claim and shapes functions`);
  return guide;
};
export function defineGuide(name, guide) {
  if (GUIDES[name]) throw new Error(`defineGuide: '${name}' already exists`);
  GUIDES[name] = complete('defineGuide', guide);
  return (props = {}) => ({ $: name, props });
}
// The guide a piece draws with: its own for an Axis that gives one, else the registered kind.
export const guideOf = (kind, props) => props.guide !== undefined && kind === 'axis' ? complete('Axis', props.guide) : GUIDES[kind];

// The room every guide asks for, side by side: a running max over the guides, axes first (so a
// guide's width budget is the plot width less the margins the axes produced), each in the order
// it was written. Claims are not additive, except that guides on one side stack. The `margin`
// prop overrides afterwards (areaStage).
export function claimRoom(guides, domains, width, height, env, rooms = []) {
  const margin = { top: 8, right: 8, bottom: 8, left: 8 }, placed = { top: 0, right: 0, bottom: 0, left: 0 }, data = new Map();
  // Marks claim first (an end label sits at the plot's edge), so guides on that side stack beyond.
  for (const room of rooms) for (const edge in room) {
    margin[edge] = Math.max(margin[edge], room[edge]);
    placed[edge] = Math.max(placed[edge], room[edge]);
  }
  const order = [...guides.filter(g => g.kind === 'axis'), ...guides.filter(g => g.kind !== 'axis')];
  for (const guide of order) {
    const { room, extent = 0, side, data: own } = (guide.guide ?? GUIDES[guide.kind]).claim(guide.props, { domains, width, height, env, placed, margin });
    for (const edge in room) margin[edge] = Math.max(margin[edge], room[edge]);
    if (extent) placed[side] += extent;
    data.set(guide, own);
  }
  return { margin, data };
}

// The `margin` prop as an object: a number is every side, an object keeps its sides, unset is none.
function explicitMargin(given) {
  if (given == null) return {};
  if (typeof given === 'number' && Number.isFinite(given)) return { top: given, right: given, bottom: given, left: given };
  if (typeof given === 'object' && !Array.isArray(given)) return given;
  throw new Error(`Plot margin: expected a number or { top, right, bottom, left }; got ${JSON.stringify(given)}`);
}

// The margin the plot gets: the guides' claims, with the `margin` prop over them (SPEC 5.7). The explicit
// edges alone (with the 8 px minimum on the others) must leave a plot area, or it throws (a programmer's
// mistake); the edges that came from claims (label widths: data) are scaled down to keep a quarter of each dimension.
export function fitMargin(claimed, given, { width, height }) {
  const explicit = explicitMargin(given);
  const margin = { ...claimed, ...explicit }, floor = { top: 8, right: 8, bottom: 8, left: 8 };
  for (const [name, size, edges] of [['height', height, ['top', 'bottom']], ['width', width, ['left', 'right']]]) {
    const own = edges.filter(e => explicit[e] != null), fromClaims = edges.filter(e => explicit[e] == null);
    const fixed = d3.sum(edges, e => explicit[e] ?? floor[e]);
    if (size - fixed <= 0) throw new Error(`Plot ${name}: ${size} leaves no room for margins; raise ${name} or lower margin`);
    const room = Math.max(0, size * 0.75 - d3.sum(own, e => explicit[e])), claims = d3.sum(fromClaims, e => claimed[e]);
    if (claims > room) for (const e of fromClaims) margin[e] = claimed[e] * room / claims;
  }
  return margin;
}

// Lines between the bands of a band scale, or at the ticks of a scale: the ticks of the
// channel's primary Axis (or the one for the scale it names), so lines and labels agree, unless
// `ticks` is given.
export function gridShapes(grid, axisTicks, scales, area, theme) {
  const channel = grid.channel ?? 'y', scale = scales[channel]?.[grid.scale ?? DEFAULT]; if (!scale) return [];
  const horizontal = channel === 'y';
  let positions;
  if (scale.bandwidth) {
    const domain = scale.domain();
    if (!domain.length) return [];
    const half = (scale.step() - scale.bandwidth()) / 2;
    positions = [...domain.map(v => scale(v) - half), scale(domain.at(-1)) + scale.bandwidth() + half];
  } else {
    const values = grid.ticks == null && axisTicks ? axisTicks.map(t => t.value)
      : tickValues(scale, { channel, ticks: grid.ticks }, horizontal ? area.height : area.width);
    positions = values.map(scale);
  }
  const style = { stroke: grid.tone === 'soft' ? theme.lineSoft : theme.line, crisp: true };
  return positions.map(p => across(area, horizontal, p, style));
}

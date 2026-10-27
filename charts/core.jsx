// A grammar of graphics on d3: the part of the charts that knows nothing about tauler.
//
//   JSX → plain descriptors → rows → positions → scales → marks' shapes → a serializable
//   scene → drawScene() into an <svg>
//
// compile() depends on its props only. tauler evaluates a layout in three runtimes and matches
// figures by a key hashed from the scene, so nothing here may read the clock or Math.random:
// take the time from a stream and pass it in. SPEC.md is the design.
import * as d3 from 'd3';

export const defaultTheme = {
  ink: '#142030', muted: '#5b6879',
  line: '#e0e5ec', lineSoft: '#edf0f4', lineStrong: '#c2cad5',
  palette: ['#2b59d1', '#df7a2c', '#13907b', '#c03c77', '#7a61d2', '#a5861a'],
  font: 'ui-monospace, monospace',
};

// Text width without a DOM: exact for a monospace font, where every character is 0.6 em wide.
export const defaultMeasure = (text, size) => String(text).length * size * 0.6;

const CHANNELS = ['x', 'x1', 'x2', 'y', 'y1', 'y2', 'color', 'group'];
const AXES = { x: ['x', 'x1', 'x2'], y: ['y', 'y1', 'y2'] };
const TICK_SIZE = 4, TICK_PADDING = 6, CLIP_BLEED = 4;
export const FONT_SIZE = 11;

/* ---------- descriptors: what JSX evaluates to ---------- */

// The mark's name goes in `mark`, not `type`: tauler's JSX factory reshapes any returned
// object with both `type` and `props` into one of its own layout nodes.
//
// A mark is `render(rows, ctx) -> shapes`, plus an optional `domain(rows, props, scaleOptions)`
// returning `{ x?: [...], y?: [...] }`, values the continuous scales must cover. `color` names
// the style prop the colour channel feeds ('fill', or 'stroke' for line-like marks).
export const defineMark = (name, { render, domain, color = 'fill' }) =>
  (props = {}) => ({ $: 'mark', mark: name, render, domain, color, props });
const piece = kind => (props = {}) => ({ $: kind, props });

export const Layer = piece('layer');   // shares data and channels with the marks inside it
export const Scale = piece('scale');
export const Axis = piece('axis');
export const Grid = piece('grid');

const pickChannels = props => {
  const channels = {};
  for (const c of CHANNELS) if (props[c] !== undefined) channels[c] = props[c];
  return channels;
};
// A mark inherits every channel it does not set, except that setting any channel of an axis
// drops all the inherited channels of that axis; `channel={null}` drops just that one.
function inherit(inherited, own) {
  const channels = { ...inherited };
  for (const names of Object.values(AXES)) {
    if (names.some(c => c in own)) for (const c of names) delete channels[c];
  }
  Object.assign(channels, own);
  for (const c in channels) if (channels[c] === null) delete channels[c];
  return channels;
}
// A channel is a field name, a function of the datum, an array (one value per row: columnar
// data), or a constant.
const accessor = v => typeof v === 'function' ? v : typeof v === 'string' ? d => d[v]
  : Array.isArray(v) ? (d, i) => v[i] : () => v;
// ±Infinity is a constant too: the plot's edge.
const isConstant = v => typeof v === 'number' || v instanceof Date;
const keyOf = v => v instanceof Date ? +v : v;

// Wrapper components have already run, so whatever they returned is just more descriptors.
function collect(node, inherited, spec) {
  if (Array.isArray(node)) { for (const n of node) collect(n, inherited, spec); return spec; }
  if (!node || typeof node !== 'object') return spec;
  const props = node.props ?? {};
  switch (node.$) {
    case 'mark': {
      const { children, data, ...rest } = props;
      spec.layers.push({ mark: node.mark, render: node.render, domain: node.domain, color: node.color, props: rest, ownData: data ?? inherited.layerData,
        data: data ?? inherited.data, channels: inherit(inherited.channels, pickChannels(rest)) });
      break;
    }
    case 'layer':
      collect(props.children, { data: props.data ?? inherited.data, layerData: props.data ?? inherited.layerData, channels: inherit(inherited.channels, pickChannels(props)) }, spec);
      break;
    case 'scale': spec.scales[props.channel] = { ...spec.scales[props.channel], ...props }; break;
    case 'axis': spec.axes.push(props); break;
    case 'grid': spec.grids.push(props); break;
  }
  return spec;
}

/* ---------- rows: each datum's channel values ---------- */

export const top = row => row.y2 ?? row.y;

function evaluate(layer, options) {
  let data = layer.data ?? [];
  const own = Object.entries(pickChannels(layer.props)).filter(([, v]) => v !== null);
  // An annotation (`<Link y1={90} y2={90} x1={-Infinity} x2={Infinity}/>`): no data of its own
  // or its Layer's, and only constants, so one row that inherits nothing.
  if (layer.ownData === undefined && own.length && own.every(([, v]) => isConstant(v))) {
    data = [{}];
    layer.channels = Object.fromEntries(own);
  }
  // Columns with no rows: one row per array element; the datum is the index.
  const columns = Object.values(layer.channels).filter(Array.isArray);
  if (layer.data === undefined && columns.length) data = d3.range(d3.max(columns, c => c.length));
  const accessors = Object.entries(layer.channels).map(([c, v]) => [c, accessor(v)]);
  layer.rows = data.map((d, i) => {
    const row = { d };
    for (const [c, get] of accessors) row[c] = get(d, i);
    return row;
  });
  // JSON has no Dates: a declared time scale reads strings and numbers as dates.
  for (const [name, channels] of Object.entries(AXES)) {
    if (options[name]?.type !== 'time') continue;
    for (const r of layer.rows) for (const c of channels) {
      if (r[c] != null && !isDate(r[c]) && !(isNumber(r[c]) && !Number.isFinite(r[c]))) r[c] = new Date(r[c]);
    }
  }
  if (layer.props.position) layer.rows = layer.props.position(layer.rows, { props: layer.props, mark: layer.mark });
  return layer;
}

/* ---------- positions: rows -> rows, in data space, before any scale exists ---------- */

const seriesOf = by => typeof by === 'function' ? by : by ? r => r[by] : r => r.group ?? r.color;
const firstSeen = (rows, get) => [...new Set(rows.map(r => keyOf(get(r))))];

// Piles rows sharing `groupBy` along `along`, writing `y1 y2` (`x1 x2`), series in first-seen
// order; negatives pile downward from 0. `expand` scales each pile to 1. For an Area, a series
// missing at some `groupBy` value gets a 0 there, so the band above does not jump.
export const stack = ({ by, along = 'y', groupBy, offset = 'zero' } = {}) => (rows, { mark }) => {
  // By default rows pile by their position across: `x`, or `x1` for interval bars (a histogram).
  const across = along === 'y' ? 'x' : 'y';
  groupBy ??= rows.some(r => r[across] != null) ? across : across + '1';
  const series = seriesOf(by), order = firstSeen(rows, series);
  if (mark === 'area') {
    const templates = new Map(rows.map(r => [keyOf(series(r)), r]));
    for (const pile of d3.group(rows, r => keyOf(r[groupBy])).values()) {
      const present = new Set(pile.map(r => keyOf(series(r))));
      for (const [key, template] of templates) {
        if (!present.has(key)) rows.push({ ...template, d: null, [groupBy]: pile[0][groupBy], [along]: 0 });
      }
    }
  }
  const [start, end] = [along + '1', along + '2'];
  for (const pile of d3.group(rows, r => keyOf(r[groupBy])).values()) {
    const sorted = d3.sort(pile, r => order.indexOf(keyOf(series(r))));
    let up = 0, down = 0;
    for (const r of sorted) {
      const v = Number.isFinite(r[along]) ? r[along] : 0;   // null, NaN: nothing to pile
      if (v >= 0) { r[start] = up; r[end] = up += v; } else { r[start] = down; r[end] = down += v; }
    }
    const total = up - down;
    if (offset === 'expand' && total > 0) for (const r of pile) { r[start] /= total; r[end] /= total; }
  }
  return rows;
};

// Gives each series a slot of its band: `u1 u2`, fractions of the band that Rect applies on its
// band axis. Never trained, so it needs no scale.
export const dodge = ({ by, padding = 0.1 } = {}) => rows => {
  const series = seriesOf(by), order = firstSeen(rows, series), slot = 1 / order.length;
  for (const r of rows) {
    const i = order.indexOf(keyOf(series(r)));
    r.u1 = (i + padding / 2) * slot;
    r.u2 = (i + 1 - padding / 2) * slot;
  }
  return rows;
};

/* ---------- scales: domains trained across every layer ---------- */

// What a row trains on an axis: its interval when it has one, else its point. Edges
// (±Infinity) train nothing.
function trainable(row, [point, start, end]) {
  const values = row[start] != null || row[end] != null ? [row[start], row[end]] : [row[point]];
  return values.filter(v => v != null && !(typeof v === 'number' && !Number.isFinite(v)));
}
const SCALE_CHANNELS = { ...AXES, color: ['color'] };

const isNumber = v => typeof v === 'number';
const isDate = v => v instanceof Date;

// Every value decides: all Dates -> time, all numbers -> linear, anything else -> band.
// Colour: all numbers -> sequential, else ordinal.
function inferType(name, values) {
  const numbers = values.every(isNumber);
  if (name === 'color') return numbers ? 'sequential' : 'ordinal';
  return values.every(isDate) ? 'time' : numbers ? 'linear' : 'band';
}

function trainDomains(layers, options) {
  const hints = {}, trained = {};
  for (const l of layers) {
    for (const [name, values] of Object.entries(l.domain?.(l.rows, l.props, options) ?? {})) (hints[name] ??= []).push(...values);
  }
  for (const [name, channels] of Object.entries(SCALE_CHANNELS)) {
    const opt = options[name] ?? {};
    const values = [];
    for (const l of layers) for (const r of l.rows) values.push(...trainable(r, channels));
    if (!values.length && !opt.domain) continue;
    trained[name] = { opt, values, type: opt.type ?? inferType(name, values.length ? values : opt.domain) };
  }
  const domains = {};
  for (const [name, { opt, values, type }] of Object.entries(trained)) {
    let domain = opt.domain;
    if (!domain && (type === 'band' || type === 'ordinal')) {
      domain = [...new d3.InternSet(values)];
      if (domain.every(isNumber) || domain.every(isDate)) domain.sort(d3.ascending);
    } else if (!domain) {
      domain = d3.extent(type === 'linear' || type === 'time' ? [...values, ...(hints[name] ?? [])] : values);
    }
    if (type === 'log') {
      const bad = [...domain, ...values].find(v => !(v > 0));
      if (bad !== undefined) throw new Error(`Scale ${name}: a log scale needs values > 0, got ${bad}`);
    }
    // Bars get gaps; a grid of two band axes (heatmap, Gantt rows) does not.
    const other = trained[name === 'x' ? 'y' : 'x'];
    const padding = opt.padding ?? (other?.type === 'band' ? 0 : 0.2);
    domains[name] = { type, domain, opt, padding, nice: !opt.domain && ['linear', 'log', 'time'].includes(type) };
  }
  return domains;
}

// The ordinal colour scale Plot uses, for drawing a legend beside the figure.
export function colorScale(domain, theme, range = theme.palette) {
  const index = new Map(domain.map((v, i) => [keyOf(v), i]));
  const scale = v => range[(index.get(keyOf(v)) ?? 0) % range.length];
  scale.domain = () => domain.slice();
  return scale;
}

function buildScale({ type, domain, opt, padding, nice }, range, theme) {
  if (type === 'ordinal') return colorScale(domain, theme, opt.range);
  if (type === 'sequential') {
    // Any number of stops: at the domain's values when it has one per stop (three around a
    // pivot make it diverging), else spread evenly over its extent. Clamped, like d3's own.
    const stops = opt.range ?? [d3.interpolateRgb(theme.line, theme.palette[0])(0.15), theme.palette[0]];
    const [low, high] = d3.extent(domain);
    const at = domain.length === stops.length ? domain : stops.map((_, i) => low + (i / (stops.length - 1)) * (high - low));
    return d3.scaleLinear(at, stops).interpolate(d3.interpolateRgb).clamp(true);
  }
  const scale = type === 'band' ? d3.scaleBand(domain, range).paddingInner(padding).paddingOuter(padding / 2)
    : type === 'time' ? d3.scaleTime(domain, range)
    : type === 'log' ? d3.scaleLog(domain, range)
    : d3.scaleLinear(domain, range);
  if (nice) {
    // nice() only ever widens, except at float precision, where d3 can shrink the domain.
    const [low, high] = d3.extent(domain), niced = scale.copy().nice();
    const [a, b] = d3.extent(niced.domain());
    if (a <= low && b >= high) scale.domain(niced.domain());
  }
  return scale;
}

// Where a value sits: the middle of its band on a band scale.
const at = (scale, v) => scale.bandwidth ? scale(v) + scale.bandwidth() / 2 : scale(v);

/* ---------- axes: ticks, and the margins their labels need ---------- */

const isHorizontal = axis => (axis.channel ?? 'x') === 'x';   // x axes sit below, y axes to the left

// `ticks` is a count (a hint, as in d3), a d3 time interval, or the exact values.
const tickCount = (axis, length) => axis.ticks ?? Math.max(2, Math.round(length / (isHorizontal(axis) ? 90 : 42)));

function tickValues(scale, axis, length) {
  if (Array.isArray(axis.ticks)) return axis.ticks;
  if (scale.bandwidth) {   // a count keeps every k-th band
    const k = axis.ticks > 0 ? Math.ceil(scale.domain().length / axis.ticks) : 1;
    return scale.domain().filter((_, i) => i % k === 0);
  }
  return scale.ticks(tickCount(axis, length));
}

// `format` is a d3 format string ("%H:%M" for dates, ".0%" for numbers) or a function. With
// neither, the scale's own format for the tick count: on a log scale it blanks crowded labels.
function tickFormat(scale, axis, ticks, length) {
  const { format } = axis;
  if (typeof format === 'function') return format;
  const dates = ticks[0] instanceof Date;
  if (typeof format === 'string') return dates ? d3.timeFormat(format) : d3.format(format);
  // Dates on a band: d3's time-axis format, at each value's own precision (an hour, a day...).
  if (scale.bandwidth) return v => v instanceof Date ? d3.scaleTime().tickFormat()(v) : String(v);
  return dates ? scale.tickFormat() : scale.tickFormat(Array.isArray(axis.ticks) ? ticks.length : tickCount(axis, length));
}

function tickLabels(scale, axis, length, measure) {
  const ticks = tickValues(scale, axis, length), format = tickFormat(scale, axis, ticks, length);
  let labels = ticks.map((value, i) => ({ value, label: String(format(value, i) ?? '') }));
  // Unless told which, a band axis labels every k-th band, so that labels never overlap.
  if (scale.bandwidth && axis.ticks == null && labels.length > 1) {
    const room = isHorizontal(axis) ? d3.max(labels, l => measure(l.label, FONT_SIZE)) + 6 : FONT_SIZE + 2;
    const k = Math.ceil(room / scale.step());
    labels = labels.filter((_, i) => i % k === 0);
  }
  return labels;
}

// `label`, shortened with an ellipsis until it measures at most `room` px.
function fit(label, room, measure) {
  if (measure(label, FONT_SIZE) <= room) return label;
  let cut = label;
  while (cut && measure(cut + '…', FONT_SIZE) > room) cut = cut.slice(0, -1);
  return cut.trimEnd() + '…';
}

// The margins the axes' labels need, and those labels. Labels are computed once, against a
// scale of the estimated length: tick values do not depend on the range, only their pixels do.
// `fixed` (the `margin` prop) overrides any side.
function margins(axes, domains, width, height, env, fixed = {}) {
  const margin = { top: 8, right: 8, bottom: 8, left: 8 }, ticks = new Map();
  for (const axis of axes) {
    const domain = domains[axis.channel ?? 'x']; if (!domain) continue;
    const horizontal = isHorizontal(axis);
    const length = Math.max(60, horizontal ? width - 80 : height - 40);
    const scale = buildScale(domain, [0, length], env.theme);
    ticks.set(axis, tickLabels(scale, axis, length, env.measure));
    const labels = ticks.get(axis).map(t => t.label);
    const widest = d3.max(labels, l => env.measure(l, FONT_SIZE)) ?? 0;
    if (horizontal) {
      margin.bottom = Math.max(margin.bottom, TICK_SIZE + TICK_PADDING + FONT_SIZE + 3);
      if (!scale.bandwidth && labels.length) {   // the end labels overhang the plot area
        margin.left = Math.max(margin.left, Math.ceil(env.measure(labels[0], FONT_SIZE) / 2) + 2);
        margin.right = Math.max(margin.right, Math.ceil(env.measure(labels.at(-1), FONT_SIZE) / 2) + 2);
      }
    } else {
      // Labels take at most a third of the width; longer ones are cut with an ellipsis.
      const room = width / 3;
      if (widest > room) for (const t of ticks.get(axis)) t.label = fit(t.label, room, env.measure);
      margin.left = Math.max(margin.left, Math.ceil(TICK_SIZE + TICK_PADDING + Math.min(widest, room)) + 2);
    }
  }
  return { margin: { ...margin, ...fixed }, ticks };
}

/* ---------- scene: plain shapes with explicit style ---------- */

const line = (x1, y1, x2, y2, style) => ({ t: 'line', x1, y1, x2, y2, ...style });
export const text = (x, y, content, style) => ({ t: 'text', x, y, text: content, fontSize: FONT_SIZE, ...style });
// A full-width or full-height line across the plot area at `p`.
const across = (area, horizontal, p, style) =>
  horizontal ? line(area.left, p, area.right, p, style) : line(p, area.top, p, area.bottom, style);

// What a mark's render() gets: pixel positions, the plot area, and how to read its props.
function context(layer, scales, area, env) {
  const { props, color: target } = layer, { theme } = env;
  // value -> pixel, the band centre on a band scale; ±Infinity is the plot's edge.
  // A plot of only ±Infinity annotations trains no scale; its edges still have positions.
  const position = (scale, low, high) => v =>
    v === -Infinity ? low : v === Infinity ? high : !scale ? NaN : scale.bandwidth ? scale(v) + scale.bandwidth() / 2 : scale(v);
  const bandwidth = scale => () => scale?.bandwidth?.() ?? 0;
  return {
    x: position(scales.x, area.left, area.right),
    y: position(scales.y, area.bottom, area.top),
    color: scales.color,
    area,
    bandwidth: { x: bandwidth(scales.x), y: bandwidth(scales.y) },
    theme, props,
    // A style prop: a function of the datum, else a constant, else (for the prop the colour
    // channel feeds) the colour scale, else `fallback`.
    resolve(row, prop, fallback) {
      const v = props[prop];
      if (typeof v === 'function') return v(row.d);
      if (v != null) return v;
      if (prop !== target) return fallback;
      return row.color != null && scales.color ? scales.color(row.color) : fallback ?? theme.palette[0];
    },
    // A value prop: a field name or a function of the datum.
    field(row, prop) {
      const v = props[prop];
      return typeof v === 'function' ? v(row.d) : typeof v === 'string' ? row.d?.[v] : v;
    },
    measure: env.measure,
    projection: env.projection,   // a d3-geo projection fitted to the area, when the Plot has one
  };
}

// The Plot's `projection` (a d3-geo name such as 'equal-earth', or a projection) fitted to the
// plot area around `fit` (GeoJSON; the whole globe by default).
function fitProjection({ projection, fit }, area) {
  let p = projection;
  if (typeof p === 'string') {
    const make = d3['geo' + p.replace(/(?:^|-)(\w)/g, (_, c) => c.toUpperCase())];
    if (!make) throw new Error(`Plot: d3 has no projection named '${projection}'`);
    p = make();
  }
  return p.fitExtent([[area.left, area.top], [area.right, area.bottom]], fit ?? { type: 'Sphere' });
}

function axisShapes(axis, ticks, scales, area, theme) {
  const scale = scales[axis.channel ?? 'x']; if (!scale) return [];
  const horizontal = isHorizontal(axis);
  const base = horizontal ? area.bottom : area.left;
  const stroke = { stroke: theme.lineStrong, crisp: true };
  const label = { fontFamily: theme.font, fill: theme.muted };
  const shapes = [horizontal ? line(area.left, base, area.right, base, stroke) : line(base, area.top, base, area.bottom, stroke)];
  for (const { value, label: content } of ticks) {
    const p = at(scale, value); if (p == null || Number.isNaN(p)) continue;
    if (horizontal) {
      shapes.push(line(p, base, p, base + TICK_SIZE, stroke));
      if (content) shapes.push(text(p, base + TICK_SIZE + TICK_PADDING, content, { ...label, dy: '0.71em', textAnchor: 'middle' }));
    } else {
      shapes.push(line(base - TICK_SIZE, p, base, p, stroke));
      if (content) shapes.push(text(base - TICK_SIZE - TICK_PADDING, p, content, { ...label, dy: '0.32em', textAnchor: 'end' }));
    }
  }
  return shapes;
}

// Lines between the bands of a band scale, or at the ticks of a scale: the ticks of the
// channel's Axis when it has one (so lines and labels agree), unless `ticks` is given.
function gridShapes(grid, axisTicks, scales, area, theme) {
  const channel = grid.channel ?? 'y', scale = scales[channel]; if (!scale) return [];
  const horizontal = channel === 'y';
  let positions;
  if (scale.bandwidth) {
    const domain = scale.domain(), half = (scale.step() - scale.bandwidth()) / 2;
    positions = [...domain.map(v => scale(v) - half), scale(domain.at(-1)) + scale.bandwidth() + half];
  } else {
    const values = grid.ticks == null && axisTicks ? axisTicks.map(t => t.value)
      : tickValues(scale, { channel, ticks: grid.ticks }, horizontal ? area.height : area.width);
    positions = values.map(scale);
  }
  const style = { stroke: grid.tone === 'soft' ? theme.lineSoft : theme.line, crisp: true };
  return positions.map(p => across(area, horizontal, p, style));
}

/* ---------- compile ---------- */

// cyrb53 by bryc, public domain (https://github.com/bryc/code/blob/master/jshash/experimental/cyrb53.js), seed 0:
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
const tidy = shape => { const out = {}; for (const k in shape) if (shape[k] != null) out[k] = round(shape[k]); return out; };

// props: { width, height, data?, <channels>?, theme?, measure?, margin?, children }
// Returns { scene, key }: the shapes to draw, and a hash of them that changes exactly when they do.
export function compile(props) {
  const { width, height } = props;
  if (!(width > 0) || !(height > 0)) throw new Error('Plot: width and height must be positive numbers');
  const env = { theme: { ...defaultTheme, ...props.theme }, measure: props.measure ?? defaultMeasure };
  const spec = collect(props.children, { data: props.data, channels: pickChannels(props) },
    { layers: [], scales: {}, axes: [], grids: [] });
  for (const layer of spec.layers) evaluate(layer, spec.scales);
  const domains = trainDomains(spec.layers, spec.scales);

  const { margin, ticks } = margins(spec.axes, domains, width, height, env, props.margin);
  const area = { left: margin.left, top: margin.top, right: width - margin.right, bottom: height - margin.bottom };
  area.width = area.right - area.left; area.height = area.bottom - area.top;

  if (props.projection != null) env.projection = fitProjection(props, area);
  const scales = {};
  if (domains.x) scales.x = buildScale(domains.x, [area.left, area.right], env.theme);
  if (domains.y) scales.y = buildScale(domains.y, domains.y.type === 'band' ? [area.top, area.bottom] : [area.bottom, area.top], env.theme);
  if (domains.color) scales.color = buildScale(domains.color, null, env.theme);

  const ticksOf = channel => ticks.get(spec.axes.find(a => (a.channel ?? 'x') === channel));
  const back = [...spec.grids.flatMap(g => gridShapes(g, ticksOf(g.channel ?? 'y'), scales, area, env.theme)),
    ...spec.axes.flatMap(a => axisShapes(a, ticks.get(a) ?? [], scales, area, env.theme))];
  const drawn = spec.layers.flatMap(l => l.render(l.rows, context(l, scales, area, env)));
  const scene = {
    width, height,
    // Marks clip to the plot area plus 4px, so a dot on the edge stays whole.
    clip: { x: area.left - CLIP_BLEED, y: area.top - CLIP_BLEED, w: area.width + 2 * CLIP_BLEED, h: area.height + 2 * CLIP_BLEED },
    back: back.map(tidy),
    marks: drawn.filter(s => !s.front).map(tidy),
    front: drawn.filter(s => s.front).map(({ front, ...s }) => tidy(s)),   // text stays readable outside the clip
  };
  return { scene, key: hash53(JSON.stringify(scene)) };
}

/* ---------- draw: the only part that touches the DOM ---------- */

// The scene schema (SPEC 5.5): SVG attribute names in camelCase, written kebab-cased.
const GEOMETRY = {
  rect: ['x', 'y', 'width', 'height', 'rx'],
  circle: ['cx', 'cy', 'r'],
  line: ['x1', 'y1', 'x2', 'y2'],
  path: ['d'],
  text: ['x', 'y', 'dy'],
};
const STYLE = ['fill', 'stroke', 'strokeWidth', 'strokeDasharray', 'fillOpacity', 'opacity',
  'textAnchor', 'fontSize', 'fontFamily', 'transform'];
const kebab = name => name.replace(/[A-Z]/g, c => '-' + c.toLowerCase());

function drawShape(group, shape) {
  const el = group.append(shape.t);
  for (const k of [...GEOMETRY[shape.t], ...STYLE]) {
    if (shape[k] == null) continue;
    el.attr(kebab(k), shape.t === 'rect' && (k === 'width' || k === 'height') ? Math.max(0, shape[k]) : shape[k]);
  }
  if (shape.crisp) el.attr('shape-rendering', 'crispEdges');
  if (shape.t === 'text') el.text(shape.text);
}

// Draws `scene` into `svg`, a d3 selection of an empty <svg>. `clipId` must be unique on the page.
export function drawScene(svg, scene, clipId) {
  const { clip } = scene;
  svg.append('defs').append('clipPath').attr('id', clipId)
    .append('rect').attr('x', clip.x).attr('y', clip.y).attr('width', clip.w).attr('height', clip.h);
  for (const [shapes, clipped] of [[scene.back, false], [scene.marks, true], [scene.front, false]]) {
    const group = svg.append('g');
    if (clipped) group.attr('clip-path', `url(#${clipId})`);
    for (const shape of shapes) drawShape(group, shape);
  }
}

// Scales: inference, training and building. domains = f(rows), scales = f(domains, ranges).
// Depends on d3 and the theme only; knows nothing of marks or guides.
import * as d3 from 'd3';

export const AXES = { x: ['x', 'x1', 'x2'], y: ['y', 'y1', 'y2'] };
export const keyOf = v => v instanceof Date ? +v : v;
export const isNumber = v => typeof v === 'number';
export const isDate = v => v instanceof Date;

/* ---------- scales: domains trained across every layer ---------- */

// What a row trains on a scale channel. On an axis: its interval when it has one, else its
// point (plus any declared channel past the three); elsewhere: each of the channel's fields.
// Edges (±Infinity) train nothing.
function trainable(row, fields, axis) {
  const [point, start, end] = fields;
  const used = !axis ? fields : [...(row[start] != null || row[end] != null ? [start, end] : [point]), ...fields.slice(3)];
  return used.map(f => row[f]).filter(v => v != null && !(typeof v === 'number' && !Number.isFinite(v)));
}
// The fields each scale channel trains on. `defineChannel` appends to it.
export const SCALE_CHANNELS = Object.fromEntries(Object.entries({ ...AXES, color: ['color'], size: ['size'], shape: ['shape'], opacity: ['opacity'] })
  .map(([channel, fields]) => [channel, [...fields]]));

// A channel a mark or position writes into its rows (`row.rank`), declared to train `scale`.
// Only the first training pass sees it, so it cannot move a position scale's margins.
export function defineChannel(name, { scale }) {
  if (!SCALE_CHANNELS[scale]) throw new Error(`defineChannel ${name}: unknown scale '${scale}' (use ${Object.keys(SCALE_CHANNELS).join(', ')})`);
  if (Object.values(SCALE_CHANNELS).flat().includes(name) || name === 'group' || name === 'd') throw new Error(`defineChannel: '${name}' is already a channel`);
  SCALE_CHANNELS[scale].push(name);
}
// The value a row has for a scale channel (a declared channel counts), or undefined.
export const valueOf = (row, channel) => SCALE_CHANNELS[channel].map(f => row[f]).find(v => v != null);

/* ---------- scale types: a registry; the built-ins register through the same call ---------- */

// defineScale(name, { train, build, check?, nice?, band?, padding? })
//   train(values, opts, hints) -> domain   from the trained values (and a mark's hints); `opts` are the
//                                          declared Scale props plus `channel`; skipped when `domain` is given
//   build(domain, range, opts) -> scale    a function with .domain(), and .ticks(n) / .nice() where the
//                                          type is continuous; `opts` adds `theme` and `padding`; for a
//                                          non-position channel `range` is the Scale's own (or the default)
//   check(domain, values, opts)            optional: throws on a domain the type cannot take
//   nice     true: a position scale without a `domain` is niced (never narrowed)
//   band     true: a y scale runs top-down; padding: the default band padding
const TYPES = {};
export const scaleTypes = () => Object.keys(TYPES);
export const defineScale = (name, def) => {
  if (TYPES[name]) throw new Error(`defineScale: '${name}' is already a scale type`);
  if (typeof def?.build !== 'function') throw new Error(`defineScale ${name}: needs a build(domain, range, opts) function`);
  TYPES[name] = { train: extent, ...def };
};

const isPosition = channel => channel in AXES;
function inferType(channel, values) {
  const numbers = values.every(isNumber);
  if (channel === 'shape') return 'ordinal';
  if (isPosition(channel)) return values.every(isDate) ? 'time' : numbers ? 'linear' : 'band';
  return numbers ? (channel === 'color' ? 'sequential' : 'linear') : 'ordinal';
}

/* ---------- named scales: scales[channel][name] ---------- */

export const DEFAULT = 'default';
// The name of the scale a layer binds for `channel`: `Layer scale` / mark `scale={{ y: 'rain' }}`.
export const nameOf = (layer, channel) => layer.scale?.[channel] ?? DEFAULT;
// The declared `Scale` options a layer sees, per channel (only the channels with a declaration).
export const optionsFor = (layer, options) => Object.fromEntries(Object.keys(SCALE_CHANNELS)
  .map(c => [c, options[c]?.[nameOf(layer, c)]]).filter(([, opt]) => opt));

// domains[channel][name], trained from the layers bound to that (channel, name).
export function trainDomains(layers, rows, options) {
  const hints = {}, trained = {};
  layers.forEach((l, i) => {
    for (const [channel, values] of Object.entries(l.domain?.(rows[i], l.props, optionsFor(l, options)) ?? {})) {
      ((hints[channel] ??= {})[nameOf(l, channel)] ??= []).push(...values);
    }
  });
  for (const [channel, fields] of Object.entries(SCALE_CHANNELS)) {
    const names = new Set([...Object.keys(options[channel] ?? {}), ...layers.map(l => nameOf(l, channel))]);
    for (const name of names) {
      const opt = options[channel]?.[name] ?? {}, values = [];
      layers.forEach((l, i) => { if (nameOf(l, channel) === name) for (const r of rows[i]) values.push(...trainable(r, fields, isPosition(channel))); });
      // A mark's hints can stand in for rows (a plot of Polygons alone has no x or y values).
      const hinted = isPosition(channel) ? hints[channel]?.[name] ?? [] : [];
      if (!values.length && !opt.domain && !hinted.length) continue;
      const type = opt.type ?? inferType(channel, values.length ? values : opt.domain ?? hinted);
      (trained[channel] ??= {})[name] = { opt, values, type };
    }
  }
  const domains = {};
  for (const [channel, byName] of Object.entries(trained)) for (const [name, { opt, values, type }] of Object.entries(byName)) {
    const def = TYPES[type];
    const domain = opt.domain ?? def.train(values, { ...opt, channel }, hints[channel]?.[name] ?? []);
    def.check?.(domain, values, { ...opt, channel });
    // Bars get gaps; a grid of two band axes (heatmap, Gantt rows) does not. The other axis is
    // the one the first layer bound to this scale reads.
    const other = channel === 'x' ? 'y' : 'x', layer = layers.find(l => nameOf(l, channel) === name);
    const against = trained[other]?.[layer ? nameOf(layer, other) : DEFAULT];
    const padding = opt.padding ?? def.padding ?? (against?.type === 'band' ? 0 : 0.2);
    ((domains[channel] ??= {})[name] = { type, domain, opt, padding, nice: !opt.domain && !!def.nice && isPosition(channel) });
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

// d3's symbol set, the default range of the shape channel; the default ranges of the others.
export const SYMBOLS = ['circle', 'cross', 'diamond', 'square', 'star', 'triangle', 'wye'];
const DEFAULT_RANGE = { size: [2, 8], opacity: [0.2, 1], shape: SYMBOLS };

// The range a scale is built over: the pixel extent of an axis, else the Scale's own `range`
// (or the channel's default; null for colour, whose types choose theirs).
export function rangeOf(channel, { type, opt }, area) {
  const pad = opt.rangePad ?? 0;   // pixels kept free at both ends of a position axis (`Scale rangePad`)
  if (channel === 'x') return [area.left + pad, area.right - pad];
  if (channel === 'y') return TYPES[type].band ? [area.top + pad, area.bottom - pad] : [area.bottom - pad, area.top + pad];
  return opt.range ?? DEFAULT_RANGE[channel] ?? null;
}

// `count` is the tick count a niced domain is rounded for: the axis's own, so its last tick is the domain end.
export function buildScale({ type, domain, opt, padding, nice }, range, theme, channel, count = 10) {
  const scale = TYPES[type].build(domain, range, { ...opt, theme, padding, channel });
  if (nice) {
    // nice() only ever widens, except at float precision, where d3 can shrink the domain.
    const [low, high] = d3.extent(domain), niced = scale.copy().nice(count);
    const [a, b] = d3.extent(niced.domain());
    if (a <= low && b >= high) scale.domain(niced.domain());
  }
  return scale;
}

// Legend helpers: the scale a legend reads, built the way Plot builds it. Each has `.domain()`.
const helper = (channel, type) => (domain, range, kind = type) =>
  buildScale({ type: kind, domain, opt: { range }, padding: 0, nice: false }, range ?? DEFAULT_RANGE[channel], {}, channel);
export const sizeScale = helper('size', 'linear');
export const opacityScale = helper('opacity', 'linear');
export const shapeScale = helper('shape', 'ordinal');

/* ---------- the built-in types ---------- */

const extent = (values, opts, hints = []) => d3.extent([...values, ...hints]);
const categories = values => {
  const domain = [...new d3.InternSet(values)];
  return domain.every(isNumber) || domain.every(isDate) ? domain.sort(d3.ascending) : domain;
};
const classes = (opts, range) => range ?? opts.theme.palette;
// The default colour ramp, from near the line colour to the first palette colour. A continuous type
// on the colour channel has no range of its own (`rangeOf` gives null), so it takes this.
const ramp = theme => [d3.interpolateRgb(theme.line, theme.palette[0])(0.15), theme.palette[0]];
const rangeFor = (range, { channel, theme }) => range ?? (channel === 'color' ? ramp(theme) : undefined);

defineScale('linear', { nice: true, build: (domain, range, opts) => d3.scaleLinear(domain, rangeFor(range, opts)) });
defineScale('time', { nice: true, build: (domain, range) => d3.scaleUtc(domain, range) });
defineScale('sqrt', { nice: true, build: (domain, range, opts) => d3.scaleSqrt(domain, rangeFor(range, opts)) });
defineScale('pow', { nice: true, build: (domain, range, opts) => d3.scalePow(domain, rangeFor(range, opts)).exponent(opts.exponent ?? 1) });
defineScale('log', {
  nice: true,
  train: (values, opts) => d3.extent(values),
  check(domain, values, { channel }) {
    const bad = [...domain, ...values].find(v => !(v > 0));
    if (bad !== undefined) throw new Error(`Scale ${channel}: a log scale needs values > 0, got ${bad}`);
  },
  build: (domain, range, opts) => d3.scaleLog(domain, rangeFor(range, opts)),
});
defineScale('band', {
  band: true, train: categories,
  build: (domain, range, { padding }) => d3.scaleBand(domain, range).paddingInner(padding).paddingOuter(padding / 2),
});
// Categories at points, not in bands: no bandwidth, no end padding unless `padding` (in steps).
defineScale('point', { band: true, padding: 0, train: categories, build: (domain, range, { padding }) => d3.scalePoint(domain, range).padding(padding) });
defineScale('ordinal', { train: categories, build: (domain, range, { theme }) => colorScale(domain, theme, range ?? theme.palette) });
defineScale('sequential', {
  // Any number of stops: at the domain's values when it has one per stop (three around a
  // pivot make it diverging), else spread evenly over its extent. Clamped, like d3's own.
  build(domain, range, { theme }) {
    const stops = range ?? ramp(theme);
    const [low, high] = d3.extent(domain);
    const at = domain.length === stops.length ? domain : stops.map((_, i) => low + (i / (stops.length - 1)) * (high - low));
    return d3.scaleLinear(at, stops).interpolate(d3.interpolateRgb).clamp(true);
  },
});
// Classed colour: `threshold` cuts at the given domain, `quantize` into equal-width steps of
// the extent, `quantile` into equal-count classes. The edges are the scale's own
// (`.domain()`, `.thresholds()`, `.quantiles()`).
defineScale('threshold', {
  train(values, { channel }) { throw new Error(`Scale ${channel}: a threshold scale needs a domain (the cut points)`); },
  build: (domain, range, opts) => d3.scaleThreshold(domain, classes(opts, range)),
});
defineScale('quantize', { build: (domain, range, opts) => d3.scaleQuantize(domain, classes(opts, range)) });
defineScale('quantile', { train: values => d3.sort(values), build: (domain, range, opts) => d3.scaleQuantile(domain, classes(opts, range)) });

// Where a value sits: the middle of its band on a band scale, or, given a row that carries a slot
// (`u1 u2`, from dodge or jitter), the middle of that slot.
export const at = (scale, v, row) =>
  scale.bandwidth ? scale(v) + scale.bandwidth() * (row?.u1 != null ? (row.u1 + row.u2) / 2 : 0.5) : scale(v);

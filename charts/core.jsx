// A grammar of graphics on d3: the part of the charts that knows nothing about tauler.
//
//   JSX → plain descriptors → rows → positions → scales → marks' shapes → a serializable
//   scene → drawScene() into an <svg>
//
// compile() depends on its props only. tauler evaluates a layout in three runtimes and matches
// figures by a key hashed from the scene, so nothing here may read the clock or Math.random:
// take the time from a stream and pass it in. SPEC.md is the design.
import * as d3 from 'd3';
import { AXES, SCALE_CHANNELS, DEFAULT, isNumber, isDate, optionsFor, trainDomains, buildScale, rangeOf, scaleTypes } from './scales.jsx';
import { GUIDES, defineGuide, guideOf, checkChannel, claimRoom, gridShapes, niceCount, finalTicks, fitMargin } from './guides.jsx';
import { stack, dodge, jitter, jitterPx, isPixelStage } from './positions.jsx';
import { CLIP_BLEED, context, bindScales, tidy, hash53 } from './scene.jsx';
import { geo, coordOf } from './coord.jsx';
import { polar } from './polar.jsx';
import { measureFor } from './fonts.jsx';
import { describe } from './speckey.jsx';

// The public surface stays here: callers import from core.jsx only.
export { colorScale, sizeScale, shapeScale, opacityScale, defineScale, defineChannel } from './scales.jsx';
export { defineGuide, stack, dodge, jitter, jitterPx, geo, polar };
export { linearGradient, radialGradient, pattern, hatch } from './paint.jsx';
export { blur, dropShadow, marker, arrowhead, mask, clipRect, clipPath } from './defs.jsx';
export { text, hash53, drawScene, FONT_SIZE } from './scene.jsx';

export const defaultTheme = {
  ink: '#142030', muted: '#5b6879',
  line: '#e0e5ec', lineSoft: '#edf0f4', lineStrong: '#c2cad5',
  palette: ['#2b59d1', '#df7a2c', '#13907b', '#c03c77', '#7a61d2', '#a5861a'],
  font: 'ui-monospace, monospace',
};

// Text width in a monospace font, where every character is 0.6 em wide: `measureFor(font)` (fonts.jsx)
// is what a Plot uses, and gives this for monospace and unknown fonts.
export const defaultMeasure = (text, size) => String(text).length * size * 0.6;

/* ---------- descriptors: what JSX evaluates to ---------- */

// The mark's name goes in `mark`, not `type`: tauler's JSX factory reshapes any returned
// object with both `type` and `props` into one of its own layout nodes.
//
// A mark is `render(rows, ctx) -> shapes`, plus an optional `domain(rows, props, scaleOptions)`
// returning `{ x?: [...], y?: [...] }`, values the continuous scales must cover. `color` names
// the style prop the colour channel feeds ('fill', or 'stroke' for line-like marks); `size` the
// one the size channel feeds (none: a `size` prop on the mark throws). `room(rows, props, env)`
// returns the margin the mark needs, `{ top?, right?, bottom?, left? }` in pixels (SPEC 5.7).
export const defineMark = (name, { render, domain, room, color = 'fill', size }) =>
  (props = {}) => ({ $: 'mark', mark: name, render, domain, room, color, size, props });
// The library's own marks: the same, but a Plot can key them by name and props (speckey.jsx).
export const builtinMark = (name, def) => {
  const make = defineMark(name, def);
  return (props = {}) => describe(make(props), { mark: name, props });
};
const piece = kind => (props = {}) => ({ $: kind, props });

export const Layer = piece('layer');   // shares data and channels with the marks inside it
export const Scale = piece('scale');
export const Axis = piece('axis');
export const Grid = piece('grid');
export const Legend = piece('legend');

// `key` is a channel (a row's identity, never trained); on the Plot it is the figure's key.
// An `opacity` that is not a field name is the style prop, not the channel.
const pickChannels = props => {
  const channels = {};
  for (const c of [...Object.values(SCALE_CHANNELS).flat(), 'group', 'key']) {
    if (props[c] !== undefined && (c !== 'opacity' || typeof props[c] === 'string')) channels[c] = props[c];
  }
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
  : Array.isArray(v) ? (_, i) => v[i] : () => v;
// ±Infinity is a constant too: the plot's edge.
const isConstant = v => typeof v === 'number' || v instanceof Date;

// `Layer scale` and a mark's `scale={{ y: 'rain' }}`: the named scales a layer binds, per channel.
// A mark's own binding wins, key by key, over its Layer's.
const bindings = (inherited, props) => ({ ...inherited, ...(props.scale?.constructor === Object ? props.scale : {}) });
// After collection (a Scale may be written after the marks that bind it): every name is declared.
function checkNames(spec) {
  const declared = channel => ['(default)', ...Object.keys(spec.scales[channel] ?? {}).filter(n => n !== DEFAULT)];
  const check = (piece, channel, name) => {
    if (name === DEFAULT || spec.scales[channel]?.[name]) return;
    throw new Error(`${piece} ${channel}: unknown scale "${name}"; declared: ${declared(channel).join(', ')}`);
  };
  for (const l of spec.layers) for (const [channel, name] of Object.entries(l.scale)) {
    checkChannel(l.mark, channel, Object.keys(SCALE_CHANNELS));
    check(l.mark, channel, name);
  }
  for (const g of spec.guides) if (g.props.scale !== undefined) check(g.kind === 'axis' ? 'Axis' : 'Legend', g.props.channel ?? (g.kind === 'axis' ? 'x' : 'color'), g.props.scale);
  for (const g of spec.grids) if (g.scale !== undefined) check('Grid', g.channel ?? 'y', g.scale);
}

// `<Scale channel name>` declares a named scale (once); without a name it is the channel's
// default, and repeated declarations merge.
function scaleDeclared(spec, props) {
  const byName = (spec.scales[props.channel] ??= {});
  if (props.name === undefined || props.name === DEFAULT) byName[DEFAULT] = { ...byName[DEFAULT], ...props };
  else if (props.name in byName) throw new Error(`Scale ${props.channel}: name "${props.name}" declared twice`);
  else byName[props.name] = props;
}

// The style prop the colour channel feeds: `colorTo` ('fill' or 'stroke'), else the mark's own.
function colorTarget(node, props) {
  if (props.colorTo !== undefined && !['fill', 'stroke'].includes(props.colorTo)) {
    throw new Error(`${node.mark[0].toUpperCase()}${node.mark.slice(1)} colorTo: "${props.colorTo}" is not a style prop; use "fill" or "stroke"`);
  }
  return props.colorTo ?? node.color;
}

// Wrapper components have already run, so whatever they returned is just more descriptors.
function collect(node, inherited, spec) {
  if (Array.isArray(node)) { for (const n of node) collect(n, inherited, spec); return spec; }
  if (!node || typeof node !== 'object') return spec;
  const props = node.props ?? {};
  switch (node.$) {
    case 'mark': {
      const { children, data, ...rest } = props;
      if (rest.size !== undefined && !node.size) throw new Error(`${node.mark}: has no size to set; 'size' is not a channel of this mark`);
      spec.layers.push({ mark: node.mark, render: node.render, domain: node.domain, room: node.room, color: colorTarget(node, rest), size: node.size, props: rest,
        position: rest.position ?? inherited.position, scale: bindings(inherited.scale, rest), ownData: data ?? inherited.layerData,
        data: data ?? inherited.data, channels: inherit(inherited.channels, pickChannels(rest)) });
      break;
    }
    case 'layer':
      collect(props.children, { data: props.data ?? inherited.data, layerData: props.data ?? inherited.layerData, position: props.position ?? inherited.position, scale: bindings(inherited.scale, props), channels: inherit(inherited.channels, pickChannels(props)) }, spec);
      break;
    case 'scale':
      checkChannel('Scale', props.channel, Object.keys(SCALE_CHANNELS));
      if (props.type !== undefined && !scaleTypes().includes(props.type)) {
        throw new Error(`Scale ${props.channel}: unknown type '${props.type}' (use ${scaleTypes().join(', ')})`);
      }
      scaleDeclared(spec, props); break;
    case 'grid': checkChannel('Grid', props.channel ?? 'y', Object.keys(AXES)); spec.grids.push(props); break;
    default: {
      const guide = guideOf(node.$, props);
      if (!guide) throw new Error(`Plot: ${node.type !== undefined ? `'${node.type}'` : 'an object'} is not a mark, Layer, Scale, Axis, Grid or Legend`);
      guide.check?.(props);
      spec.guides.push({ kind: node.$, props, guide });
    }
  }
  return spec;
}

/* ---------- rows: each datum's channel values ---------- */

// A `position` array splits by tag: the data-space entries run before the scales exist, the
// `stage: 'pixel'` ones after (SPEC 4, stage 7); a data-space entry may not follow a pixel one.
const positionsOf = layer => [layer.position ?? []].flat();
function dataPositions(layer) {
  const all = positionsOf(layer), first = all.findIndex(isPixelStage);
  if (first >= 0 && all.slice(first).some(p => !isPixelStage(p))) {
    throw new Error(`${layer.mark}: a data-space position cannot follow a pixel-stage one; list data-space positions first`);
  }
  return first < 0 ? all : all.slice(0, first);
}

export const top = row => row.y2 ?? row.y;

const asDate = v => v != null && !isDate(v) && !(isNumber(v) && !Number.isFinite(v)) ? new Date(v) : v;

// Returns the layer's rows; `layer.channels` may be replaced by an annotation's constants.
function evaluate(layer, declared) {
  const options = optionsFor(layer, declared);
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
  let rows = data.map((d, i) => {
    const row = { d };
    for (const [c, get] of accessors) row[c] = get(d, i);
    return row;
  });
  // JSON has no Dates: a declared time scale reads strings and numbers as dates.
  for (const [name, channels] of Object.entries(AXES)) {
    if (options[name]?.type !== 'time') continue;
    for (const r of rows) for (const c of channels) r[c] = asDate(r[c]);
  }
  for (const position of dataPositions(layer)) rows = position(rows, { props: layer.props, mark: layer.mark, scales: options });
  return rows;
}

/* ---------- compile: an ordered list of stages, each (state) -> state ---------- */

// State (SPEC 4): { props, env, spec, rows, domains, claims, margin, area, scales, scene }.
// `rows[i]` belongs to `spec.layers[i]`. `domains` and `scales` are keyed `[channel][name]`.
// `claims` is the room the guides ask for ({ margin, data }). A stage returns a new state.
const stages = [
  function collectStage(s) {
    const { props } = s;
    // The coord's default channels (`geo`: lon, lat) are inherited like any other.
    const channels = inherit(s.env.coord?.channels ?? {}, pickChannels({ ...props, key: undefined }));
    const spec = collect(props.children, { data: props.data, channels, scale: {} },
      { layers: [], scales: {}, guides: [], grids: [] });
    checkNames(spec);
    // A declared time scale's `domain` reads strings and numbers as dates too, like the rows.
    for (const channel of Object.keys(AXES)) for (const [name, opt] of Object.entries(spec.scales[channel] ?? {})) {
      if (opt.type === 'time' && opt.domain) spec.scales[channel][name] = { ...opt, domain: opt.domain.map(asDate) };
    }
    return { ...s, spec };
  },
  s => ({ ...s, rows: s.spec.layers.map(layer => evaluate(layer, s.spec.scales)) }),
  function trainStage(s) {
    const domains = trainDomains(s.spec.layers, s.rows, s.spec.scales);
    if (s.env.coord && !s.env.coord.positions) { delete domains.x; delete domains.y; }   // geo ignores the position scales; polar reads them
    return { ...s, domains };
  },
  function claimStage(s) {
    const { width, height } = s.props;
    return { ...s, claims: claimRoom(s.spec.guides, s.domains, width, height, s.env, s.spec.layers.map((l, i) => l.room?.(s.rows[i], l.props, s.env) ?? {})) };
  },
  function areaStage(s) {
    const { width, height } = s.props;
    const margin = fitMargin(s.claims.margin, s.props.margin, s.props);
    const area = { left: margin.left, top: margin.top, right: width - margin.right, bottom: height - margin.bottom };
    area.width = area.right - area.left; area.height = area.bottom - area.top;
    const bound = s.env.coord?.bind(area);
    const env = bound ? { ...s.env, bound, projection: bound.projection } : s.env;
    return { ...s, margin, area, env };
  },
  function scaleStage(s) {
    const { domains, area, env } = s, scales = {};
    for (const [channel, byName] of Object.entries(domains)) {
      for (const [name, domain] of Object.entries(byName)) {
        const range = rangeOf(channel, domain, area);
        (scales[channel] ??= {})[name] = buildScale(domain, range, env.theme, channel, range && niceCount(s.spec.guides, channel, name, Math.abs(range[1] - range[0])));
      }
    }
    return { ...s, scales };
  },
  // Pixel-stage positions (GAPS 1.3): rows get pixel offsets from the built scales and the area.
  function pixelStage(s) {
    const rows = s.rows.map((rs, i) => {
      const layer = s.spec.layers[i], pixel = positionsOf(layer).filter(isPixelStage);
      return pixel.reduce((acc, position) => position(acc, { props: layer.props, mark: layer.mark, scales: bindScales(layer, s.scales), area: s.area }), rs);
    });
    return { ...s, rows };
  },
  // Guides into `back`, then each mark's shapes, in child order (first child at the bottom).
  function renderStage(s) {
    const { spec, rows, scales, area, env, claims } = s;
    // A grid draws at the ticks of the axis for its scale (the primary one unless it names one).
    const ticksOf = (channel, name) => {
      const guide = spec.guides.find(g => g.kind === 'axis' && (g.props.channel ?? 'x') === channel && (g.props.scale ?? DEFAULT) === (name ?? DEFAULT));
      const data = guide && claims.data.get(guide), scale = scales[channel]?.[name ?? DEFAULT];
      // A y axis ticks over the final height (see finalTicks); polar and custom guides keep their claim's.
      return data && scale && channel === 'y' && !guide.props.guide && !env.coord?.positions ? finalTicks(guide.props, scale, area, env, data) : data?.ticks;
    };
    const valuesOf = (channel, name) => ticksOf(channel, name)?.map(t => t.value);
    const back = [...spec.grids.flatMap(g => env.bound?.grid ? env.bound.grid(g, scales, env.theme, valuesOf) : gridShapes(g, ticksOf(g.channel ?? 'y', g.scale), scales, area, env.theme)),
      ...spec.guides.flatMap(g => g.guide.shapes(g.props, claims.data.get(g), scales, area, env))];
    const drawn = spec.layers.flatMap((l, i) => l.render(rows[i], context(l, scales, area, env)));
    return { ...s, scene: { back, drawn } };
  },
  function assembleStage(s) {
    const { area, scene: { back, drawn } } = s, { width, height } = s.props;
    return { ...s, scene: {
      width, height,
      // Marks clip to the plot area plus 4px, so a dot on the edge stays whole.
      clip: { x: area.left - CLIP_BLEED, y: area.top - CLIP_BLEED, w: area.width + 2 * CLIP_BLEED, h: area.height + 2 * CLIP_BLEED },
      back: back.map(tidy),
      marks: drawn.filter(sh => !sh.front).map(tidy),
      front: drawn.filter(sh => sh.front).map(({ front, ...sh }) => tidy(sh)),   // text stays readable outside the clip
    } };
  },
];

// props: { width, height, data?, <channels>?, theme?, measure?, margin?, children }
// Returns { scene, key }: the shapes to draw, and a hash of them that changes exactly when they do.
export function compile(props) {
  const { width, height } = props;
  if (!(width > 0) || !(height > 0)) throw new Error('Plot: width and height must be positive numbers');
  const theme = { ...defaultTheme, ...props.theme };
  const env = { theme, measure: props.measure ?? measureFor(theme.font), coord: coordOf(props) };
  const { scene } = stages.reduce((state, stage) => stage(state), { props, env });
  return { scene, key: hash53(JSON.stringify(scene)) };
}

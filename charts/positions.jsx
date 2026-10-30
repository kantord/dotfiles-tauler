// Positions: rows -> rows, in data space, before any scale exists (SPEC 5.3). They write the
// slot fields `y1 y2` / `x1 x2` (stack) and `u1 u2` (dodge, jitter); the scales never see them.
import * as d3 from 'd3';
import { keyOf } from './scales.jsx';
import { hash53 } from './scene.jsx';
import { describe } from './speckey.jsx';

const seriesOf = by => typeof by === 'function' ? by : by ? r => r[by] : r => r.group ?? r.color;
const firstSeen = (rows, get) => [...new Set(rows.map(r => keyOf(get(r))))];
const cap = name => name[0].toUpperCase() + name.slice(1);

// Series keys, bottom to top (or left to right): an explicit array (series it leaves out follow,
// first-seen), a d3 stack order by name, or first-seen. `totals` maps a series to its total in
// each pile; d3's orders read it.
function orderOf(order, names, totals) {
  if (order == null) return names;
  if (Array.isArray(order)) {
    const given = order.map(keyOf);
    return [...given.filter(n => names.includes(n)), ...names.filter(n => !given.includes(n))];
  }
  const make = d3['stackOrder' + cap(order)];
  if (!make) throw new Error(`stack: unknown order '${order}' (use a d3 stack order name or an array of series)`);
  return make(names.map(n => totals.get(n).map(v => [0, v]))).map(i => names[i]);
}

// The axis a dodge or jitter spreads along: the declared band scale (x first), else the axis
// holding the strings.
export function bandAxis(rows, scales) {
  const declared = a => scales?.[a]?.type === 'band';
  if (declared('x') || declared('y')) return declared('x') ? 'x' : 'y';
  return rows.some(r => typeof r.y === 'string') && !rows.some(r => typeof r.x === 'string') ? 'y' : 'x';
}

// Piles rows sharing `groupBy` along `along`, writing `y1 y2` (`x1 x2`), series in first-seen
// order or `order`; negatives pile downward from 0. `offset`: `zero`, `expand` (each pile
// scaled to 1), or the name of any d3 stack offset (`wiggle`, `silhouette`, `diverging`...).
// `anchor` names a series placed across zero, the ones before it going left (down), the ones
// after it right (up). For an Area, a series missing at some `groupBy` value gets a 0 there,
// so the band above does not jump.
const _stack = ({ by, along = 'y', groupBy: declared, offset = 'zero', order, anchor } = {}) => (rows, { mark }) => {
  // By default rows pile by their position across: `x`, or `x1` for interval bars (a histogram).
  const across = along === 'y' ? 'x' : 'y';
  const groupBy = declared ?? (rows.some(r => r[across] != null) ? across : across + '1');
  const series = seriesOf(by), names = firstSeen(rows, series);
  if (anchor != null && offset !== 'zero') throw new Error(`stack: anchor needs offset 'zero', got '${offset}'`);
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
  const value = r => Number.isFinite(r[along]) ? r[along] : 0;   // null, NaN: nothing to pile
  const name = r => keyOf(series(r));
  const piles = d3.group(rows, r => keyOf(r[groupBy]));
  const columns = [...piles.keys()].every(k => typeof k === 'number') ? d3.sort(piles, ([k]) => k).map(([, p]) => p) : [...piles.values()];
  const totals = new Map(names.map(n => [n, columns.map(pile => d3.sum(pile, r => name(r) === n ? value(r) : 0))]));
  const sequence = orderOf(order, names, totals), rank = new Map(sequence.map((n, i) => [n, i]));
  if (offset !== 'zero' && offset !== 'expand') {
    const make = d3['stackOffset' + cap(offset)];
    if (!make) throw new Error(`stack: unknown offset '${offset}' (use zero, expand or a d3 stack offset name)`);
    const layers = d3.stack().keys(sequence).value((cell, n) => cell.get(n) ?? 0).offset(make)(columns.map(pile => d3.rollup(pile, v => d3.sum(v, value), name)));
    columns.forEach((pile, p) => sequence.forEach((n, j) => {
      let at = layers[j][p][d3.sum(pile, r => name(r) === n ? value(r) : 0) < 0 ? 1 : 0];   // a layer is [low, high]; a negative one is filled downward from its top
      for (const r of pile) if (name(r) === n) { r[start] = at; r[end] = at += value(r); }
    }));
    return rows;
  }
  const pivot = anchor == null ? null : rank.get(keyOf(anchor));
  if (anchor != null && pivot === undefined) throw new Error(`stack: anchor '${anchor}' is not a series`);
  for (const pile of columns) {
    const sorted = d3.sort(pile, r => rank.get(name(r)));
    let up = 0, down = 0;
    if (pivot != null) {
      const middle = d3.sum(pile, r => rank.get(name(r)) === pivot ? value(r) : 0) / 2;
      [up, down] = [middle, -middle];
      for (const r of sorted.filter(r => rank.get(name(r)) === pivot)) { r[start] = -middle; r[end] = middle; }
      for (const r of sorted.filter(r => rank.get(name(r)) < pivot).reverse()) { r[end] = down; r[start] = down -= value(r); }
      for (const r of sorted.filter(r => rank.get(name(r)) > pivot)) { r[start] = up; r[end] = up += value(r); }
      continue;
    }
    for (const r of sorted) {
      const v = value(r);
      if (v >= 0) { r[start] = up; r[end] = up += v; } else { r[start] = down; r[end] = down += v; }
    }
    const total = up - down;
    if (offset === 'expand' && total > 0) for (const r of pile) { r[start] /= total; r[end] /= total; }
  }
  return rows;
};

// Gives each series a slot of its band: `u1 u2`, fractions of the band that Rect applies on its
// band axis. A band shares itself among the series present in it, in one global order
// (first-seen, or `order`). Never trained, so it needs no scale.
const _dodge = ({ by, padding = 0.1, order } = {}) => (rows, info) => {
  if (order != null && !Array.isArray(order)) throw new Error('dodge: order must be an array of series');
  const series = seriesOf(by), sequence = orderOf(order, firstSeen(rows, series)), axis = bandAxis(rows, info?.scales);
  for (const band of d3.group(rows, r => keyOf(r[axis])).values()) {
    const present = new Set(band.map(r => keyOf(series(r))));
    const here = sequence.filter(n => present.has(n)), slot = 1 / here.length;
    for (const r of band) {
      const i = here.indexOf(keyOf(series(r)));
      r.u1 = (i + padding / 2) * slot;
      r.u2 = (i + 1 - padding / 2) * slot;
    }
  }
  return rows;
};

// Spreads rows with a `key` channel over the width of their slot (the band, or the dodge slot
// before it): `u1 = u2`, a hash of the key, so the same key always lands in the same place and
// no row moves when another is removed. Rows with no key stay put and overlap. Point marks
// (`Dot`, `Link`) read it. Positions run before domains are inferred, so the band axis must be
// declared (`<Scale channel="x" type="band"/>`); a continuous axis needs jitterPx (GAPS 3.4b).
const _jitter = ({ width = 0.8 } = {}) => (rows, info) => {
  if (!['x', 'y'].some(a => info?.scales?.[a]?.type === 'band')) {
    throw new Error('jitter: declare a band Scale on x or y (<Scale channel="x" type="band"/>); a continuous axis needs jitterPx');
  }
  for (const r of rows) {
    if (r.key == null) continue;
    const [low, high] = r.u1 != null ? [r.u1, r.u2] : [0, 1];
    r.u1 = r.u2 = (low + high) / 2 + (parseInt(hash53(String(r.key)), 36) / 2 ** 53 - 0.5) * (high - low) * width;
  }
  return rows;
};

// A position tagged `stage: 'pixel'` runs after the scales are built (core's pixel stage), so
// its offsets are in pixels.
export const isPixelStage = position => position?.stage === 'pixel';

// Jitter on a continuous axis: rows with a `key` channel get a pixel offset `dx` (`dy` with
// `along: 'y'`) of up to ±`width`/2, a hash of the key, read by `ctx.point` (so `Dot` and `Link`).
// Same key, same offset, whatever else is in the data; rows with no key are not moved. On a band
// axis use `jitter`, which stays inside the band.
const _jitterPx = ({ width = 12, along = 'x' } = {}) => {
  if (along !== 'x' && along !== 'y') throw new Error("jitterPx: along must be 'x' or 'y'");
  const position = rows => {
    for (const r of rows) {
      if (r.key != null) r[along === 'x' ? 'dx' : 'dy'] = (parseInt(hash53(String(r.key)), 36) / 2 ** 53 - 0.5) * width;
    }
    return rows;
  };
  position.stage = 'pixel';
  return position;
};

// Named in a Plot's key (speckey.jsx) by their options, so a Plot using them need not be compiled to be keyed.
const named = (name, make) => (opts = {}) => describe(make(opts), { stage: name, ...opts });
export const stack = named('stack', _stack), dodge = named('dodge', _dodge), jitter = named('jitter', _jitter), jitterPx = named('jitterPx', _jitterPx);

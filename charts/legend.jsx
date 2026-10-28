// The Legend guide: swatches read from the trained colour scale, in one row at the top or
// bottom of the figure, drawn into `back`. Claims its row through the margin stage (guides.jsx).
import * as d3 from 'd3';
import { DEFAULT } from './scales.jsx';
import { FONT_SIZE, text, fit } from './scene.jsx';

const SWATCH = 9, LABEL_GAP = 4, ITEM_GAP = 12, STEPS = 5, ROW = FONT_SIZE + 8;
const SIDES = ['top', 'bottom'];

// Items left to right: swatches ({ x, value }) and labels ({ x, label }), as offsets from the
// plot's left edge. An ordinal scale gets a swatch and a label per key, the labels cut with `…`
// to fit the budget; a sequential one a ramp of STEPS swatches with its two ends labelled.
function layout({ type, domain }, budget, measure) {
  const items = [];
  if (type === 'sequential') {
    const [low, high] = d3.extent(domain), format = d3.tickFormat(low, high, STEPS);
    const cap = Math.max(0, (budget - STEPS * SWATCH) / 2 - LABEL_GAP);
    const ends = [fit(format(low), cap, measure), fit(format(high), cap, measure)];
    let x = 0;
    items.push({ x, label: ends[0] }); x += measure(ends[0], FONT_SIZE) + LABEL_GAP;
    for (let i = 0; i < STEPS; i++, x += SWATCH) items.push({ x, value: low + (i / (STEPS - 1)) * (high - low) });
    items.push({ x: x + LABEL_GAP, label: ends[1] });
    return items;
  }
  const n = domain.length, cap = Math.max(0, (budget - n * (SWATCH + LABEL_GAP) - (n - 1) * ITEM_GAP) / n);
  let x = 0;
  for (const key of domain) {
    const label = fit(String(key), cap, measure);
    items.push({ x, value: key }, { x: x + SWATCH + LABEL_GAP, label });
    x += SWATCH + LABEL_GAP + measure(label, FONT_SIZE) + ITEM_GAP;
  }
  return items;
}

export const legend = {
  check(props) {
    const channel = props.channel ?? 'color';
    if (channel !== 'color') throw new Error(`Legend: unknown channel '${channel}' (use color)`);
    if (props.side !== undefined && !SIDES.includes(props.side)) {
      throw new Error(`Legend ${channel}: side "${props.side}" must be ${SIDES.join(' or ')}`);
    }
  },
  claim(props, { domains, width, env, placed, margin }) {
    const domain = domains.color?.[props.scale ?? DEFAULT], side = props.side ?? 'top';
    if (!domain) return { room: {}, side };
    const items = layout(domain, width - margin.left - margin.right, env.measure);
    return { room: { [side]: placed[side] + ROW }, extent: ROW, side, data: { items, side, offset: placed[side] } };
  },
  shapes(props, data, scales, area, env) {
    const scale = scales.color?.[props.scale ?? DEFAULT]; if (!scale || !data) return [];
    const { theme } = env, y = data.side === 'top' ? area.top - data.offset - ROW / 2 : area.bottom + data.offset + ROW / 2;   // beyond what the side already holds
    return data.items.map(({ x, value, label }) => label === undefined
      ? { t: 'rect', x: area.left + x, y: y - SWATCH / 2, width: SWATCH, height: SWATCH, fill: scale(value) }
      : text(area.left + x, y, label, { dy: '0.32em', textAnchor: 'start', fontFamily: theme.font, fill: theme.muted }));
  },
};

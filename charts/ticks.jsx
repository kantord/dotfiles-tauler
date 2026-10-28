// Ticks: which values an axis marks and how it labels them, shared by the rectangular and polar axes.
import * as d3 from 'd3';
import { FONT_SIZE } from './scene.jsx';

export const isHorizontal = axis => (axis.channel ?? 'x') === 'x';

// `ticks` is a count (a hint, as in d3), a d3 time interval, or the exact values.
export const tickCount = (axis, length) => axis.ticks ?? Math.max(2, Math.round(length / (isHorizontal(axis) ? 90 : 42)));

export function tickValues(scale, axis, length) {
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
  if (typeof format === 'string') return dates ? d3.utcFormat(format) : d3.format(format);
  // Dates on a band: d3's time-axis format, at each value's own precision (an hour, a day...).
  if (scale.bandwidth) return v => v instanceof Date ? d3.scaleUtc().tickFormat()(v) : String(v);
  // A domain of one value has no step to take the precision from: d3 would give 3.000000.
  const [low, high] = d3.extent(scale.domain());
  if (!dates && low === high) return d3.format('~g');
  return dates ? scale.tickFormat() : scale.tickFormat(Array.isArray(axis.ticks) ? ticks.length : tickCount(axis, length));
}

export function tickLabels(scale, axis, length, measure) {
  const ticks = tickValues(scale, axis, length), format = tickFormat(scale, axis, ticks, length);
  let labels = ticks.map((value, i) => ({ value, label: String(format(value, i) ?? '') }));
  // Unless told which, a band axis labels every k-th band, so that labels never overlap.
  if (scale.bandwidth && axis.ticks == null && labels.length > 1) {
    const widest = d3.max(labels, l => measure(l.label, FONT_SIZE));
    // Turned labels clear each other once the spacing beats their height across the slant (or their width along it).
    const t = Math.abs(axis.labelAngle ?? 0) * Math.PI / 180;
    const room = !isHorizontal(axis) ? FONT_SIZE + 2 : t ? Math.min(FONT_SIZE / Math.sin(t), widest / Math.cos(t)) + 2 : widest + 6;
    const k = Math.ceil(room / scale.step());
    labels = labels.filter((_, i) => i % k === 0);
  }
  return labels;
}

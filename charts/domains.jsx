// Scale domain helpers: plain functions over ALL the data that return a domain for `Scale domain`,
// so every panel of a small multiple passes the same one (SPEC 5.6).
import * as d3 from 'd3';
import { read } from './fields.jsx';

const REDUCERS = { sum: d3.sum, mean: d3.mean, median: d3.median, max: d3.max, min: d3.min, count: v => v.length };

// The categories of `field`, ordered by a statistic of `by` within each: `stat` is sum, mean,
// median, max, min, count or a function of the values; ascending unless `descending`; ties keep
// first-seen order.
export function orderBy(data, { field, by, stat = 'sum', descending = false }) {
  const reduce = typeof stat === 'function' ? stat : REDUCERS[stat];
  if (!reduce) throw new Error(`orderBy: unknown stat '${stat}' (use ${Object.keys(REDUCERS).join(', ')} or a function)`);
  const value = by === undefined ? () => 1 : read(by);
  const ranked = d3.rollups(data, rows => reduce(rows.map(value)), read(field));
  return d3.sort(ranked, descending ? (a, b) => d3.descending(a[1], b[1]) : (a, b) => d3.ascending(a[1], b[1])).map(([key]) => key);
}

// Every `interval` slot (second, minute, hour, day, week, month, year; UTC, so the result is the
// same in every runtime) from the earliest to the latest date of `field`, as Dates.
export function dateRange(data, { field, interval = 'day' }) {
  const every = d3['utc' + interval[0].toUpperCase() + interval.slice(1)];
  if (!every?.range) throw new Error(`dateRange: unknown interval '${interval}' (use second, minute, hour, day, week, month, year)`);
  const [low, high] = d3.extent(data.map(read(field)), v => +new Date(v));
  return low === undefined ? [] : every.range(every.floor(low), every.offset(every.floor(high), 1));
}

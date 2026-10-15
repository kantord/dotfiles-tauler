// Marks for <Chart>: plain objects describing what to draw, in the shape of
// TanStack Charts' marks (https://tanstack.com/charts). A mark takes its own
// data, then channels, then constants:
//
//   rect(events, { y1: "start", y2: d => minutes(d.end), fill: "color", label: "title" })
//   rule([now], { y: d => d, label: d => "14:05" }, { stroke: "#ef4444" })
//
// A channel maps a datum to a value, and is either a field name ("start") or
// an accessor `(datum, index) => value`. Constants are plain style values the
// same for every datum, and stay out of the channels on purpose.
//
//   rect  y1, y2 (extent, in the y scale's units), fill (a CSS colour), label
//   rule  y (position), label                         constants: stroke
//
// Marks are drawn in array order, so later ones sit on top of earlier ones.
export const rect = (data, channels, style = {}) => ({ kind: "rect", data, channels, style });
export const rule = (data, channels, style = {}) => ({ kind: "rule", data, channels, style });

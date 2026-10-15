// Turns a chart spec ({ marks, scales }) into a scene: plain nodes with every
// channel already resolved, and nothing about how they get drawn. Pure, so a
// different renderer (or a test) can consume the same scene.
//
//   scene = { domain: [from, to],
//             ticks:  [{ every, width, alpha, dotted, overSpans, label }],
//             nodes:  [{ kind: "rect", from, to, fill, label }
//                      { kind: "rule", at, stroke, label }] }
//
// Nodes keep the marks' array order. Only a fixed linear `y` scale exists so
// far: `scales: { y: { domain: [from, to], ticks: [...] } }`.
function channel(spec) {
  if (spec == null) return () => undefined;
  if (typeof spec === "function") return spec;
  return (datum) => datum[spec];
}

export function compile({ marks = [], scales = {} }) {
  const { domain, ticks = [] } = scales.y;
  const nodes = [];
  for (const mark of marks) {
    const c = mark.channels;
    const get = (name) => channel(c[name]);
    const label = get("label");
    mark.data.forEach((datum, i) => {
      if (mark.kind === "rect") {
        nodes.push({ kind: "rect", from: get("y1")(datum, i), to: get("y2")(datum, i), fill: get("fill")(datum, i), label: label(datum, i) });
      } else if (mark.kind === "rule") {
        nodes.push({ kind: "rule", at: get("y")(datum, i), stroke: mark.style.stroke, label: label(datum, i) });
      }
    });
  }
  return { domain, ticks, nodes };
}

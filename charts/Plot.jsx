// Display component: a chart, drawn by tauler as a <D3Figure>. The grammar itself (marks,
// scales, axes) is core.jsx and marks.jsx; this file is the part that knows about tauler.
//
//   <Plot width={248} height={110} theme={chartTheme(themeColor, "JetBrains Mono")} data={samples} x="t">
//     <Area y="mem" fillOpacity={0.2} />
//     <Line y="cpu" />
//     <Axis channel="x" format="%H:%M" />
//   </Plot>
//
// Everything a Plot is given must come from its props: tauler evaluates the layout in three
// runtimes and finds each figure by its key. Never call `new Date()` in the layout; take the
// time from a stream and pass it in.
import { compile, drawScene, hash53 } from './core.jsx';
import { specKey } from './speckey.jsx';

// The figure's key says when the picture changes, and is found without compiling:
//   - an explicit `key` prop names the picture; the caller changes it whenever the picture should;
//   - otherwise the Plot's props, as a canonical string (speckey.jsx): the library's own marks,
//     stack/dodge/jitter and polar() are keyed by name and options. Tauler hashes it natively;
//   - a closure, a custom mark or a projection in the props cannot be keyed that way: the scene
//     is compiled here, every Tick, and its hash is the key. Measured in tauler's real QuickJS
//     runtime: about 4 ms per Tick at 50 rows, 20 ms at 500, so above about 100 rows pass a
//     `key` (charts/TAULER-SUPPORT.md, T3).
// Either way the scene is compiled in the Draw runtime for a new key only. A mark's `render` may
// read only rows, ctx and props: that is what the key covers.
export function Plot(props) {
  const { width, height } = props;
  if (props.key != null) {
    const clipId = 'chart' + hash53(String(props.key));
    return (<D3Figure key={props.key} width={width} height={height}
      draw={svg => drawScene(svg, compile(props).scene, clipId)} />);
  }
  const spec = specKey(props);
  if (spec != null) {
    return (<D3Figure key={[spec]} width={width} height={height}
      draw={svg => { const { scene, key } = compile(props); drawScene(svg, scene, 'chart' + key); }} />);
  }
  const { scene, key } = compile(props);
  return (<D3Figure key={key} width={width} height={height}
    draw={svg => drawScene(svg, scene, 'chart' + key)} />);
}

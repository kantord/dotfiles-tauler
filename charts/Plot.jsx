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

// No `key`: the scene is compiled here, every Tick, and its hash is the figure's key, so the
// figure redraws exactly when the picture changes. Cheap up to a few hundred rows.
//
// With a `key`, the caller names the picture: nothing is compiled here, only in the Draw
// runtime, and the key must change whenever the picture should. For windows of thousands of
// rows, or when a function prop captures values the scene hash would not see.
export function Plot(props) {
  const { width, height } = props;
  if (props.key != null) {
    const clipId = 'chart' + hash53(String(props.key));
    return (<D3Figure key={props.key} width={width} height={height}
      draw={svg => drawScene(svg, compile(props).scene, clipId)} />);
  }
  const { scene, key } = compile(props);
  return (<D3Figure key={key} width={width} height={height}
    draw={svg => drawScene(svg, scene, 'chart' + key)} />);
}

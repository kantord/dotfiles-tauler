# charts: the gap example suite (brief)

Purpose: one comprehensive set of **minimal examples**, one per gap, covering every gap found
while stress-testing the library: missing features and ergonomics gaps alike. The plan (`charts/GAPS.md`) is closed; this file is the brief for the examples, and `charts/test/gaps/` holds them.

## Rules

1. **Each example is written from its row below** and from the library's own docs.
2. **Invented data and descriptive names.** Data is made up and seeded, small (a dozen rows or
   fewer where possible), and shaped for the gap. Example names describe the gap.
3. **Minimal.** One gap per example; no decoration beyond what the assertion needs.
4. **Red first.** An example for a gap that is open is a `test.fails` (or, for an API that does not
   exist yet, an assertion written against the target call site, failing for that reason only).
   When the gap closes, the example turns green and loses `fails`. None is open now.
5. **Ergonomics are testable as constraints on the call site.** Each row states the constraint:
   for example "the data passed in is the raw input, unsorted and unreshaped", "no `margin`
   prop", "the colour of no shape equals the background colour". The test asserts the result
   *and* the constraint.
6. **Coverage:** every row here has at least one example; a docs test
   (`charts/test/gaps/coverage.test.jsx`) fails if a row has none.

Kinds: **F** = feature missing; **E** = ergonomics (buildable today, but only with hand work).

## Inventory

| ID | Item | Kind | The challenge, in plain words | What must hold |
|---|---|---|---|---|
| g01 | 0.1 | F | An unsupported scale type, and an unknown channel on a guide, are accepted silently. | Both throw an error naming the type or channel. |
| g02 | 1.1 | F | An author wants a square-root scale for size; it silently behaves as linear. | The size of a dot is proportional to the square root of the value (`r**2 / value` constant). |
| g03 | 1.1 | F | Colour classes by threshold, equal-count quantiles or equal-width steps are applied as raw functions inside `fill`. | A scale type exists for each; the class edges are readable from the scale. |
| g04 | 1.1 | E | Categories on a line chart must be mapped to a numeric index with hand-set tick labels and hand-set end padding. | Categories sit on a point scale with their own labels; no numeric index, no manual `ticks`/`format`. |
| g05 | 1.1 | F | A mark computes a value (a rank) that is not a field of the input and wants a scale to colour it. | The mark declares the channel and a second mark reads the same trained scale. |
| g06 | 2.1 | F | One categorical field should drive both colour and marker shape; a number should drive size and another opacity. | Three channels, each through a scale; a function-valued style prop still wins. |
| g07 | 1.5a | E | Dashed strokes, stroke opacity, font weight and per-corner rounding are ignored by built-in marks, forcing a custom mark. | Each style prop on `Rect`, `Line`, `Text` and `Arc` reaches the shape. |
| g08 | 1.5 | F | A fill that fades from a colour to transparent along y. | A gradient exists in the scene, or a recorded host-constraint failure. |
| g09 | 1.7a | E | An axis line and ticks must be hidden; the only way is to paint them in the background colour. | `Axis line={false} tickSize={0}`: no line shape exists, and no shape equals the background colour. |
| g10 | 1.7 | E | A titled axis needs a hand-made mark and a hand-set margin. | A title option on `Axis`; the plot area shrinks to make room; no `margin` prop. |
| g11 | 1.7 | E | End-of-line labels need a hand-set right margin. | A mark can claim room; the margin follows the label width; no `margin` prop. |
| g12 | 1.7b | F | A second and third y axis with different units in one chart. | Each axis has its own scale; marks bind to one; no custom mark. |
| g13 | 1.7 | E | The grid must be listed separately from the axis, with the tick list written twice. | The grid follows the axis ticks by default (already true when `ticks` is omitted: assert it). |
| g14 | 1.7 | E | Grid intervals should be even and end at the domain maximum. | With no options, y grid lines divide the domain evenly and the last line is at the top. |
| g15 | 1.8 | E | A colour legend needs the keys passed separately instead of read from the scale; a continuous scale needs a gradient legend. | A `Legend` guide (SPEC 5.10) reads keys from the trained scale and claims its own room; a sequential colour gives stepped swatches. |
| g16 | 3.12 | F | A stacked area with a centred (moving) baseline and a chosen layer order. | `stack({ offset, order })` accepts d3's offset and order names; no manual reshape. |
| g17 | 3.12 | F | A diverging stack: two series left of zero, two right, the middle series split on the axis. | An anchor option places a named series across zero. |
| g18 | 3.12 | E | Stack order is currently controlled by sorting or reversing the input rows. | Raw, unsorted rows give the requested order through an option. |
| g19 | 3.12 | E | A line and an area over the same stacked data each need `stack()` repeated. | Layers inherit a shared position, or one declaration serves both. |
| g20 | 3.3 | F | Grouped bars where some categories have fewer series. | Bars in sparse bands are wider (existing `test.fails`). |
| g21 | 3.12 | E | Dodge order in grouped bars follows the row order, so rows are pre-sorted. | Raw rows give the requested series order through an option. |
| g22 | 3.4a | F | Overlapping points on a category axis should be spread reproducibly. | Twice gives equal offsets; different keys differ; no key gives 0; every offset stays in the band (pixels too); removing a row moves no other; an undeclared or non-band axis throws naming `jitterPx`. |
| g23 | 3.1 | F | Smoothing, running totals and normalisation across several series leak between series. | With two series, each series' first output equals its own start (`rolling`, `cumsum`, `normalize`, `last` take `by`). |
| g24 | 3.1 | E | A rolling mean plus a spread, discarding incomplete windows, needs nested calls and a slice. | One call returns several outputs per window with a `partial` option. |
| g25 | 3.1 | E | Wide rows must be reshaped to long rows, aggregated with several named outputs per group, and ranked, by hand. | Plain helpers `fold`, `groupBy` with named outputs, `rank`; input stays raw. |
| g26 | 3.13 | E | A fitted straight line with a band; a gap between two series filled by sign; a staircase of running totals with a total bar; a box with whiskers and outliers; tick marks for intervals. | Each is one statistic plus ordinary marks, with no hand-written geometry. |
| g27 | 3.13 | E | A horizontal or vertical reference line is written as a `Link` with infinite ends. | `ruleX`/`ruleY` marks. |
| g28 | 3.2 | F | A ranked bar list, and several panels sharing that order. | One helper over all data gives the same order in every panel. |
| g29 | 3.7 | F | A daily bar chart with quiet days, and a zero-value bar. | Empty slots appear; a zero `Bar` draws nothing; `Rect` zero-height lines remain. |
| g30 | 3.5 | F | A label at the first and last point is clipped. | `rangePad` keeps the label inside. |
| g31 | 3.6 | F | An arrow at each point, rotated, fixed pixel length. | `Vector` with `angle` and `length`. |
| g32 | 5.8 | E | Four small panels over shared scales are made by a loop of separate plots with a positioning trick. | The documented pattern (SPEC 5.8): equal explicit domains, colour domain passed; panels align and a category keeps its colour. |
| g33 | 1.4b | F | A pie, a donut, a gauge, a radar, a rose, radial bars and a sunburst. | Each is ordinary marks under one polar coordinate declared once; no per-mark frame props. |
| g34 | 1.4b | E | Centre text, a needle and a track under a polar coordinate. | Plain `Text`, `Link` and `Rect` children; no dedicated marks. |
| g35 | 1.4b | E | Labels outside a wedge need an offset and an anchor that depends on the angle. | `Text` under polar derives the anchor from the angle. |
| g36 | 1.4b | F | Radar grid as polygons or circles, with spokes, sweep, and no spokes. | `Grid` is coordinate-aware; options for shape and spokes. |
| g37 | 1.4a | F | A projection set once; points and routes drawn with plain `Dot`/`Line`. | Generic marks project; a long line follows the projected path. |
| g38 | 3.9 | F | A node-and-link tree with curved links; a ribbon of changing thickness; circles sized in data units. | `Link curve`, `Area thickness1/2`, `Dot rx/ry`. |
| g39 | 3.8a | E | A treemap's rectangles are reused by two different marks (fill and label). | A layout statistic returns rows used by `Rect` and `Text`. |
| g40 | 3.8b | F | A label drawn only where its box fits the shape. | `Text fit`. |
| g41 | 2.2 | E | Parallel coordinates from wide rows. | Reshape + per-variable normalise + `Line`; no new core piece. |
| g42 | 2.2 | F | A flow diagram, including an input with a cycle and uneven node sizes. | Nodes do not overlap; a cycle is reported or handled as documented. |
| g43 | 3.11 | F | Two-dimensional density as hexagons coloured by count. | Counts sum to the row count; `count` trains a shared colour scale. |
| g44 | 3.10 | F | Contour lines from a grid, density contours from points, Delaunay cells. | Each is a statistic that returns rows plus a generic polygon mark. |
| g45 | 3.14 | E | A beeswarm: points dodged so none overlap, in a small figure. | A mark (`Swarm`, SPEC 5.2); no two dots overlap. |
| g46 | interaction | E | A tooltip, a brush range and a zoom window drawn as a function of explicit state. | A `Plot` is a pure function of the state; two states give two keys. |
| g47 | 0.2 | F | A scene whose values sit on a rounding boundary, and trig-based shapes. | The key is identical in Node and in tauler's runtime (golden-key file). |
| g48 | 1.6 | F | A long label wraps inside a stated width and a rotated label does not overlap its neighbour. | Label boxes computed from `measure` stay inside the width and do not intersect. |
| g49 | 1.5 | F | A region marked with a repeating hatch instead of a flat colour (to show an estimate or a hidden range). | A pattern fill exists in the scene and the rasteriser draws it, or a recorded host-constraint failure; a dashed outline is not accepted as a substitute. |

Every plan item is built and every row is green; no `test.fails` is left in `charts/test/gaps/`.
The item column holds the plan's old numbers, kept as history.
Spellings the plan fixed over the guesses here: `RuleX`/`RuleY`/`TickX`/`TickY` and `Swarm` are capitalised marks, like every mark;
g45 is a mark (`Swarm`), not a pixel-stage position. The polar design is SPEC 5.13.

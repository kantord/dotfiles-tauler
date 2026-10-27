# charts: a grammar of graphics for tauler

Status: implemented (v5, as of 2026-10-27); planned work is in `charts/GAPS.md`, which owns the
future (items move here when they land). v4 was reviewed in three rounds (tauler-fit skeptic, minimalist,
generality skeptic), then by the implementer; where the code differs from v4 the reason is in
section 10. Section 3 records the draft this replaced.

## 1. Goal and non-goals

Goal: any common chart (line, area, bar, scatter/bubble, histogram, density, heatmap, box,
pie/donut/gauge, lollipop, candlestick, Gantt, waterfall, bullet, error bars, small multiples,
annotated/layered) is composed from a few orthogonal pieces, in JSX, from plain JSON, and drawn
as a tauler `<D3Figure>`. A user adds marks, statistics and positions without editing this
package. Nothing in core is specific to time series, calendars or any one widget.

### Scope rule

The library serves two uses with equal weight: exploratory data analysis (any statistic, any
encoding, small multiples, quick iteration) and decoration (a status bar is also something to
look at, so gradients, textures, type and shape are first-class). Users get the freedom to build
either.

- **Every chart type is in scope** unless a non-goal below excludes it.
- **A non-goal needs a reason from the host** (tauler), never convenience or "another library
  does not have it". "Use raw d3 in a `D3Figure`" is not support: a chart the library cannot
  express is a gap.
- **Expressiveness comes from a few abstract pieces that combine with data**, as in any grammar
  of graphics, not from a catalogue of features. Support for everything must be reached with the
  fewest pieces. A new need is met first by generalising an existing piece; a new piece must
  show why no existing one can be stretched to cover it.
- **Generality comes from seams, not from chart types.** The core stays small. Every stage of the
  pipeline (section 4) is open to extension, and a new capability must add a seam, not a special
  case. Open today: statistics, positions, marks. Closed or missing today: scale types, channels
  (a mark's own channels cannot train a scale), a stage after the scales are built, coordinates,
  the scene's shape schema, axes and guides.
- **Scope growth from universality is accepted.** A universal charting tool grows; that is the
  cost of the goal, not a defect. Nothing is descoped to keep the plan short. The control is the
  fewest-pieces test above, plus a design precondition per large item (`charts/GAPS.md`), never a
  demand that a user justify a chart type first.
- **Do not inherit from ggplot2 or any other implementation for its own sake.** A feature that is
  confusing, unintuitive or absent from other grammar-of-graphics libraries is dropped or
  redesigned, not copied.

### Non-goals (each tied to a host constraint)

- In-figure interactivity (hover, tooltips, pointer): a figure is a static Picture (ADR 0044),
  so the host owns interaction state. A `Plot` is a pure function of that state (a pointer, a
  brush, a zoom window, a playback clock).
- Animation: the same constraint; a motion example is a function of (changes so far, now).
- A dataframe: data is plain JSON (ADR 0013).
- Legends inside the Picture (5.10): legends are tauler JSX beside the figure, so swatches
  cannot drift from the chart. The library exports what a legend needs (`colorScale`).

### In scope, not yet designed

Previously listed as non-goals; the reasons given were convenience, so they are gaps now:
polar coordinates (radar, coxcomb, sunburst, polar lines), which need a coordinate mapping
(GAPS 1.4b; the earlier discussion is in section 10); Sankey and parallel coordinates (buildable from a statistic and existing marks; the old
"one scale per row" reason does not hold, see GAPS 2.2); multi-line and wrapped text; shape,
size and opacity as scale-trained channels; gradients, patterns and other decoration in the scene
schema. See `charts/GAPS.md` for the work list. Trees and maps are marks (5.12).

### Principles

1. Few orthogonal pieces compose any chart; nothing in core is specific to one chart type.
2. Open for extension without editing the package; the library's own marks use the same seam.
3. Plain data and plain functions over framework machinery; only what needs rows is in the
   grammar.
4. Pure and deterministic: the picture is a function of props; the key changes exactly when it does.
5. Explicit over magic, loud over silent: bad input throws, it does not draw something wrong.
6. A staged pipeline in which each stage sees only what exists at that point.
7. Sized for the host and decided by measurement; leave out what the host already does.
8. A layout is a statistic that returns rows; drawing is a mark. A layout fused into a mark
   cannot be reused by another mark.
9. Projection (and any other space, such as polar) is a plot-level coordinate that every mark
   honours, not a property of one mark.

### 1.1 Prior art and decisions behind principles 8 and 9

Checked against other grammar-of-graphics libraries (documentation read, except where noted):

- Observable Plot draws a tree with ordinary link, dot and text marks driven by tree
  transforms; for a treemap it ships no mark, and a published example runs d3's treemap and feeds
  the rectangles to a plain `Rect`. Its `projection` is a top-level option shared by marks.
- ggplot2's `coord_sf()` gives all layers one projection. ggraph picks a layout once for the
  plot and draws it with thin geoms. treemapify puts the layout inside the geom (identity
  statistic), so that ecosystem is split.
- Not checked (do not rely on it): other libraries, such as Vega, may also run hierarchy layouts
  as data transforms drawn with generic marks.

Hierarchy layouts here (`Treemap`, `Tree`, `Pack`, `Partition`, `hierarchy.jsx`) fuse layout,
colour and labels in one mark, and only `Geo` and `GeoDot` honour the projection. Both conflict
with principles 8 and 9 and are tracked in `charts/GAPS.md` (GAPS 3.8a and GAPS 1.4a).

Decisions since v5 (rationale in `charts/GAPS.md`): dodge fits the series present in each band
and has no `preserve` flag; jitter is seeded from a row key (a user accessor), and rows
without a key overlap; edge room is a pixel `rangePad` on the range; vector length is in pixels; `Bar` at zero draws nothing while `Rect`
zero-height lines stay (median rules); cross-panel category order comes from a helper that takes
all the data; a stage after the scales exists only for layouts that create values needing
their own scale.

Reference points: ggplot2 (layer = data + mapping + stat + geom + position) and Observable
Plot (marks + transforms + channels + scales). They are references, not templates (scope rule).

## 2. Constraints from tauler

| Constraint | Source | Consequence |
|---|---|---|
| Data is plain JSON; accessors point at it; `Array` methods keep working | ADR 0013 | Statistics are ordinary functions on arrays, called in the layout. |
| Every Tick re-evaluates the layout; nothing survives | ADR 0007 | `Plot` is a pure function of props: no clock, no randomness. |
| Controls hold no state | ADR 0012 | No in-figure state. |
| `draw` runs off the loop; the figure's `key` is required; "a key names one Picture for good" | ADR 0044 | The key changes exactly when the picture would. |
| Three runtimes; the Draw runtime may trail one round; a key it cannot reproduce is not drawn | ADR 0044 | The scene is a deterministic function of props. |
| QuickJS d3 ~12x slower than Node; linkedom has no layout (`getBBox` = 0) | `d3_figure/mod.rs` | Cheap statistics; text width is estimated (`measure`). |
| The same `draw` runs in a page against a real `<svg>` | ADR 0026/0027 | `drawScene` uses plain d3-selection calls. |
| Small figures (~250x110) fed by an Accumulator window | CONTEXT.md | Small defaults: 8px margins, few ticks, no legend. |
| JSON has no Dates | ADR 0013 | Time scales coerce (5.6). |

### Excluded dependencies

`d3-hexbin` and `d3-sankey` are excluded: this library does not use them, and tauler's bundle is
not extended to include them. Reasons (licence is not one: both are BSD-3-Clause, which is
compatible with Apache-2.0):

1. **The bundle is one pinned file.** tauler loads exactly one third-party d3 file for a
   `D3Figure`: the d3 7.9.0 UMD build (`d3.min.js`, sha256-pinned), run in a private scope, with
   a static list of 578 exports (`src/d3_figure/import.rs`, `assets.rs`). Neither package is in
   it. Each would need its own pinned asset, fetch, wrapper and tests in tauler (a separate
   repository), and load time in a runtime about 12 times slower than Node.
2. **Both are frozen.** `d3-hexbin` 0.2.2 was released in 2017 and `d3-sankey` 0.12.3 in 2019;
   neither has had a release since. `d3-sankey` depends on `d3-array` 1 to 2 and `d3-shape`
   1.2, older majors than d3 7.9 ships, and running it against d3 7's versions is untested.
3. **They provide little.** About 60 lines of hexagon maths and about 50 lines of flow layout.

Acknowledged consequences:

1. **This library owns that code,** with its tests, edge cases and fixes, and receives no
   upstream fixes. The flow layout must handle what `d3-sankey` handles (cycles, node alignment,
   relaxation iterations) or document what it does not. That behaviour is specified by example
   g42 in `charts/GAP-EXAMPLES.md`, written from the requirement, not from `d3-sankey`'s code.
2. **Hexbin is a data-space statistic,** cells with counts computed before the scales and drawn
   by a generic polygon mark, not a pixel-space layout. Cells are regular hexagons on screen only
   approximately, unless the statistic is given the plot's pixel width and height (it can be,
   since statistics run in the layout, where those are known). So hexbin does not justify a
   stage after the scales (GAPS 1.3).
3. **Flow diagrams need the curved-link and ribbon pieces** (GAPS 3.9) and a layout statistic
   written here (GAPS 2.2).
4. **Users cannot import these packages either:** tauler resolves only `d3` (and `linkedom`)
   for a `D3Figure`. A layout author who wants one has the same option: write it.
5. **The same test applies to any other module outside the 578 exports:** it is not used unless
   tauler's bundle changes, so a feature that needs one is built here or waits for a decision
   about the bundle.
6. **Library code for both is written here** (GAPS 3.11 and 2.2).

Vocabulary follows CONTEXT.md: an **Accessor** names a data part; a *channel* is the role an
accessor plays. Avoid "encoding", "aesthetic", and names clashing with tauler (`Tick`, `window`).

## 3. The draft this replaced, and defects fixed by the port

    descriptors -> collect -> evaluate (rows) -> trainDomains -> margins -> scales
      -> MARKS[name](layer) -> scene {width,height,clip,back,marks,front}
      -> key = hash(JSON(scene)) (on the loop) ; drawScene(svg, scene, clipId) in draw

Has: `Line Area Bar Dot Rule Text`; `Layer Scale Axis Grid`; channels `x y y1 y2 color label`;
linear/time/band/ordinal; a `stack` boolean; `chartTheme`.

Fixed by the port: closed `MARKS`/`CHANNELS`/`SCALE_CHANNELS` and name-only descriptors;
`fromZero` (y only), `bandX` (x only); `Line` always x-sorted; band date format `%b %-d`;
`isConstant` rejecting `Infinity`; `colour()` returning raw strings with undocumented
precedence; `inferType` reading the first value only; `margins()` rebuilding scales and
`tickLabels` running twice; 32-bit FNV key; half-clipped edge dots; `Rule` orientation by
`y != null`; shape names `w h dash size family anchor` instead of SVG names.

## 4. Pipeline

Statistics come first, in the layout, as plain functions (section 6):

```jsx
const bins = bin(samples, { value: 'latency', thresholds: 12 });   // [{x0, x1, count}]
<Plot data={bins}><Bar x1="x0" x2="x1" y="count"/></Plot>
```

`compile(props)` (core imports `d3`, which tauler resolves in every runtime):

1. collect descriptors; inherit `data` and channels (5.1)
2. evaluate accessors into rows `{ d, ...channels }`; `d` is the original datum
3. each mark's `position` (`stack`, `dodge`, or `(rows, {props}) => rows`): rows to rows, in
   data space, with **no access to scales** (they do not exist yet); may add `y1 y2` / `u1 u2`
4. train scales across all layers from built-in channels plus each mark's `domain()` hint;
   per axis a row trains its interval `a1 a2` when it has one, else its point `a` (so a
   stacked row's raw `y` never trains the domain)
5. layout: tick labels (once per axis) -> margins (`margin` prop overrides per side) -> area
6. build scales with ranges from the area
7. `render(rows, ctx)` per mark in child order (first child at the bottom); then axes, grids
8. assemble the scene; `drawScene` paints it (the only DOM-touching code)

## 5. API

### 5.1 Plot, Layer, inheritance, channels

`<Plot width height data x y ... theme measure margin key>`; children are marks and pieces.
Wrapper components that return marks are free. `Layer` takes `data` and channels only and
shares them with the marks inside:

```jsx
<Plot width={248} height={110} data={cpu} x="t" y="v" theme={theme}>
  <Area/><Line/>
  <Layer data={events} x="t">           {/* own data, own x; y is not inherited from Plot */}
    <Link y1={-Infinity} y2={Infinity} stroke={theme.muted}/>
  </Layer>
</Plot>
```

Channels (accessor = field name, function `(d, i) => v`, an array with one value per row
(columnar data; with no `data`, the arrays make the rows), or a constant number/Date/±Infinity):

| Channel | Meaning | Scale |
|---|---|---|
| `x x1 x2` | position / interval ends | x |
| `y y1 y2` | position / interval ends | y |
| `color` | mapped colour | color |
| `group` | splits series without colour | none |

Inheritance, decided: a mark inherits every channel it does not set. **Per axis, if a mark sets
any of `a`, `a1`, `a2` itself, the inherited channels of that axis are dropped**, and a mark's
rows train only the channels it uses. `channel={null}` opts out of one inherited channel.
`position`, style props and `Scale` are never inherited. `±Infinity` means "the plot edge" and
never trains a domain. A mark with no `data` of its own or its `Layer`'s, whose own channels are all constants, is an
annotation: one row, inheriting no channels.

Style props (`fill stroke strokeWidth r fillOpacity opacity text dx dy curve inset width ...`)
are a constant or a function of the datum, resolved identically by `ctx.resolve`. Size and
opacity are style functions (`r={d => Math.sqrt(d.mass)}`), not channels. `Text` content is
the `text` prop (constant or function); there is no `label` channel. Colours are strings; use
`theme.muted` etc., not slot names.

### 5.2 Marks

| Mark | Draws | Rules |
|---|---|---|
| `Line` | one path per `group`/`color`; `closed` | x-ordered unless `sort={false}`; rows with a null `y` leave a gap; `curve`: any d3 curve by name (`step-before`, `basis`, `catmull-rom`...) or a d3 curve |
| `Area` | band between ends | vertical `x y1 y2` (or `y` alone: from 0); horizontal `y x1 x2`; hints 0 into the domain only when it fills from 0 |
| `Rect` | rectangle | per axis: interval `a1,a2`; or a point `a`: on a band scale -> the band's extent (`inset` px off each side); on a continuous scale -> centred, `width` px (default 6). A `baseline` prop turns the single continuous point into `[baseline, v]`. |
| `Bar` | = `Rect` with `baseline: 0` on its value axis | value axis is y, unless y is band (then x); the other axis follows the Rect rules, so bars over a time x are centred, `width` px |
| `Dot` | circle (`r` style) | |
| `Link` | segment `x1,y1 -> x2,y2` | ±Infinity ends reach the plot edge; band points use the band centre |
| `Text` | text at the far end `y2 ?? y` and `x` | `text`, `dx`, `dy` (number or function), `textAnchor`; drawn unclipped, on top |
| `Arc` | wedge per row | pie/donut/gauge; see 5.4 |

Point marks (`Dot Line Text Link Area`) put a band value at the band centre; only `Rect` uses
the extent. `color` maps to `stroke` for `Line` and `Link`, to `fill` for the rest. Default
colour is `theme.palette[0]`. A zero-width or zero-height `Rect` is drawn as a line, stroked
with its fill when it has no stroke (a doji). Per axis, when a row has both an interval and a point, the
interval wins (drawing and training alike). A zero-height `Rect` with stroke and no fill is a line across a
band (box median).

### 5.3 Positions

`position` is a prop on a mark: a function, or a factory below. Positions see rows only.

- `stack({ by = group ?? color, along = 'y', groupBy = 'x', offset = 'zero' | 'expand' })`
  writes `y1 y2` (`x1 x2` when `along: 'x'`). Rows sharing `groupBy` pile in first-seen `by`
  order; negatives pile separately downward from 0; null and NaN pile as 0; `expand` normalises to 1. For `Area`,
  missing `(x, by)` cells count as 0. Streamgraph and diverging (Likert) offsets are
  *recipes*: compute `y1 y2` with `d3.stack().offset(...)` in the layout and draw `Area`/`Rect`.
- `dodge({ by = group ?? color, padding = 0.1 })` writes `u1 u2` (a fraction of the band, from
  slot index over the distinct `by` values of the layer, first-seen). It never looks at scales:
  `Rect` applies `u1 u2` on its band axis (x if x is band, else y) and ignores them otherwise.
  `u1 u2` are never trained.

### 5.4 The mark seam

```js
export const defineMark = (name, { render, domain }) => props =>
  ({ $: 'mark', mark: name, render, domain, props });
```

`ctx` passed to `render(rows, ctx)` (decided; everything a third party needs):

```
{ x, y,                 // value -> pixel (band centre); ±Infinity -> the edge; NaN with no scale
  color,                // value -> colour string; .domain() lists the keys
  area,                 // { left, right, top, bottom, width, height }
  bandwidth,            // { x(), y() } in px, 0 on non-band scales
  theme, props,
  resolve(row, prop, fallback),   // style precedence: function(d) > constant > colour scale > fallback
  field(row, prop),               // a value prop: a string is a field name, a function is called
  measure(text, size) }
```

Each row is `{ d, x, y, x1, x2, y1, y2, color, group, ...fields written by position }`; `d` is
the original datum. `domain(rows, props, scaleOptions) -> { x?: [..], y?: [..] }` adds values
the continuous scales must cover; `scaleOptions` are the declared `Scale`s, so a mark can tell
its band axis. Built-in `Bar` hints 0 on its value axis, `Area` only when it fills from 0;
band, ordinal and log scales ignore hints. A plot whose
layers use no position channel (a pie) builds no x/y scale and `compile` does not throw.

A mark that needs its own channel keys writes them as plain fields and reads them back in
`render`; training custom keys into scales is deferred (tier 2).

`Arc` dogfoods the seam (no x/y; `value` is read by the mark, not a channel):

```js
export const Arc = defineMark('arc', {
  render: (rows, { area, color, field, props }) => {   // d3 imported by the module
    const cx = (area.left + area.right) / 2, cy = (area.top + area.bottom) / 2;
    const R = Math.min(area.width, area.height) / 2, inner = (props.inner ?? 0) * R;
    const arc = d3.arc().innerRadius(inner).outerRadius(R);
    return d3.pie().sort(null).startAngle(props.startAngle ?? 0).endAngle(props.endAngle ?? 2 * Math.PI)
      .value(r => field(r, 'value'))(rows)
      .map(a => ({ t: 'path', d: arc(a), transform: `translate(${cx},${cy})`,
                   fill: color(a.data.color) }));
  },
});
```

A hex bin or a violin is the same pattern: `defineMark` returning `{t:'path'}` shapes.
`d3-hexbin` is not in tauler's d3 bundle, so a hexbin mark does its own hexagon maths.
`Descriptors hold functions; only the compiled scene is serialised.` The `$` guard keeps
tauler's JSX factory from reshaping the object (it reshapes objects with both `type` and
`props`); an acceptance test covers it.

### 5.5 Shapes (the scene schema)

`drawScene` copies attributes with camelCase -> kebab-case; one table:

| `t` | attributes |
|---|---|
| `rect` | `x y width height rx` |
| `circle` | `cx cy r` |
| `line` | `x1 y1 x2 y2` |
| `path` | `d` |
| `text` | `x y dy text` (`text` is textContent) |
| any | `fill stroke strokeWidth strokeDasharray fillOpacity opacity textAnchor fontSize fontFamily transform` |
| flags | `crisp` (crispEdges), `front` (unclipped, above marks) |

### 5.6 Scales

`<Scale channel type domain range padding nice>`; channels `x y color`. Types:
`linear log time band ordinal sequential`. Scales are shared by every layer through the
channel name, whatever field each layer reads.

Inference reads *all* non-null values:
- Date objects -> `time`; numbers -> `linear`; strings -> `band` (position) / `ordinal` (colour);
  mixed types -> `band`
- numeric `color` -> `sequential`; otherwise `ordinal`
- JSON has no Dates: `<Scale channel="x" type="time"/>` coerces strings and numbers with
  `new Date`; without it ISO strings are band values
- integer ids used as categories (hour, week, year) stay `linear`; write
  `<Scale channel="x" type="band" domain={d3.range(24)}/>` (an explicit `domain` keeps empty bands)
- a band domain is sorted for numbers/Dates and first-seen for strings
- band `padding` is the inner padding, outer = inner/2; default 0.2 when the other axis is
  continuous (bars), 0 when both are band (heatmap, Gantt); thin bars use `Rect inset`
- `nice` applies to linear, log and time unless `domain` is set
- log: any domain value <= 0 throws, naming the channel
- `range`: ordinal -> array of colours; sequential -> any number of stops, placed at the
  `domain`'s values when it has one per stop, else spread evenly (three around a pivot make it
  diverging), clamped; position scales rarely need one
- default `sequential` ramp: `interpolateRgb(mix(theme.line, theme.palette[0], 0.15), palette[0])`,
  so the low end stays visible against the background; y band runs top-down

Tier 2: named scales (`name`, mark `scale={{ y: 'right' }}`, `Axis side`) for real dual axes;
function-typed `type`; custom-key training; `sqrt`/`pow`. Two stacked Plots are *not* an
equivalent: they are two Pictures; with the same `margin` and explicit `domain`s they align
but cannot overlay.

### 5.7 Axes and grid

`Axis { channel, ticks, format }`, `Grid { channel, ticks, tone }`. x at the bottom, y at the
left. `ticks` is a count (default 1 per 90px on x, 42px on y, fixed 11px text) or an array of
values; a y axis's labels take at most a third of the width, longer ones are cut with `…`;
on a band axis a count picks every k-th label, and with no `ticks` the axis keeps every k-th
label with k the smallest that stops labels overlapping (by `measure` on x, the font size on y). `format` is a d3 format string or a
function; on a band, Dates use d3's time-axis format at each value's precision (`02 PM`,
`Sat 24`), anything else `String`. A `Grid` uses the ticks of its channel's `Axis` unless
given `ticks`, so lines and labels agree. Marks clip to the plot area expanded by a constant 4px, so
edge dots stay whole; `front` shapes are unclipped.

### 5.8 Small multiples

No facet component (ADR 0013). Plain JS; `margin` keeps panels aligned:

```jsx
const byCore = d3.groups(samples, r => r.core);
const yMax = d3.max(samples, r => r.load);
{byCore.map(([k, rows]) => (
  <Plot width={60} height={40} margin={{ left: 4, right: 4 }}
        data={rows} x="t" y="load" theme={theme}>
    <Scale channel="y" domain={[0, yMax]}/><Line/>
  </Plot>))}
```

### 5.9 Theme

`chartTheme(themeColor, font)` unchanged: `{ ink muted line lineSoft lineStrong palette font }`,
resolved colour strings parseable by `d3.rgb`. A missing required token throws rather than
drawing black.

### 5.10 Legends

Not in the Picture. Export `colorScale(domain, theme)` (the function `Plot` itself uses), and
draw the legend as ordinary tauler JSX beside the figure, so swatches cannot drift from the chart.

### 5.12 Trees and maps

Both are marks on `defineMark`; core adds only the projection.

- **Trees** (`hierarchy.jsx`): `Treemap` (`tile`: squarify, binary, slice, dice, slice-dice),
  `Tree` (`layout`: tree or cluster; root on the left, room kept for labels), `Pack`,
  `Partition` (an icicle). The hierarchy comes from flat rows (ADR 0013): `path` ("a/b/c",
  missing parents filled in) or `id` + `parent`; `value` sizes leaves; `label` is a value prop
  (a node with no row shows its last path segment). Leaves are coloured by their branch below
  the trunk unless they have `fill` or a `color` channel. Treemap shapes come in row order.
  Labels are drawn only where they fit.
- **Maps** (`geo.jsx`): `<Plot projection fit>`. `projection` is a d3-geo name
  (`equal-earth`, `mercator`, `orthographic`...) or a projection object; core fits it to the
  plot area around `fit` (GeoJSON, the whole globe by default) and hands it to marks as
  `ctx.projection`. `Geo` draws one GeoJSON row per path (a `color` channel makes a
  choropleth); `GeoDot` draws `lon`/`lat` points and skips ones the projection hides.
  Polygons wound the RFC 7946 way (which d3-geo reads as "everything but this") are rewound
  when they would cover more than a hemisphere.
- **Cost:** a detailed map makes long paths, and the scene hash is O(drawing): a 3000-point
  coastline measured 29 ms per Tick without a `key`, 0.4 ms with one. Maps should take a
  `key` (5.11).

### 5.11 Key, determinism, cost

Decided by the measurement gate (step 0, section 10): **A, with `key` as the escape hatch.**

- **No `key` (default, A).** `compile` runs in the render runtime every Tick; the figure key is
  `hash53(JSON(scene))` (cyrb53), the scene rounded to 2 decimals (pictures differing by less
  are intentionally one Picture). `draw` calls `drawScene`.
- **`key` given.** The caller owns identity: `Plot` does no work in the render runtime and
  forwards `key` to `<D3Figure key>`; `draw` compiles inside the Draw runtime. The key must
  change whenever the picture should (include a data version or the last timestamp). Use it
  for windows of thousands of rows, or when a function prop captures values.

Determinism either way: the scene is a pure function of props; statistics are deterministic.
The Draw runtime re-evaluates the layout; a key it does not reproduce is not drawn.

## 6. Statistics

Plain `data -> data` functions, no grammar involvement, called in the layout (so they run on
the loop each Tick; keep them cheap; Accumulator windows are small). Shipped as `stats.jsx` (exported from the package index): `bin`, `bin2d`, `group`, `rolling`, `cumsum`, `kde`, `ecdf`, `boxStats`.
Users write their own the same way; `Array` methods and `d3.*` work directly.

## 7. Coverage

Verdicts: **core** = tier 1 JSX; **recipe** = needs a stats call; **mark** = needs `defineMark`.

| Chart | JSX | Verdict |
|---|---|---|
| line / sparkline | `<Line/>` | core |
| area range + mean | `<Area y1="lo" y2="hi" fillOpacity={.2}/><Line y="mean"/>` | core |
| stacked area / bar | `<Area position={stack()} color="s"/>`, `<Bar position={stack()} .../>` | core |
| grouped bar | `<Bar position={dodge()} x="cat" y="v" color="g"/>` | core |
| horizontal bar | `<Bar x="v" y="name"/>` | core |
| scatter / bubble | `<Dot x="a" y="b" r={d => Math.sqrt(d.m)} color="k"/>` | core |
| log scatter | `<Scale channel="x" type="log"/><Dot/>` | core |
| histogram | `data={bin(..)}` `<Bar x1="x0" x2="x1" y="count"/>` | recipe |
| density | `data={kde(..)}` `<Area x="x" y="density"/>` | recipe |
| 2D histogram | `data={bin2d(..)}` `<Rect x1="x0" x2="x1" y1="y0" y2="y1" color="n"/>` | recipe |
| heatmap | `<Scale channel="x" type="band" domain={..}/><Rect x="hour" y="day" color="n"/>` | core |
| box plot | `data={boxStats(..)}` `<Link x="g" y1="lo" y2="hi"/><Rect x="g" y1="q1" y2="q3"/><Rect x="g" y1="med" y2="med" fill="none" stroke={..}/>` + outliers `<Dot data={..}>` | recipe |
| lollipop / error bars | `<Link x1="k" x2="k" y1="lo" y2="hi"/><Dot/>` | core |
| candlestick | `<Link x1="t" x2="t" y1="low" y2="high"/><Rect x="t" y1="open" y2="close" width={5} fill={d => ..}/>` | core |
| Gantt | `<Scale channel="x" type="time"/><Rect x1="start" x2="end" y="task"/>` | core |
| waterfall | `data={cumsum(..)}` `<Rect x="step" y1="from" y2="to"/>` | recipe |
| bullet | `<Rect y1={0} y2="range" inset={0}/><Rect y1={0} y2="actual" inset={8}/>` | core |
| slope chart | `<Scale channel="x" type="band"/><Line x="year" y="v" group="name"/>` | core |
| shaded region / threshold | `<Rect x1={t0} x2={t1} y1={-Infinity} y2={Infinity}/>`, `<Link x1={-Infinity} x2={Infinity} y1={90} y2={90}/>` | core |
| connected scatter | `<Line sort={false} x="a" y="b"/><Dot/>` | core |
| value labels on bars | `<Text y="v" text={d => d.v} dy={d => d.v < 0 ? 12 : -4}/>` | core |
| streamgraph / Likert | `d3.stack().offset(..)` in layout, then `<Area x y1 y2>` / `<Rect x1 x2 y>` | recipe |
| pie / donut / gauge | `<Arc data={parts} value="n" color="k" inner={.6}/>` | core (`Arc`) |
| violin / hexbin / ridgeline | `defineMark` returning path shapes | mark |
| dual axis (overlay) | tier 2 named scales | tier 2 |
| radar | `coord={polar()}` | planned (GAPS 1.4b) |
| Sankey, parallel coords | statistic + existing marks | planned (GAPS 2.2) |

### 7.1 Grammar stress test (scorecard)

`charts/test/grammar/grammar.test.jsx` rebuilds the scenarios of a minimal ggplot2 suite on
synthetic data (`data.js`, seeded) and checks numbers computed independently in each test;
every drawing is kept as an SVG file (`__svg__/`, `pnpm gallery` to view them). A gap is a
`test.fails`, so it turns red when closed; a non-goal is a `test.skip` with its reason.

| # | Scenario (ggplot2) | Result |
|---|---|---|
| 1, 4, 5 | baseline; per-layer data; explicit `group` | pass |
| 2, 3 | a layer's colour does not split other layers; the Plot's does | pass (grouping); no smoothing recipe |
| 6, 7, 8, 9, 11 | count, bin width, density per group, mean ± se, box plot | pass (stats as plain functions) |
| 10 | filled 2D density | pass, as a custom mark (`d3.contourDensity` on `defineMark`, no core change) |
| 12, 14 | stack; fill (`expand`) | pass |
| 13 | dodge2: fewer series in a band get wider bars | **gap** (`dodge` keeps one slot per series everywhere) |
| 15 | jitter | **gap** (would need a seeded, deterministic position) |
| — | stat before position: stacked per-group histograms = the overall one | pass |
| 16, 17, 19 | log scales; continuous colour and size; dates every 10 years | pass (`ticks` takes values or a d3 interval) |
| — | scale limits zoom, they do not filter | pass (`Scale domain`; filtering is `.filter()`) |
| — | scale vs coord transform | differs by design: statistics run before scales, so `log` acts like `coord_trans` |
| 18 | merged legends | non-goal (legends are tauler JSX; `colorScale` gives the Plot's colours, tested) |
| 20 | pie | pass (`Arc`) |
| 21 | coxcomb, polar munching | planned (GAPS 1.4b; no coordinate mapping yet) |
| 22 | coord_flip | pass (swap the channels) |
| 23, 24, 25 | facets with free scales; a grid with empty panels and margins; per-panel annotations | pass (one Plot per panel, plain JS) |
| 26 | Minard's march | pass; **gap**: no domain expansion, so labels at the data's edges need `margin` |

What the suite found and fixed: overlapping band labels (now thinned to fit); crowded log-axis
labels (the format now gets the tick count, not the number of ticks); `bin` with explicit edges
starting the first bin at the data's minimum. `charts/test/properties.test.js` (fast-check)
found: box whiskers ending inside the box (hinges now bound them, as in ggplot2); d3 7.9.0's
`bin().thresholds(1)` returning infinite edges; d3's `nice()` shrinking a domain whose span is
at float precision (now undone when it would cut data off).

### 7.2 Edge cases

`charts/test/grammar/edge-cases.test.jsx` reproduces edge cases found by stress-testing, each with
its own made-up data. Scenarios were chosen after reading Observable Plot's public test gallery
for ideas; no code or data was taken from it.

| Edge case | Before | Now |
|---|---|---|
| NaN in a stacked value | the row's end was NaN; the pile below it was poisoned | piles as 0 |
| channels as arrays (columnar data) | silently no rows | one row per element |
| colour ramps of more than three stops | stops past the second silently ignored | all stops used |
| curves beyond `linear step-after monotone` | threw "curve is not a function" | any d3 curve by name |
| `bin` over timestamps | numeric, uneven edges | round time edges, as Dates |
| long y-axis labels | plot area of negative width | labels cut to a third of the width |
| log scale of one value; bars a day wide (`x2` accessor) | worked | kept as tests |
| beeswarm; arrows | not built in | custom marks on `defineMark`, in the test (beeswarm needs pixels, so it is a mark, not a position) |
| difference chart; ridgeline | not built in | plain data prep (`min` of two series; per-series baselines on one linear y) |

Open (decisions, not bugs): numeric years format as `2,020` (d3's default grouping); `Text`'s
`text="field"` is literal text, where Observable Plot reads a field; an ordinal palette repeats
past its length (six colours in `chartTheme`). Not built yet (scope rule, section 1): polar,
multi-line text. Interaction stays a non-goal. Geo and trees are marks (5.12).

### 7.3 The gap example suite

Every gap found by stress-testing the library, feature gaps and ergonomics gaps alike, has one
minimal, seeded example in `charts/test/gaps/`, specified by a row in `charts/GAP-EXAMPLES.md`.
An open gap is a `test.fails` (red first) that also asserts its ergonomics constraint (raw input
data, no hand-set margin, and so on); closing the item turns it green. A docs test fails if a
row has no example.

The scenarios were chosen after reading the public example galleries of other charting libraries
(Observable Plot, and several chart-component catalogs) to see which problems come up. The
examples themselves use invented data, and no code, data or text was copied from them.

## 8. Roadmap and acceptance tests

Order, one behaviour per TDD cycle (red test, minimal green). Tests run with Vitest (`pnpm test`);
`compile` is pure and needs no DOM; `test/tauler.js` stands in for tauler (its JSX factory,
`D3Figure`, and a linkedom Draw step) so `Plot` is tested end to end.

0. **Measurement gate** (5.11): decide A or B before step 1.
1. Characterisation snapshot of the existing Line+Axis scene (refactor safety net).
2. `hash53` replaces FNV (collision pair gets distinct keys; stable across runs).
3. Open mark table: `defineMark` + `$` guard; a custom mark's shapes reach the scene; `ctx` shape.
4. Shape schema rename (SVG names, `transform`); `drawScene` writes exactly the table.
5. Interval channels `x1 x2 y1 y2`, per-axis inheritance drop, `±Infinity` edges.
6. `Rect` (intervals, band extent, `width`, `inset`), then `Bar`/`baseline`, then `Link`;
   retire `Rule` and the old `Bar`.
7. `position`: `stack` (negatives, missing cells), then `dodge` (`u1 u2`) consumed by `Rect`.
8. Inference: all-values `inferType`, numeric colour -> sequential, band sort, `type="time"`
   coercion, integer-band error text, padding rules, log guard.
9. `margin` prop; tick labels computed once per axis (counting `format` in the test).
10. `Arc` through `defineMark`; no-position-channel plot compiles.
11. `stats.js` recipes and README entries.

Every row of section 7 gets a fixture asserting its shape count and key stability; the `key`
forwarding test and the `$` guard test are acceptance items. Tier 2 follows demand: named
scales, function scales, custom-key training, `sqrt`.

## 9. Open items

- Text measurement beyond monospace (a per-font width table).
- Segment-coloured lines work (consecutive pairs drawn as `Link`s with a colour scale or a
  `stroke` function). Missing: one smooth gradient along a single path.
- Roadmap step 8's "integer-band error text" is not specified anywhere else; nothing throws for
  integer categories on a linear axis (the README says to declare `type="band"`).

## 10. Decision log (reviewer disagreements)

- Key: toString-hashing rejected (closures collide); scene hash is the default; input hash
  with a required `key` is the fallback; the measurement gate decides, not opinion.
- Statistics: grammar `transform`s rejected for plain functions (ADR 0013); only `position`
  needs rows, so only it is in the grammar.
- Rect: the "infer `[0,v]` / spans plot" magic was replaced by explicit `baseline` and `±Infinity`.
- Polar coord, facet component, Legend, size/opacity channels, theme-slot colour strings,
  `label` channel, `train`, `Rule`: cut. (History: polar, and size and opacity channels, are in
  scope again under section 1; see GAPS 1.4b and 2.1.) `Arc` kept as the dogfood mark because pie is common.
- `key` vs `figureKey`: tauler's JSX keeps `key` in props, so `key` stays.
- Dual axis: honestly tier 2; stacked Plots are not an equivalent.
- Review by the implementer (before step 0), all accepted: (1) training and drawing use a row's
  interval when it has one, so `stack({offset:'expand'})` does not train the raw `y`; (2) `Bar`
  picks its value axis (y unless y is band) instead of throwing on two continuous channels, so
  bars over a time x work; (3) `domain()` gets `scaleOptions`, Area hints 0 only when it fills
  from 0, band/ordinal/log ignore hints (else a horizontal Bar adds a `0` band and an Area
  range is squashed to 0); (4) `ctx.field` for value props (`resolve` reads `value="n"` as the
  string "n"); (5) `ctx.d3`, since core is passed d3 and the Arc example needs it; (6) Date
  bands keep `%b %-d`; mixed types infer band.
- Key, measured (step 0; tauler render runtime, `JsxEvaluator`, release build, median of 40
  Ticks, 3 runs each; Plot = Grid + Area + Line + 2 Axes, time x):

  | rows | A: Plot eval per Tick | B: input `JSON` + hash per Tick | of which A's scene hash |
  |---|---|---|---|
  | 50 | 1.6 ms | 0.6 ms | ~0.5 ms |
  | 500 | 7.8 ms | 6.2 ms | ~2.4 ms |
  | 5000 | 72 ms | 65 ms | ~22 ms |

  `import 'd3'` costs ~30 ms once per runtime at module load, never per Tick. A cold d3 cache
  fails the whole layout's module resolution (like a cold `@gh` package, which this package
  already is) until the fetch's reload. Conclusion: B's input hash is O(rows) like `compile`
  and saves only 10-60%, so it does not buy its closure-key hazard. A stays under the Minimal
  budget (10 ms per Hop) up to ~500 rows (the bar's Accumulator window is 60). Past that, a
  caller-given `key` skips all render-runtime work; this replaces "key as a prefix" from the
  review above.
- Implementation (steps 1-11), where the code differs from v4:
  - Core imports `d3` itself; `compile(props)` takes no d3 and `ctx` has no `d3` (review item 5
    withdrawn). tauler resolves `"d3"` in every runtime and `Plot` must load it anyway under A,
    so passing it was plumbing with no consumer. Custom marks import d3 the same way.
  - The annotation rule counts a `Layer`'s data as the mark's own: `<Layer data x><Link y1={-Infinity}
    y2={Infinity}/></Layer>` (5.1's own example) needs the Layer's rows, not one constant row.
  - A Rect with zero width or height is drawn as a `line`: SVG renders nothing for a zero-size
    rect, so the box-plot median rule (5.2) needs it.
  - Time scales get `nice` (5.6 said so; the draft did not), which moved the snapshot's x ticks.
  - Each mark declares which style prop the colour channel feeds (`defineMark(name, { color:
    'stroke' })`), so `resolve` can apply the colour scale to `stroke` for Line/Link and `fill`
    otherwise.
  - Statistics are `stats.jsx`, not `stats.js`, like every other file in the package.
  - Tests use Vitest (one runner for everything, including JSX), not `node --test`.
- Post-merge review, all fixed with regression tests (`charts/test/review.test.js`): a flat Rect
  with only a fill drew an unstroked, invisible line; Grid ticks were computed against the final
  area while Axis labels used the estimated one, so they could disagree (5 lines over 2 labels at
  heights 121-140); a plot of only ±Infinity annotations had no `ctx.x`; Date bands were
  labelled `%b %-d` whatever their precision, a calendar leftover (now d3's multi-scale time
  format, rather than v4's `String`, which prints a long timezone string). Three coverage
  fixtures now snapshot their geometry, not just their shape counts.
- Stress-test pass (7.2): fixed NaN stacking, array channels, multi-stop colour
  ramps (one polylinear scale replaces the sequential/diverging split), named curves, time bins
  and long-label overflow. All are made-up examples.
- Trees and maps reversed from non-goals to marks (5.12) at the user's request: d3's layouts
  and projections do the work, and `defineMark` already hands marks the pixel area, so the only
  core change is `ctx.projection`. Polar stays parked: unlike these, it needs every mark to map
  (x, y) jointly, which is a coordinate stage (as in ggplot2, G2 and ECharts; Observable
  Plot's projections are geographic only); marks-only polar (Vega-Lite, Recharts, Plotly) was the cheaper option.
  (Superseded by section 1's scope rule: polar is planned, GAPS 1.4b.)


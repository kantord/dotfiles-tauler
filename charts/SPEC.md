# charts: a grammar of graphics for tauler

Status: implemented (v5, as of 2026-10-28); every planned item is built (`charts/GAPS.md` keeps only
the non-goals and housekeeping). v4 was reviewed in three rounds (tauler-fit skeptic, minimalist,
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
  (a mark's own channels cannot train a scale), coordinates, the scene's shape schema (paints
  are open: 5.5), axes and guides. A stage after the scales exists for pixel offsets (4, 5.3).
- **Scope growth from universality is accepted.** A universal charting tool grows; that is the
  cost of the goal, not a defect. Nothing is descoped to keep the plan short. The control is the
  fewest-pieces test above, plus a design precondition per large item, never a
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

### Formerly non-goals, now built

Previously listed as non-goals; the reasons given were convenience, so they were gaps. All are built:
polar coordinates (5.13), Sankey and parallel coordinates (a statistic and existing marks; section 6),
multi-line and wrapped text (`Text`, 5.2), shape, size and opacity as scale-trained channels (5.6),
trees and maps (5.12).

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

Hierarchy layouts are statistics (`treemap`, `tree`, `pack`, `partition`, `layouts.jsx`) that any
mark draws (section 6). The fused marks (`Treemap`, `Tree`, `Pack`, `Partition`, `hierarchy.jsx`)
stay as the one-call form: their `label` prop applies the same rule as `Text fit` (`fitsBox`, typeset.jsx) and draws the
same names; the parity test in `charts/test/layouts.test.jsx` locks the two together. They are not retired: the fused marks'
label shapes (a 3px inset, a `dy` of `0.9em`) differ from `Text` in a box (centre of the line, `0.32em`), so removing them would move the snapshots.
`partition` rows also draw a sunburst, as ordinary `Rect`s under `coord={polar()}` (5.13).

Decisions since v5: dodge fits the series present in each band
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
   stage after the scales (SPEC 4, the pixel stage, exists for pixel offsets only).
3. **Flow diagrams need the curved-link and ribbon pieces** (`Link curve`, `Area thickness1/2`,
   5.2) and a layout statistic written here (`flow`, section 6).
4. **Users cannot import these packages either:** tauler resolves only `d3` (and `linkedom`)
   for a `D3Figure`. A layout author who wants one has the same option: write it.
5. **The same test applies to any other module outside the 578 exports:** it is not used unless
   tauler's bundle changes, so a feature that needs one is built here or waits for a decision
   about the bundle.
6. **Library code for both is written here** (`flow` and `hexbin` are built, section 6).

Vocabulary follows CONTEXT.md: an **Accessor** names a data part; a *channel* is the role an
accessor plays. Avoid "encoding", "aesthetic", and names clashing with tauler (`Tick`, `window`).

## 3. The draft this replaced, and defects fixed by the port

    descriptors -> collect -> evaluate (rows) -> trainDomains -> margins -> scales
      -> MARKS[name](layer) -> scene {width,height,clip,back,marks,front}
      -> key = spec string of the props, or hash(JSON(scene)) when they hold a closure ; drawScene(svg, scene, clipId) in draw

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

`compile(props)` (core imports `d3`, which tauler resolves in every runtime) is an ordered list
of stages, each `(state) -> state`, folded over one state object. A stage returns a new state
and never mutates an earlier field.

| # | Stage | Reads | Writes |
|---|---|---|---|
| 1 | collect | `props` | `spec`: `{ layers, scales, guides, grids }` (`guides`: axes and legends as `{ kind, props }`); `data` and channels inherited (5.1) |
| 2 | evaluate | `spec` | `rows`: one array per layer, `rows[i]` for `spec.layers[i]`, each row `{ d, ...channels }` (`d` is the original datum), then the mark's `position` (`stack`, `dodge`, `jitter`, `(rows, {props, mark, scales}) => rows`, or an array of them applied in order) in data space with **no access to trained scales** (they do not exist yet; `scales` is only the declared `Scale` options; may add `y1 y2` / `u1 u2`) |
| 3 | train | `spec`, `rows` | `domains[channel][name]`: `{ type, domain, opt, padding, nice }`, from built-in channels plus each mark's `domain()` hint, per scale from the layers bound to it (5.6); per axis a row trains its interval `a1 a2` when it has one, else its point `a` (so a stacked row's raw `y` never trains the domain). Under `geo`, no `x`/`y` domains (`polar` keeps them) |
| 4 | claim | `spec`, `domains`, `props`, `env` | `claims`: `{ margin, data }`, the room every mark (its `room()` hook) and guide (axes, then the others, each in the order written) asks for, as a running max seeded at 8 px; `data` holds what each guide computed (an axis's tick labels, once). Guides on one side stack (5.7) |
| 5 | area | `claims`, `props` | `margin` (`claims.margin`, with the `margin` prop overriding per side, applied last), `area` (`left top right bottom width height`); `env.bound` (the coord bound to the area) and `env.projection` when the Plot has a coord |
| 6 | scales | `domains`, `area`, `env` | `scales[channel][name]`: ranges taken from the area |
| 7 | pixel | `spec`, `rows`, `scales`, `area` | `rows`: the entries of a layer's `position` array tagged `stage: 'pixel'` run here, `(rows, {props, mark, scales, area}) -> rows` with the layer's bound, built scales; they write pixel offsets `dx dy`, read by `ctx.point` (5.3) |
| 8 | render | `spec`, `rows`, `scales`, `area`, `claims`, `env` | `scene`: `{ back, drawn }`, grids and guides into `back`, then each mark's shapes in child order (first child at the bottom) |
| 9 | assemble | `scene`, `area`, `props` | `scene`: the final `{ width, height, clip, back, marks, front }`, shapes `tidy`-ed (`null` dropped, numbers rounded to 2 places) |

`state` also carries `props` (the input) and `env` (`theme`, `measure`, `coord`, and `bound` and `projection` once
stage 5 has run). `compile` returns `{ scene, key }`, with `key = hash53(JSON.stringify(scene))`;
`drawScene` paints the scene and is the only DOM-touching code.

Adding a stage is an insertion into the list: the pixel stage (7) went between `scales` and
`render` that way. `ctx` changes do not touch the list. The pixel stage is built as far as
`jitterPx` needs: a layer's `position` array splits by tag into a data-space prefix (stage 2) and
a pixel suffix (stage 7; a data-space entry after a pixel one throws), and the result is a pixel
offset. Not built, for want of a chart that needs them: absolute pixel rows (`px py`), `ctx.line`
reading pixel fields, and a second training pass for non-position scales (a pixel-derived value
that trains a colour scale shared with another mark). Add them when such a chart is written
first as a failing test.

Files, each at most 300 lines (a script test enforces it): `core.jsx` (descriptors, `collect`,
`evaluate`, the stage list and `compile`; it re-exports the
public names, so callers import from `core.jsx` only), `scales.jsx` (the scale-type and channel registries, inference, training,
building, `colorScale` and the legend helpers), `positions.jsx` (`stack`, `dodge`, `jitter`, `jitterPx`), `fields.jsx` (`read` and `num`, the field readers the statistics and layouts share), `paint.jsx` (gradient and pattern paints and their `<defs>` drawing), `polygon.jsx`, `rules.jsx` and `swarm.jsx` (the `Polygon`, rule and tick, and `Swarm` marks, re-exported by `marks.jsx`), `hexbin.jsx`, `spatial.jsx` and `composites.jsx` (statistics re-exported by `stats.jsx`), `charts/recipes/` (tested recipes: tooltip, violin), `ticks.jsx` (which values an axis marks and their labels), `guides.jsx` (the `GUIDES` table, `defineGuide`, the claim loop, axis and grid shapes), `polaraxis.jsx` (the axis under `polar`), `legend.jsx` (the Legend guide), `coord.jsx` (`geo`, the coord contract), `polar.jsx` (`polar`), `scene.jsx`
(shape schema, mark `ctx`, `tidy`, `hash53`, `drawScene`). If `scales.jsx` outgrows the limit,
it splits into `scales.jsx` (building) and `domains.jsx` (inference and training).

## 5. API

### 5.1 Plot, Layer, inheritance, channels

`<Plot width height data x y ... theme measure margin key>`; children are marks and pieces.
`margin` is a number (that many px on every side: `margin={0}` is none) or `{ top, right, bottom, left }` (sides not given keep what the guides claim); anything else throws `Plot margin: expected a number or { top, right, bottom, left }; got "x"` (5.7).
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
| `key` | a row's identity (`jitter` hashes it); never trained | none |

Inheritance, decided: a mark inherits every channel it does not set. **Per axis, if a mark sets
any of `a`, `a1`, `a2` itself, the inherited channels of that axis are dropped**, and a mark's
rows train only the channels it uses. `channel={null}` opts out of one inherited channel.
Style props and `Scale` are never inherited; `position` is inherited from a `Layer`, never from the Plot (a mark's own wins), so `<Layer position={stack()}><Area/><Line/></Layer>` stacks both the same way. On the Plot, `key` is the figure's key (5.11), not a channel. `±Infinity` means "the plot edge" and
never trains a domain. A mark with no `data` of its own or its `Layer`'s, whose own channels are all constants, is an
annotation: one row, inheriting no channels (not even `x` from the Plot), so it needs its own `x` and `y` where the mark uses them: `<Rect y1={0} y2={1}/>` has no x, and throws. A `Rect` (and `Bar`) whose layer declares no `x`, `x1` or `x2` (or no `y`, `y1`, `y2`) at all throws `Rect x: no x channel, so nothing is drawn; give x or x1/x2` (`y` likewise): the check is on the declared channels, never on values, so a column that is empty in the data stays quiet, and a layer with no rows says nothing. `Link` skips a row with a missing end instead.

Style props (`fill stroke strokeWidth r fillOpacity opacity text dx dy curve inset width ...`)
are a constant or a function of the datum, resolved identically by `ctx.resolve`. Size, shape
and opacity are also channels (5.6): `size="mass"` feeds the style prop the mark declares for it
(`Dot`: `r`), `opacity="conf"` (a field name; a function or number stays the style prop) feeds
`opacity`, `shape="kind"` picks a d3 symbol; an explicit style prop wins. A `size` prop on a
mark that declares no size prop (`Rect`, `Line`) throws. `Text` content is
the `text` prop (constant or function); there is no `label` channel. Colours are strings; use
`theme.muted` etc., not slot names.

**A non-finite position is not drawn.** `ctx.point` returns null when either coordinate is not a finite
number (a missing value, `NaN`, a value the scale cannot place), checked after a row's `dx`/`dy`, so
`Dot`, `Text`, `Vector`, `Image`, `Link`, `Tick`, `Swarm` and `Polygon` (a ring with such a vertex) skip the row, and
the tooltip recipe with them; never a stray point at 0,0. `Line` and `Area` split there: a gap, as for a null `y`. `Arc` skips a row whose `value` is
not finite. The rule is for the rectangular coordinates and for `ctx.point`; the paths a polar or geo `coord.line`
densifies (`Line`, `Link`, rules under a coord) are not covered. A `Text` with only `x`, or only `y`, is legal: the
missing one is the plot's edge. A `Text` with neither (and no box) throws `Text x: no x or y channel; give x/y`, except under `polar`, where it sits at the centre.

### 5.2 Marks

| Mark | Draws | Rules |
|---|---|---|
| `Line` | one path per `group`/`color`; `closed` | x-ordered unless `sort={false}`; rows with a null `y` leave a gap; `curve`: any d3 curve by name (`step-before`, `basis`, `catmull-rom`...) or a d3 curve |
| `Area` | band between ends | vertical `x y1 y2` (or `y` alone: from 0); horizontal `y x1 x2`; hints 0 into the domain only when it fills from 0. A ribbon: `x1 x2 y1 y2` with `thickness1`/`thickness2` (field, function or number, in y data units, centred on the line): one path per row, straight edges, or d3's horizontal links with `curve="link-horizontal"`; the y scale is trained to cover the thickness |
| `Rect` | rectangle (a wedge under `polar`, 5.13) | per axis: interval `a1,a2`; or a point `a`: on a band scale -> the band's extent (`inset` px off each side); on a continuous scale -> centred, `width` px, which a `Rect` must give (`width={px}`), or a `baseline` prop turns the single continuous point into `[baseline, v]`; with neither, nor `a1`/`a2`, it throws `Rect y: single value on a continuous scale; give y1/y2, baseline, or width={px}` (`x` for the x axis). |
| `Bar` | = `Rect` with `baseline: 0` on its value axis | value axis is y, unless y is band (then x); the other axis follows the Rect rules, so bars over a time x are centred, `width` px (default 6: the one place the default thickness stays; it never throws for a single value). A zero-length bar (value 0) draws nothing, under a coord too; a `Rect` of zero height or width stays a line (median rules, dojis) |
| `Vector` | a line from each point `x,y`, `length` px long, turned `angle` degrees clockwise from up | `angle` a field or function of the datum; `length` a constant in pixels (default 10), the same at any figure size (a data-driven length would be a channel through a scale, 5.6). The end is the point plus a pixel offset computed in the mark. Stroke styles and `markerEnd={arrowhead()}` as on `Link`; rows with a null angle or a point hidden by the coord are skipped |
| `Dot` | circle (`r` style) | `rx` (x scale) or `ry` (y scale) instead give the radius in data units (field, function or number), so a unit-space layout scales with the plot; `rx` wins; the scene has no ellipse, so the other radius is not drawn |
| `Link` | segment `x1,y1 -> x2,y2` | ±Infinity ends reach the plot edge; band points use the band centre; `curve="link-horizontal"` draws d3's horizontal link, any other `Line` curve name that curve (not under a coord); a row with a missing end (null, NaN) is skipped |
| `Text` | text at the far end `y2 ?? y` and `x`, or inside the box `x1 x2 y1 y2` | `text`, `dx`, `dy` (number or function), `textAnchor`; drawn unclipped, on top. It needs an `x` or `y` (or the box): with neither channel declared it throws `Text x: no x or y channel; give x/y`, except under `polar`, where it is at the centre (there is no `at` prop); with only one, the other is the plot's edge. `width` (px) wraps the text into lines no wider (a word wider than `width` is cut by characters; `\n` always breaks); each line is its own `text` shape, `1.2 x fontSize` apart. `angle` (degrees clockwise, a number or function) turns the whole block about its anchor with a `rotate()` transform. In a box (all four of `x1 x2 y1 y2`, continuous scales) the text is centred, or at the top-left (`textAnchor="start"`) or top-right (`"end"`), 3px in. Under a coord the corners and the middle of the box go through `ctx.point` (a sunburst label sits at its wedge's middle; the box is the bounding box of those points). `fit` draws a label only if every line, plus 4px, is no wider than the box and the block, plus 3px, no taller; without `width` a label is one line, as the treemap labels were; `fit` without a box throws |
| `Image` | an `image` shape centred on each point | `href` (a field of the datum, or a `data:` URL itself), `width`, `height` px (default 16); no network use is assumed |
| `Group` | one `g` shape of pixel-space scene shapes | reads no rows; `shapes` (array, or a function of `ctx`), `transform`, `clip`, `mask`, `filter`, `blend`, `opacity`, `front`; an inset or an annotation under one transform or clip |
| `Polygon` | a closed path per row from rings in data space | `points` (field or function of the datum): a ring of `[x, y]`; `holes` (default the field `holes`): rings cut out of it, turned round if wound the same way. Each vertex goes through `ctx.point` (so a coord applies; a ring with a hidden vertex is skipped). The `domain()` hook trains `x` and `y` on the outer rings, and a position scale with no row values is built from hints alone, so `Polygon` needs no `x` or `y` channel. Style props as `Rect`. `color` feeds `fill`, so contour lines coloured by level are `colorTo="stroke"` (the fill then defaults to none), not `fill="none"` alone: a Polygon with `fill="none"`, no `stroke` and no `colorTo="stroke"` can never draw, and throws `Polygon: fill "none" with no stroke draws nothing; set stroke or colorTo="stroke"`. Rows come from `hexbin`, `delaunay`, `contours`, `densityContours` (section 6) |
| `RuleX` `RuleY` | a line across the whole plot at each row's `x` (`y`) | `Link` with the plot's edges for ends: `y1`/`y2` (`x1`/`x2`) limit the extent; the other axis is not inherited; constants alone (`<RuleY y={90}/>`) are one line. Colour defaults to `theme.muted`, width 1; under a coord a path along it (under `geo` the plot's edges are the globe's: a meridian runs pole to pole) |
| `TickX` `TickY` | a short line across each point: vertical for `TickX`, horizontal for `TickY` | `length` px (a constant, field or function; default 10), centred on the point; an interval's ends are two rows |
| `Swarm` | a circle per row, moved along the band axis so that no two overlap (a beeswarm) | `r` px (or the size channel); needs a band or point scale on x (first) or y, else it throws. Dodge slots swarm about the slot's middle. A mark, not a position (decided): it needs pixel radii against pixel places, and only moves points; it does not use the pixel stage. It may spill into the next band when the dots do not fit |
| `Arc` | wedge per row | pie/donut/gauge; see 5.4; under `polar` it takes the coord's centre, radius, hole and sweep |

`Line gradient` (not under a coord): the colour channel does not split the line; it is one path
per group, and its `stroke` is a user-space `linearGradient` along x with one stop per vertex at
the colour scale's colour for that row (offsets from the pixel x of the first to the last
vertex). Colour must be a function of x, or the stops fold back on themselves; a gradient follows
an axis, so a colour that is not one needs segments. It needs a colour channel and at least two
distinct x positions; otherwise the line draws as without `gradient`. `Rect pattern` (`'hatch'`, or a
`pattern(...)` paint) fills the rectangle with a pattern in its fill colour (default the first
palette colour) instead of a flat one.

Point marks (`Dot Line Text Link Area`) put a band value at the band centre; only `Rect` uses
the extent. Default colour is `theme.palette[0]`. Which style prop each channel feeds, per mark
(an explicit style prop of that name wins; a `size` prop on a mark with no size target throws):

| Mark | `color` feeds | `size` feeds |
|---|---|---|
| `Dot` `Swarm` | `fill` | `r` |
| `Line` `Link` `Vector` `RuleX` `RuleY` `TickX` `TickY` | `stroke` | none |
| `Area` `Rect` `Bar` `Arc` `Polygon` `Text` `Geo` `GeoDot` | `fill` | none |
| `Treemap` `Tree` `Pack` `Partition` | the branch, else `fill` | none |
| `Image` `Group` | none | none |

`colorTo="fill"` or `"stroke"` on any mark moves the colour channel to that style prop instead of the mark's own (an explicit `fill`/`stroke` still wins; any other value throws `Polygon colorTo: "strok" is not a style prop; use "fill" or "stroke"`, the mark's name first). `colorTo` is read at collection, so the legend and the scales are untouched. Only `Polygon` also adjusts the other prop: with `colorTo="stroke"` its `fill` defaults to `none`; on another mark the unset prop falls back to its own default.

Defaults that are not written at the call site:

| What | Default |
|---|---|
| Band `padding` (inner; outer is half) | 0.2 when the other axis is continuous; 0 when both axes are bands; `point` 0 |
| `size` channel range | `[2, 8]` (a Dot's radius in px); a `Dot` with no size channel and no `r`: `r` 3 |
| `shape` channel range | `circle cross diamond square star triangle wye`, in that order, cycled |
| `opacity` channel range | `[0.2, 1]` |
| Colour palette | `theme.palette` in the order the keys are first seen (sorted for numbers and Dates); it repeats past its length |
| Sequential colour ramp | `theme.line` mixed 15% towards `palette[0]`, up to `palette[0]` |
| Tick count | a y axis: `max(2, round(height / 42))`, an x axis `max(2, round(width / 90))` (the plot area), unless `Axis ticks` is a number; the niced domain is rounded for that count (10 on x) |
| Stroke widths | `Line` 1.75, `Link` and `Vector` 1, `Rect` flat line 1; `Area` `fillOpacity` 0.85 |
| `Text` | `fill` `theme.muted`, size 11, centred; no `x` and `y`: the plot area's top-left corner, the plot centre under `polar` | A zero-width or zero-height `Rect` is drawn as a line, stroked
with its fill when it has no stroke (a doji). Per axis, when a row has both an interval and a point, the
interval wins (drawing and training alike). A zero-height `Rect` with stroke and no fill is a line across a
band (box median).

### 5.3 Positions

`position` is a prop on a mark: a function, or a factory below. Positions see rows only.

- `stack({ by = group ?? color, along = 'y', groupBy = 'x', offset = 'zero', order, anchor })`
  writes `y1 y2` (`x1 x2` when `along: 'x'`). Rows sharing `groupBy` pile in `order`; negatives
  pile separately downward from 0; null and NaN pile as 0. `order` is first-seen by default,
  an array of series (bottom to top; series it leaves out follow), or a d3 stack order name
  (`descending`, `ascending`, `insideOut`, `reverse`, `appearance`), so raw rows need no sort.
  `offset` is `zero`, `expand` (normalises each pile to 1) or any d3 stack offset name
  (`wiggle`, `silhouette`, `diverging`: a streamgraph is `{ offset: 'wiggle', order: 'insideOut' }`);
  those are computed by `d3.stack` over the piles in ascending order of `groupBy` when it is
  numeric. `anchor` names a series centred on zero (`offset: 'zero'` only): the series before it
  in the order pile away from it on the negative side, the ones after it on the positive side (a
  diverging Likert stack). For `Area`, missing `(x, by)` cells count as 0. A `stack()` can be reused across layers: each call works out its own `groupBy` (`x`, else `x1`).
- `dodge({ by = group ?? color, padding = 0.1, order })` writes `u1 u2` (a fraction of the band).
  A band shares itself among the series **present in it**, in one global order (first-seen, or
  the `order` array), so a band with one series gives it the whole band less padding. The band
  axis is the declared band `Scale` (x first), else the axis holding strings. `Rect` applies
  `u1 u2` on its band axis; `Dot` and `Link` put a band point at the slot's middle (`ctx.point(x, y, row)`); other marks ignore them. `u1 u2` are never trained.
- `jitter({ width = 0.8 })` spreads rows that have a `key` channel over `width` of their slot (the
  band, or the dodge slot before it), writing `u1 = u2`: the offset is `hash53(String(key))`, so
  the same key always gives the same place and removing a row moves no other. A row with no
  `key` is not moved and overlaps its twins (no key is derived from row order: twins would jump
  whenever an Accumulator window slides). Positions run before domains are inferred, so the axis
  must be **declared** `<Scale channel="x" type="band"/>`; otherwise `jitter` throws, naming
  `jitterPx`. Combine with `position={[dodge(), jitter()]}`.
- `jitterPx({ width = 12, along = 'x' })` is the continuous-axis form, tagged `stage: 'pixel'`
  (stage 7): rows with a `key` get `dx` (`dy` for `along: 'y'`), a pixel offset of up to ±`width`/2
  from `hash53(String(key))`; no `Math.random`, no dispatch on axis type, rows without a key stay
  put. `ctx.point` adds a row's `dx dy` after the coord, so `Dot` and `Link` honour it (a `Text`
  does not pass its row). The offset is in pixels at any plot width. Put it last in a `position`
  array: `[stack(), jitterPx()]`.

### 5.4 The mark seam

```js
export const defineMark = (name, { render, domain, room, color, size }) => props =>
  ({ $: 'mark', mark: name, render, domain, room, color, size, props });
```

`ctx` passed to `render(rows, ctx)` (decided; everything a third party needs):

```
{ x, y,                 // value -> pixel (band centre); ±Infinity -> the edge; NaN with no scale
  point(x, y, row),     // joint mapping -> [px, py] (null where a coord hides it); a row's slot
                        // `u1 u2` puts a band point at the slot's middle; the coord's own when set
  line(points, {curve}),// [x, y] pairs (null breaks) -> a path `d`, densified along the coord
  wedge(xs, ys, opts),  // only under polar: pixel intervals along x and y -> { d, transform } or { line }
  coord,                // the bound coord, or undefined
  projection,           // the d3-geo projection when the coord is `geo`
  color,                // value -> colour string; .domain() lists the keys
  size, shape,          // the size and shape channels' scales (undefined when unused)
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
band, ordinal and log scales ignore hints. A position scale with no row values at all (a plot of `Polygon`s alone) is built from the hints. A plot whose
layers use no position channel (a pie) builds no x/y scale and `compile` does not throw.

A mark or position that computes a field (a rank, a density) writes it into its rows and
declares it with `defineChannel('rank', { scale: 'color' })`: from then on `row.rank` trains that
scale like the built-in channel and `ctx.resolve` reads it for the colour. It is a number, so
the scale is `sequential` unless the plot declares `<Scale channel="color" type="ordinal"/>`.
The pass is the first one, before the scales exist, so a declared channel cannot change a
position scale's margins (a later pass is not built: section 4, the pixel stage).

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

A ridgeline is the same pattern: `defineMark` returning `{t:'path'}` shapes. A hexagon map is
not (`hexbin` plus `Polygon`, section 6; `d3-hexbin` is not in tauler's d3 bundle).
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
| `image` | `x y width height href` |
| `g` | `children` (shapes drawn inside it) |
| any | `fill stroke strokeWidth strokeDasharray strokeOpacity fillOpacity opacity textAnchor fontSize fontFamily fontWeight transform strokeLinecap strokeLinejoin filter markerStart markerEnd mask clip blend` |
| flags | `crisp` (crispEdges), `front` (unclipped, above marks) |

**Paints.** `fill` and `stroke` may hold a paint object instead of a colour string. It is plain
JSON inside the shape, so it is part of the key; `drawScene` writes each distinct paint once into
`<defs>` (id: the `clipId` plus a counter) and sets the attribute to `url(#id)`. Built by
`linearGradient({ stops, to = 'bottom' })` (`to`: bottom, top, left, right, across the shape's own
box; or `{ user: true, x1, y1, x2, y2 }` in figure pixels, which a stroke on a flat line needs,
since a flat line has no box height), `radialGradient({ stops, cx, cy, r })`, `pattern({ shapes,
size, angle })` (a `size` px tile of scene shapes) and `hatch({ color, gap, width, angle })`. A
stop is `{ offset, color, opacity? }`. A paint's name in the scene (`paint: 'linearGradient'`) is the
SVG element it becomes.

**Effects, groups and images.** Shapes `image` (`x y width height href`) and `g` (`children`, a
list of shapes, drawn inside it; `transform` and the style fields below apply to the group) join the
table. The style fields `filter markerStart markerEnd mask clip blend` are appended after the
others. `filter`, `markerStart`, `markerEnd`, `mask` and `clip` hold an effect object, plain JSON
(so part of the key; `def` names the SVG element), written once per distinct value into `<defs>`
under the same id counter as paints and set as `url(#id)` (`clip` is written as `clip-path`). Built
by `blur({ std })`, `dropShadow({ dx, dy, std, color, opacity })` (`filter`), `marker({ shapes, size,
viewBox, refX, refY })` and `arrowhead({ color, size })` (a marker, oriented along the line; colour
is `context-stroke` unless given), `mask({ shapes })` (light shows, dark fades; its shapes may hold
paints) and `clipRect({ x, y, width, height })` or `clipPath(d)` (`clip`). `blend` is a CSS blend
mode name, written as `style="mix-blend-mode:..."`. A filter's region is the shape's box grown by 20% on each side (`x`, `y` -20%, `width`, `height` 140%), so a blur or shadow is not clipped to the box. A filter, mask or clip on a shape with no box
(a flat line) has an empty region: wrap it in a `Group`. `Line`, `Link`, `Rect`, `Bar`, `Area`,
`Dot`, `Arc` and `Image` read the effect props through `ctx.resolve`; markers only on `Line` and
`Link` and `Vector`. Tests: `charts/test/scene-vocab.test.jsx`.

**Host capability list.** What tauler's Draw runtime can render, from the
code and docs, not from running the binary: a Picture is the SVG markup `draw` produced
(ADR 0044; `src/render/picture.rs` in the tauler repo), rasterized as an `<img>` by takumi
(pinned `takumi-core` 0.32.0), which carries a vendored resvg 0.48.1 with the SVG parser
(`takumi-core/src/resvg/usvg`) and renderer. Renders: shapes `rect circle line path` (and ellipse,
polyline, polygon); `linearGradient` and `radialGradient` with stop colour and opacity;
`pattern` (with `patternTransform`); `clipPath` and `mask`; `filter` (`feGaussianBlur`,
`feDropShadow`, the rest of the filter primitives); `marker`; `use` and `symbol`; `image`;
stroke dashes, caps and joins; `transform`; `opacity` and `mix-blend-mode`; text from outlines
(glyph colour layers and bitmap glyphs are stripped; no `getBBox`, so text is still estimated,
5.6). None of the gradient and pattern features is a host constraint, so none is recorded as
a failure. In the scene today: linear and radial gradients, patterns, caps and joins (each one
test in `charts/test/paint.test.jsx`, drawn through `drawFigure`, which uses linkedom as the Draw
runtime does). Also in the scene now (above): filters (blur, shadow), line markers, `image`, groups with
transforms, clipped regions, masks and blend modes. A browser page draws the same markup natively. Read from source, not seen in
pixels: no test rasterizes (the repo never runs the tauler binary); the tests check the markup.

Style passthrough: the built-in marks read their style props through `ctx.resolve`, so each
accepts a function of the datum or a constant. `Rect`, `Bar`, `Dot`, `Link` and `Arc` take `stroke
strokeWidth strokeDasharray strokeOpacity opacity` (`Line` the same, with `stroke` fed by the
colour channel); `Text` takes `fontWeight`; `Rect` takes `cornerRadius`, a number (the shape's
`rx`) or `[topLeft, topRight, bottomRight, bottomLeft]` (the shape becomes a `path` with an arc at
each rounded corner); `Rect` also takes `pattern` (above); `Line` and `Link` take `strokeLinecap`, `strokeLinejoin`, `markerStart` and `markerEnd`; every data mark takes `filter`, `mask`, `clip` and `blend` (5.5); `Arc` takes `padAngle` and `cornerRadius` (d3's `arc`). The scene key hashes
shape keys in order, so a new style field is appended after the existing ones.

### 5.6 Scales

`<Scale channel type domain range padding rangePad nice exponent>`; channels `x y color size shape opacity`
(and any declared with `defineChannel`, 5.4). Types: `linear log time sqrt pow band point ordinal
sequential threshold quantize quantile`, and any added with `defineScale`; any other `type`, and any other `channel` on
`Scale`, `Axis` or `Grid`, throws naming it, as does a child that is not a mark, `Layer`, `Scale`,
`Axis` or `Grid` (a mistyped mark name). Unknown mark style props are not rejected: custom marks
read their own. Scales are shared by every layer through the
channel name, whatever field each layer reads.

`rangePad` (a position scale, pixels, default 0) insets the range at both ends, so a mark or label at an extreme
keeps that much room; the area, margins and ticks are unchanged and ticks stay on round values. It is not `inset`
(pixels off a band edge on `Rect`) or `padding` (the band gap). Domain helpers (`stats.jsx`, `domains.jsx`) are plain
functions over all the data that return a domain for `Scale domain`, so every panel passes the same one:
`orderBy(data, { field, by, stat = 'sum', descending = false })` orders a band axis by a d3 reducer name
(`sum mean median max min count`) or a function of the `by` values, ties in first-seen order;
`dateRange(data, { field, interval = 'day' })` lists every `second minute hour day week month year` slot
(UTC, so it is the same in every runtime) from the first to the last date, so quiet days stay as empty slots on
`<Scale channel="x" type="band" domain={..}/>`.

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
- `nice` applies to linear, log, sqrt, pow and time unless `domain` is set. `<Scale nice={false}/>` keeps the data extent exactly (the opt-out; the default is niced); `nice={true}` is the default; `nice={n}` rounds the domain for `n` ticks instead of the axis's count (x: 10). The axis claim builds the scale from the same options, so the margins match the scale drawn
- time scales are UTC (`d3.scaleUtc`, `utcFormat`, the UTC tick format), so the scene key is the same in any time zone; a declared time scale reads `domain` strings and numbers as dates, like the rows
- a continuous type (`linear`, `log`, `sqrt`, `pow`) on `color` with no `range` takes the default two-stop ramp
- log: any domain value <= 0 throws, naming the channel
- `range`: ordinal -> array of colours; sequential -> any number of stops, placed at the
  `domain`'s values when it has one per stop, else spread evenly (three around a pivot make it
  diverging), clamped; position scales rarely need one
- default `sequential` ramp: `interpolateRgb(mix(theme.line, theme.palette[0], 0.15), palette[0])`,
  so the low end stays visible against the background; y band runs top-down

Scale types are a registry; the built-ins register through the same call an author uses:

```js
defineScale('sqrt', { nice: true, build: (domain, range, opts) => d3.scaleSqrt(domain, range) })
// defineScale(name, { train?, build, check?, nice?, band?, padding? })
//   train(values, opts, hints) -> domain   default: the extent of values and hints
//   build(domain, range, opts) -> scale    a function with .domain() (and .ticks(n), .nice() if continuous);
//                                          opts: the Scale props + { theme, padding, channel }
//   check(domain, values, opts)            throws on a domain the type cannot take (log: values > 0)
//   nice: niced when it is a position scale with no `domain`; band: a y scale runs top-down;
//   padding: the default band padding (point: 0)
```

The contract is checked where it is used, and an error names the missing member: `defineScale <name>: needs a
build(domain, range, opts) function` (at definition), `defineScale: build must return a function`, `defineScale: domain is required`
(the built scale has no `.domain()`), and `defineScale: ticks is required` (an `Axis` or `Grid` reads a scale
that has neither `.ticks(n)` nor `.bandwidth()`). A scale no guide reads needs no `ticks`. `range` is not read
back, so it is optional.

- `sqrt` and `pow` (`exponent`, default 1) are `linear` bent. For area-proportional dot sizes
  give `domain={[0, max]}` and `range={[0, R]}`: then `r**2 / value` is constant.
- `point` puts categories at points (no bandwidth, no end padding unless `padding`, in steps), so
  a line chart takes category labels with no numeric index. Axes and ticks treat it as a band
  that has zero width.
- `threshold` cuts at the `domain` (required), `quantize` splits the domain extent into equal
  steps, `quantile` trains on all the values and makes equal-count classes; the `range` has one
  colour per class (default: the palette). The edges are the d3 scale's own: `.domain()`,
  `.thresholds()`, `.quantiles()`. A Legend draws a classed scale as one swatch per class (5.10).
- `size` (default range `[2, 8]`, so a Dot's radius), `opacity` (default `[0.2, 1]`) infer
  `linear` from numbers, `ordinal` from strings; `shape` is `ordinal` over d3's symbols (`circle
  cross diamond square star triangle wye`, the default range, cycled). Neither is niced.
- Legend helpers match `colorScale(domain, theme, range)`: `sizeScale(domain, range, type)`,
  `opacityScale(domain, range, type)` and `shapeScale(domain, range)` return the scale Plot would
  build, with `.domain()`; `shapeScale` maps a value to a symbol name.
- `Dot shape` draws a circle for `circle`, else a d3 symbol path of the same area as the circle
  of radius `r`, centred by a `translate` transform.

Named scales: `<Scale channel="y" name="rain"/>` declares, `scale` references it
(mark `scale={{ y: 'rain' }}`, an object per channel; `Layer scale`, which its marks inherit and may
override per key, the one exception to "Scale is not inherited"; `Axis`/`Grid scale`, a string),
`Axis side` places it. `Plot` takes no `scale`. Scales are keyed `[channel][name ?? 'default']`,
trained per (channel, name) from the layers bound to it and resolved per layer in `ctx`. A `Scale`
without a name is the default and repeated declarations merge. Errors read
`<Piece> <channel>: <problem>`: `Axis y: unknown scale "rain"; declared: (default), right` (a mark
is named by its mark name, `dot y: ...`), `Scale y: name "rain" declared twice`, `Axis y: side
"top" must be left or right` (x: bottom or top). Names are checked after collection, so a `Scale`
may follow the marks that bind it. Padding of a band scale looks at the other axis of the first
layer bound to it. Two stacked Plots are *not* an
equivalent: they are two Pictures; with the same `margin` and explicit `domain`s they align
but cannot overlay.

### 5.7 Axes and grid

Default y domain (decided, g14): an inferred continuous `y` domain is niced with the tick count the
y axis and grid use for the final plot height (about one tick per 42 px, at least 2; an `Axis ticks`
number replaces the count), not d3's 10, so the last tick and grid line sit at the top of the plot
and the lines divide the domain evenly. This makes small plots' y domains wider than before. The y
axis claims its margin over an estimated length, then draws the ticks of the scale as built (the
claim's labels are kept when the values agree).
`x` keeps d3's `nice()` and a `Scale domain` is never niced; `Scale nice` (5.6) changes either.

Room for the plot (loud on a programmer's mistake, quiet on data): a numeric `margin` is the same number on all four edges, and any other non-object value throws (5.1). `margin` and the figure size alone must leave a plot area, with the 8 px minimum on every edge not given, or `compile` throws `Plot height: 100 leaves no room for margins; raise height or lower margin` (and `width`). The margins the guides claim from labels (data) never throw: on the edges that came from claims they are scaled down together so the plot area keeps at least 25% of each dimension. A `margin` prop is never clamped; tiny strips with all-zero margins are untouched.

`Axis { channel, ticks, format, side, scale, line, tickSize, label, labelAngle, at, guide }`, `Grid { channel, ticks, tone, scale }` (under `polar`: also `shape`, `spokes`; 5.13).
By default x is at the bottom and y at the left; `side` is `bottom` or `top` on x, `left` or `right`
on y. `line={false}` drops the long axis line, `tickSize={0}` the tick marks (default 4; the labels
stay), so nothing is painted in the background colour. `label` is a title: centred along the
axis, beyond the tick labels, rotated on a y axis, and its room (15 px) is added to what the axis
claims. Axes (and the Legend) are guides, `{ claim, shapes }` entries in the `GUIDES` table
(guides.jsx): in the claim stage each returns the room it needs per side, combined as a running
max seeded at 8, axes first and then the other guides, each in the order written; the `margin`
prop is applied last. A mark can claim room too: `defineMark(..., { room(rows, props, env) -> { right: 52 } })` (any of
`top right bottom left`, in pixels; `env` has `theme` and `measure`), so an end-of-line label sizes
its own margin from `measure`, with no `margin` prop. Mark claims are made first and count as
placed on their side, so a guide on that side starts beyond them. Claims are a max, not a sum, except that guides on one side stack: an axis
starts beyond the extent of those before it on its side. A guide is measured after the axes, so
its width budget is the plot width less the margins they produced. `ticks` is a count (default 1 per 90px on x, 42px on y, fixed 11px text) or an array of
values; a y axis's labels take at most a third of the width, longer ones are cut with `…`;
on a band axis a count picks every k-th label, and with no `ticks` the axis keeps every k-th
label with k the smallest that stops labels overlapping (by `measure` on x, the font size on y). `labelAngle` (degrees, bottom x axis only; anything else throws) turns the tick labels about their ticks (negative: the end at the tick, positive: the start); the axis's room is computed from the turned boxes (below, and past each side of the plot), and the band thinning uses the spacing at which turned boxes clear each other, `min(h / sin a, w / cos a) + 2`, so `labelAngle={-45}` keeps labels that the flat axis drops. `format` is a d3 format string or a
function; on a band, Dates use d3's time-axis format at each value's precision (`02 PM`,
`Sat 24`), anything else `String`. A `Grid` uses the ticks of its channel's `Axis` unless
given `ticks`, so lines and labels agree. Marks clip to the plot area expanded by a constant 4px, so
edge dots stay whole; `front` shapes are unclipped.

**Placing and replacing axes.** `side` puts an x axis on `top` and a y axis on the `right`; axes on one side
stack. `at={value}` puts an axis inside the plot, on a value of the other channel's default scale (`<Axis channel="x" at={0}/>`
draws the x axis through y = 0): it claims no room on any side, so a `label` (title) with `at` throws, and a value off the
domain draws nothing. An axis is a guide, and guides are replaceable. `<Axis guide={g}/>` draws that axis with the
guide `g = { check?, claim, shapes }` instead of the built-in one: `claim(props, st)` and `shapes(props, data, scales, area, env)` are
exactly the contract of the `GUIDES` entries above (the room it asks for per side, `extent` to stack, `data` handed to
`shapes`), and the built-in `check` does not run. It is still an axis: it is claimed first, and a `Grid` reads its ticks
from `data.ticks` (an array of `{ value, label }`) when the guide gives them. A guide with no ticks leaves the Grid to its own.
`defineGuide(name, guide)` registers a new kind of guide in `GUIDES` and returns its piece, used as `<Name {...props}/>`
(a name already in the table, or a guide without `claim` and `shapes` functions, throws). Under `polar` the same
`Axis` draws the angle and radius axes (5.13).

### 5.8 Small multiples

No facet component (ADR 0013). Plain JS. Panels align when x, y and colour have explicit, niced
domains shared by every panel (the left and right margins come from the first and last x tick
labels, so an inferred x extent per panel misaligns them), or when a fixed `margin` is given:

```jsx
const byCore = d3.groups(samples, r => r.core);
const yMax = d3.max(samples, r => r.load);
{byCore.map(([k, rows]) => (
  <Plot width={60} height={40} margin={{ left: 4, right: 4 }}
        data={rows} x="t" y="load" theme={theme}>
    <Scale channel="y" domain={[0, yMax]}/><Line/>
  </Plot>))}
```

Pass the colour domain too: colour trains first-seen per `Plot`, so one category otherwise gets
a different colour in each panel. g32 asserts that `area` is equal across panels.

### 5.9 Theme

`chartTheme(themeColor, font)` unchanged: `{ ink muted line lineSoft lineStrong palette font }`,
resolved colour strings parseable by `d3.rgb`. A missing required token throws rather than
drawing black.

### 5.10 Legends

`<Legend channel="color" side="top"/>` is a guide, collected like an axis. It reads the
trained colour domain, claims room through the margin stage, and draws stepped swatches in one
row into `back` (the only unclipped group), so swatches cannot drift from the marks: a swatch and
a label per key on an ordinal scale, five swatches taken from the scale across a sequential
domain with its two ends labelled; on a classed scale (`threshold`, `quantize`, `quantile`) one swatch per class, in the class's colour, labelled by its interval: `<25`, `25-50`, `50-75`, `>=75` (numbers with up to 6 significant digits, Dates as `YYYY-MM-DD`, a scale with no cut `all`). The edges are the scale's own, so the claim builds the scale as the axis claim does (the trained domain of a quantize or quantile scale is not its edges). The row is anchored to the figure's top or bottom edge, one
row (19 px) beyond the axes on that side, and a second legend on the same side sits one row beyond the first; labels that do not fit are cut with `…` (the y-axis
rule, not `Text fit`). `side` is `top` or `bottom` (default `top`); anything else throws
(`Legend color: side "left" must be top or bottom`), as does a channel other than `color`. A palette that repeats
past its length stays the default (a throw would blank a status bar when a feed gains a series);
the legend makes the repeat visible. `colorScale(domain, theme)` stays exported and total.

### 5.12 Trees and maps

Both are marks on `defineMark`; core adds only the projection.

- **Trees** (`hierarchy.jsx`): `Treemap` (`tile`: squarify, binary, slice, dice, slice-dice),
  `Tree` (`layout`: tree or cluster; root on the left, room kept for labels), `Pack`,
  `Partition` (an icicle). The hierarchy comes from flat rows (ADR 0013): `path` ("a/b/c",
  missing parents filled in) or `id` + `parent` (both together with `path` throw `Treemap path: id and parent also given; give one`, with the piece's own name); `value` sizes leaves; `label` is a value prop
  (a node with no row shows its last path segment). Leaves are coloured by their branch below
  the trunk unless they have `fill` or a `color` channel. Treemap shapes come in row order.
  Labels are drawn only where they fit.
- **Coord** (`coord.jsx`): `<Plot coord={geo('mercator')}>`. A coord is `{ channels?, bind(area) }`;
  bound to the plot area it gives marks `ctx.point(x, y)` and `ctx.line(points)` (a projected,
  densified path: a long `Line` or `Link` follows the great circle, split at the antimeridian).
  `geo` ignores the trained scales and reads `lon` and `lat` as the defaults for `x` and `y`, so
  no x/y scale is trained, and a point the projection clips (the far side of a globe) is not
  drawn. `Dot`, `Line`, `Link` and `Text` use `ctx.point`/`ctx.line`; under a coord `Line` keeps
  row order and a `Link` is a path. `Axis` and `Grid` are not drawn unless written; a graticule is
  data. `projection="mercator"` is sugar for `coord={geo('mercator')}`. Cost: a 20-point route
  is under the `costOf` budget (a test), a 100-point one about a third of the reference plot, so
  long routes take a `key`. The polar coord (5.13) plugs into the same contract.
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

The figure key is found in this order (`Plot.jsx`, `speckey.jsx`):

- **`key` given.** The caller owns identity: `Plot` does no work in the render runtime and
  forwards `key` to `<D3Figure key>`; `draw` compiles inside the Draw runtime. The key must
  change whenever the picture should (include a data version or the last timestamp).
- **No `key`, props that can be keyed (default).** The key is a canonical string of the props
  (`specKey`), passed as `key={[spec]}`: tauler stringifies and hashes it natively. Nothing is
  compiled in the render runtime; `draw` compiles in the Draw runtime for a new key only. The
  library's own marks, `stack`/`dodge`/`jitter`/`jitterPx` and `polar()` are keyed by name and
  options, by identity (a user's `defineMark('line', ...)` is not ours); Dates and ±Infinity
  are tagged. A mark's `render` may read only rows, ctx and props: that is all the key covers.
- **No `key`, props that cannot be keyed** (a closure, a custom mark, a projection such as
  `geo(...)`). `compile` runs in the render runtime every Tick and the figure key is
  `hash53(JSON(scene))` (cyrb53), the scene rounded to 2 decimals (pictures differing by less
  are intentionally one Picture). Measured in tauler's QuickJS: about 4 ms per Tick at 50 rows,
  20 ms at 500, so above about 100 rows pass a `key` (section 10).

Determinism either way: the scene is a pure function of props; statistics are deterministic.
Tauler's Draw runtime evaluates the layout with the inputs of the Tick that asked for the figure
(tauler #713), so a key built from props is found again there.

The risk is a different float engine (QuickJS), not a second module graph: trig (polar,
hexagons, geo), `Math.exp` (kde) and d3 curves may differ in the last bit, and `tidy` rounds to
2 decimals, so a value on an x.xx5 boundary can flip the key. `charts/test/golden-keys.json`
holds the keys of a rounding-boundary scene, a trig scene (`Arc`) and a kde scene; Node asserts
them (g47; `UPDATE_GOLDEN=1` rewrites the file). **Tauler's side is not built:** a test there
that compiles the same scenes in its own runtime against this file is an explicit follow-up
(never run the bare `tauler` binary for it). Vitest runs with `isolate: false`, so all files
share one module instance: the charts package keeps no module-level mutable state.

### 5.13 Polar coordinates (design note and result)

Decision: one shared object, declared once, `<Plot coord={polar({ inner, startAngle, endAngle })}>`,
the second of the two candidates; marks gain no frame props. It is a coord in the contract of 5.12
(`bind(area)` gives `ctx.point` and `ctx.line`), in `polar.jsx`.

- **Convention.** Angles are radians, clockwise from straight up (d3's: `d3.pointRadial`, `d3.arc`).
  Defaults: `startAngle` 0, `endAngle` 2 pi (a gauge: `-pi/2` to `pi/2`); `inner` is a fraction of
  the outer radius (a donut: 0.5). The centre is the area's centre, the outer radius half its
  shorter side; a partial sweep is not re-centred.
- **Mapping.** `x` is the angle and `y` the radius. The `x`/`y` scales are trained as usual (a coord
  flag `positions: true`; `geo` has none) and the coord reads each as a fraction of the area: `x`
  left to right is start to end; `y` bottom to top on a continuous scale and top to bottom on a
  band or point scale (the first category is innermost); a band value sits at its band centre,
  `+-Infinity` at the extremes. Swap the channels at the call site to put depth on the radius
  (`<Rect x1="y0" x2="y1" y1="x0" y2="x1"/>` draws `partition` rows as a sunburst). For a full
  circle over a point scale give it `padding={0.5}` so the last point does not meet the first.
- **Marks.** `Dot`, `Line`, `Link`, `Text` and `Area` use `ctx.point`/`ctx.line`. `Rect` and `Bar`
  become a wedge path (`ctx.wedge`, `d3.arc`; `cornerRadius` as a number), so a pie is a stacked
  horizontal `Bar` on a one-band `y` with `padding={0}`, a rose is a `Bar` on a band `x`, radial bars
  a `Bar` on `x` value and band `y`; a zero-angle `Rect` wedge is a `line`, while a zero-extent `Bar` (value 0) draws nothing, as it does without a coord. `Line` over a point or band
  angle draws chords (a radar, `closed`); over a continuous angle it is densified in (angle, radius)
  steps of at most 4 degrees (a circle or spiral) and sorted by `x`. A `Link` along one angle is a
  `line` (a needle), otherwise a path. `Text` with no `textAnchor` gets the anchor from the angle
  (`start` on the right half, `end` on the left, `middle` near the vertical), a 6 px offset outward
  and a matching `dy`; with no `x` and no `y` it sits at the centre. `Arc` reads the coord's centre,
  radius, `inner` and sweep when there is one (its own `inner`, `startAngle` and `endAngle` still win).
- **Grid.** `<Grid shape="circle"|"polygon" spokes/>` draws rings at the `y` ticks (circle arcs over
  the sweep, or polygons through the angle ticks) and spokes at the `x` ticks or band centres
  (`spokes={false}` drops them; `channel="x"` draws only the spokes). A coord may own the grid
  (`bound.grid`).
- **Axes.** `Axis` under polar (`polaraxis.jsx`, called from the `axis` guide). `channel="x"` is the angle axis: a rim
  arc (`line={false}` drops it), a tick of `tickSize` px outward at each tick or band centre, and the labels outside
  them, placed and anchored by the coord's `label` (the 6 px offset), so a label on the right half is `start`
  anchored. It claims room through the claims seam on every side where a label reaches (the label's width on a side
  for a label on that side, one line above or below for one at the top or bottom), and `ticks`, `format`, `tickSize`
  and `scale` work as on a rectangular axis; the duplicate last tick of a full circle is dropped. `channel="y"` is the
  radius axis: a spoke from the hole to the rim at `angle` (radians, default `startAngle`), ticks across it and labels
  beside it; `side` is `left` (default) or `right` of a walk outward along the spoke. It claims no room (it is inside
  the circle). `label`, `labelAngle`, `at` and an angle axis's `side` throw. A polar `Grid` with no `ticks` of its own
  follows the Axis ticks of the channel, like the rectangular one. The room is claimed before the radius is known, so tick counts are
  chosen for a radius of `min(width, height) / 2 - 8`.
- **Not done.** There is no circular clip (marks
  stay in the area's clip rectangle); `Area` ribbons and `Dot` `rx`/`ry` are rectangular.
- **Cost.** Measured with `costOf` at 500 rows: a polar `Line`, `Dot` or `Grid` chart costs about 1.2 to 1.3 times
  the same chart in rectangular coordinates (about 0.1 of the reference plot more); a test gates 1.75 times.
  A `Line` over a continuous angle adds points only where a segment spans more than 4 degrees.

## 6. Statistics

Plain `data -> data` functions, no grammar involvement, called in the layout (so they run on
the loop each Tick; keep them cheap; Accumulator windows are small). Shipped as `stats.jsx` (exported from the package index): `bin`, `bin2d`, `group`, `groupBy`, `rolling`, `cumsum`, `normalize`, `last`, `fold`, `rank`, `kde`, `ecdf`, `boxStats`, `regress`, `difference`, `waterfall`, `hexbin`, `delaunay`, `contours`, `densityContours`, `treemap`, `partition`, `pack`, `tree`, `flow`, and the domain helpers `orderBy`, `dateRange` (5.6).
Layout statistics return rows for generic marks (principle 8), in the unit square or in `size: [w, h]`, y already inverted (y up), so `<Scale channel="x" domain={[0, 1]}/>` fits them:
`treemap`, `partition`, `pack` and `tree` (`layouts.jsx`) take `path` ("a/b/c") or `id` and `parent`, and `value`; node rows are `id parentId depth value name branch leaf datum` plus geometry (`x0 y0 x1 y1`; `pack`: `x y r`, draw with `Dot rx`; `tree` returns `{ nodes, links }`, nodes the node row plus `x y` (depth along x, root at x = 0), links one per parent-child pair `{ sourceId, targetId, branch, x1, y1, x2, y2 }` with (x1, y1) at the parent; `layout: 'cluster'` for leaves aligned). Row fields: `id` is the `id` field, or for `path` the path with a leading "/" ("init/sshd" is "/init/sshd"); `parentId` is null for the root (so is `parent` in the input rows: `{ id: "init", parent: null }`); `value` is the sum of `value` over the leaves below, or the leaf count; `datum` is the input row (null for an ancestor that `path` made up). Each node row starts as a copy of the input row's fields (a row with `label` gives nodes with `d.label`), then the layout fields are written over them, so on a clash the layout wins silently; the reserved names are `id parentId depth value name branch leaf datum x0 y0 x1 y1 x y r` (`datum` is still the untouched row, so a row's own `depth` is `d.datum.depth`). `name` is the node's label: the `name` option (a field of the row, or a function of the row) if given, else the row's own `name` field, else the last segment of the id (which is also what a node with no row of its own, a missing ancestor of a path, has). `path` together with `id` or `parent` throws `<piece>: id and parent also given; give one` (`tree path: ...` for the `tree` statistic; `Treemap`, `Tree`, `Pack`, `Partition` and the statistics each use their own name). d3 builds the ids of a `path` hierarchy, so they are not "as written": a chain of single children above the first branch is trimmed (the paths `a/b/c` and `a/b/d` give the root `/a/b`, with `datum` null, not `/a`), and when the top-level paths are several (`a/b` and `c/d`) d3 invents a root with the id `/` (name `""`, datum null) above them. With `id` and `parent` the ids are used as written. Layouts do not get d3: a statistic returns rows, not d3 nodes, so `datum` is the only d3-free handle on the input. The `path` shortcut `"init/sshd/bash"` is the explicit rows `{ id: "/init/sshd/bash", parent: "/init/sshd" }`: the parent is everything before the last "/", missing ancestors are created. `branch` is the id of the ancestor just below the trunk (null above it), the colour key. `padding` is in the same units (treemap and partition default 0, pack 2). The statistics run on the loop every update (measured: about 0.1 of the `costOf` reference plot at 120 nodes, 0.1 to 0.2 for `flow` at 40 links; the tests gate 60 nodes and 24 links under the budget); add a `key` for large inputs.
`flow(links, { source, target, value, width, height, nodeWidth, nodePadding, align, iterations })` (`flow.jsx`, d3-sankey is excluded) returns `{ nodes, links }` in [0, width] x [0, height]. Nodes `id depth value x0 x1 y0 y1`; height is `value` (the larger of in and out) times one scale shared by all columns. Links `sourceId targetId value thickness back x1 y1 x2 y2 datum`, after the input row's own fields (the link row is spread first, so the layout fields win a clash; nodes get no row fields, as a node aggregates several rows), the ends on the node edges, stacked in a node by the other end's position. Columns come from the longest path; `align` is `justify` (default: nodes with no successors in the last column), `left` or `right`; `iterations` (default 6) alternate sweeps pull each node to the value-weighted mean of its neighbours, then push the column apart. Cycles: a link that closes a cycle (depth-first in input order) and a self-link are `back: true`; they are ignored for columns and sweeps, count in node values, and are drawn straight from the source's right edge to the target's left edge. Not handled: crossing minimisation beyond the sweeps, loops drawn around the nodes, node sizes other than throughput; negative values throw.
Derived charts (`composites.jsx`), each a statistic plus ordinary marks. `regress(data, { x, y, points = 24, z = 1.96 })` is the least-squares line from the smallest to the largest x as `[{ x, y, y1, y2 }]`, `y1`..`y2` the band of the fitted mean, `z` standard errors wide (the normal approximation, narrow below about 30 rows; fewer than three rows or no spread in x give `[]`): `<Area y1="y1" y2="y2"/><Line y="y"/>`. `difference(data, { x, y, by, a, b })` is the gap between series `a` and `b` at the x both have: `[{ x, y1, y2, sign, run }]`, `y1` is `a`'s value, `sign` the sign of `y1 - y2`, and `run` counts stretches of one sign; where the series cross, linear interpolation adds a row with `y1 = y2` to both stretches, so two fills meet (one `<Area y1="y1" y2="y2" group="run">` per sign over that sign's rows). `waterfall(data, { value, total })` is `cumsum` without `by`: each row gains `delta`, `from`, `to`; `total` (true, or fields to merge such as a label) appends a row from 0 to the grand total with `total: true`: `<Rect y1="from" y2="to">`. The box plot is `boxStats` plus marks (section 7).
Polygon rows (`hexbin.jsx`, `spatial.jsx`; drawn by `Polygon`, 5.2; no `d3-hexbin`, the hexagon maths is written here). `hexbin(data, { x, y, binWidth, width, height })` returns the non-empty cells `[{ cx, cy, count, points }]`, `points` the six corners in data space, and the counts sum to the rows with a finite x and y. `binWidth` is the hexagon's width in x data units (default a twentieth of the x extent). With no `width`/`height` the hexagons are regular in data space; with the plot's pixel size (the x and y extents fill them; margins are not accounted for, so the cells are regular only approximately) they are regular on screen. Cells are anchored at the data minimum. **On a small plot pass the scales the data extent**: an inferred domain comes from the polygon corners, which reach past the data, and is niced outwards, and the default margins shrink the area, so the cells are squashed. Measured as the height over the width of a cell at 248 x 110 (regular is 1.155): default scales and margins 0.49, `margin` zero 0.71, `margin` zero with `nice={false}` on both Scales 1.07 (the corners still reach past the extent), explicit domains of the data extent with `margin` zero 1.155 (the hexbin example, `charts/examples/09-density/01-hexbin.jsx`). There is no automatic rule (a Polygon-only plot skipping `nice` would be a hidden mode switch), and `hexbin` cannot run after the scales: it is a statistic over the rows, called before the plot exists. `count` is a normal field: `<Polygon points="points" color="count"/>` and a `<Dot color="count">` over the same rows share one sequential scale. `delaunay(data, { x, y })` returns the triangles `[{ points, ids }]` (`ids` index the rows). `contours(values, { width, height, thresholds, x, y })` returns `[{ level, points, holes }]`, one row per polygon, from a flat grid, d3's marching squares with the half-cell offset removed; `x` and `y` are the data ranges of the first and last cell centre (default the grid's indices; y runs down the rows, so pass it reversed for y up). `densityContours(data, { x, y, bandwidth, thresholds })` is d3's kernel density on a grid of at most about 120 cells across (3 cells per bandwidth, the bandwidth by Scott's rule when not given), returned in data units, same row shape; `level` is d3's density in arbitrary units (order and colour, not a reading). Cost, measured with `costOf` at 300 and 3000 rows, 6 levels: about 0.15 to 0.25 of the reference plot, 0.27 at 10 levels, so it can exceed a stage's budget; it depends on the grid, not on the rows, and a plot of it should carry a `key` (5.11) unless it changes every Tick. Violin is not a mark (and dodge's `u1/u2` are not read by `Area`: a violin's half-width differs row by row, and a band scale would cost `Area` a branch): `charts/recipes/violin.jsx` is `kde` per group laid out at 1, 2, 3.. on a numeric x, drawn by a horizontal `Area`, and `charts/recipes/tooltip.jsx` is a tooltip as a mark drawn from the hovered datum; both are in the normal suite (`charts/test/spatial.test.jsx`).
`rolling`, `cumsum`, `normalize` and `last` take `by` (a field or function) and compute within each series: input must already be ordered within each series, nothing here sorts. `rolling` takes `reduce` as a function (output in `as`) or an object of named reducers, and `partial: false` drops rows whose window is not yet full. `normalize` divides by the series' first value. `fold` turns wide rows into long rows; `groupBy` returns one row per group with named outputs; `rank` numbers rows by a value without reordering them (ties, equal Dates included, share the lower rank; a null or NaN value has rank null). `cumsum` (and `waterfall`, which is built on it) skips a null or NaN value: its row keeps the running total, `from` = `to`. `kde` returns `[]` for no finite value or a `bandwidth` not above 0, and with `points: 1` the one density at the middle of the range; `boxStats` has no row for a group with no finite value.
Users write their own the same way; `Array` methods and `d3.*` work directly.

Same names, different behaviour: `bin`, `group` and `normalize` here are plain `data -> data` functions that
return rows, not Observable Plot's transforms that wrap a mark's options. Read the signature, not the name.

## 7. Coverage

Verdicts: **core** = tier 1 JSX; **recipe** = needs a stats call; **mark** = needs `defineMark`.

| Chart | JSX | Verdict |
|---|---|---|
| line / sparkline | `<Line/>` | core |
| area range + mean | `<Area y1="lo" y2="hi" fillOpacity={.2}/><Line y="mean"/>` | core |
| stacked area / bar | `<Area position={stack()} color="s"/>`, `<Bar position={stack()} .../>` | core |
| grouped bar | `<Bar position={dodge()} x="cat" y="v" color="g"/>` | core |
| horizontal bar | `<Bar x="v" y="name"/>` | core |
| scatter / bubble | `<Dot x="a" y="b" size="m" color="k"/>` with `<Scale channel="size" type="sqrt" domain={[0, max]} range={[0, 10]}/>` | core |
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
| hexbin | `data={hexbin(..)}` `<Polygon points="points" color="count"/>` | recipe |
| violin | `violin(..)` (`charts/recipes/violin.jsx`: `kde` per group) then a horizontal `<Area y="y" x1="x1" x2="x2" group="key"/>` | recipe |
| ridgeline | `defineMark` returning path shapes | mark |
| beeswarm | `<Swarm r={3}/>` over a band axis | core (`Swarm`) |
| contours / density contours / Delaunay mesh | `contours(..)`, `densityContours(..)`, `delaunay(..)` then `<Polygon points="points" fill="none" stroke=".."/>` | recipe |
| fitted line with a band; difference; waterfall | `regress(..)` then `<Area y1 y2/><Line/>`; `difference(..)` then `<Area group="run">` per sign; `waterfall(..)` then `<Rect y1="from" y2="to">` | recipe |
| reference lines; interval ticks | `<RuleY y={90}/>`, `<RuleX data x="at"/>`; `<TickX x y/>` | core |
| tooltip | `charts/recipes/tooltip.jsx`: a `defineMark` drawn from the hovered datum the host passes as `data` | recipe |
| dual axis (overlay) | named scales (`<Scale channel="y" name="rain"/>`, `scale` on a mark and its `Axis`), section 5.6 | core |
| radar / rose / radial bars / sunburst | `coord={polar()}` with `Line closed`, `Bar`, `Rect` (5.13) | core |
| Sankey | `flow(links, ..)` then `<Rect x1="x0" x2="x1" y1="y0" y2="y1"/>` and `<Area curve="link-horizontal" x1 x2 y1 y2 thickness1="thickness" thickness2="thickness"/>` | recipe |
| parallel coords | `fold` then `normalize({ by })` then `<Line group="id" x="variable" y="norm"/>` over a band x | recipe |
| treemap / icicle / node-link / pack | `treemap(..)` etc. then `<Rect>` / `<Link curve>` + `<Dot>` / `<Dot rx="r">` | recipe |

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
| 13 | dodge2: fewer series in a band get wider bars | pass (`dodge` fits the series present in each band) |
| 15 | jitter | pass on band axes (`jitter()`) and on continuous ones (`jitterPx()`, a pixel-stage position) |
| — | stat before position: stacked per-group histograms = the overall one | pass |
| 16, 17, 19 | log scales; continuous colour and size; dates every 10 years | pass (`ticks` takes values or a d3 interval) |
| — | scale limits zoom, they do not filter | pass (`Scale domain`; filtering is `.filter()`) |
| — | scale vs coord transform | differs by design: statistics run before scales, so `log` acts like `coord_trans` |
| 18 | merged legends | pass (the `Legend` guide, 5.10) |
| 20 | pie | pass (`Arc`) |
| 21 | coxcomb, polar munching | pass (`coord={polar()}`, 5.13) |
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
| beeswarm; arrows | not built in | `Swarm` (a mark, not a position: it needs pixels) and `Vector` |
| difference chart; ridgeline | not built in | `difference` (6); ridgeline: plain data prep (per-series baselines on one linear y) |
| `NaN` or a missing value as a position | drawn at 0,0 (`Dot`, `Text`), `NaN` in paths and attributes | not drawn; `Line` and `Area` split (5.1) |
| hexbin on a small plot | cells squashed (height over width 0.49 against 1.155) | documented: explicit data-extent domains, or `nice={false}` with zero margins (6) |
| `Polygon fill="none" color="level"` | drew nothing (colour feeds `fill` only) | `colorTo="stroke"` for contour lines; fill none with no stroke throws (5.2) |
| legend of a classed colour scale | a swatch per trained value (3 cuts: 3 swatches for 4 classes; 20 `…` labels for a quantile) | a swatch per class, labelled by interval (5.10) |
| `Scale nice={false}` | documented, ignored (the same as the default) | opt-out; `nice={n}` is a tick count (5.6) |
| long or rotated labels, or a small figure | plot area of zero or negative size | claimed margins scaled to keep 25% of each dimension; margins and size props alone that leave nothing throw (5.7) |

Decided: numeric years keep d3's grouping (`2,020`; use `format=".0f"` or `"d"`, and a `time` scale
only for Dates or ISO strings); `Text text` stays the one string-is-literal prop (use
`text={d => d.name}` to read a field); an ordinal palette repeats past its length (five colours in
`chartTheme`), with no throw and no `overflow` option until a user needs one. Axes are not an open item: user-defined and polar axes are built (5.7 and 5.13). Interaction stays a non-goal. Geo and trees are marks (5.12).

### 7.3 The gap example suite

Every gap found by stress-testing the library, feature gaps and ergonomics gaps alike, has one
minimal, seeded example in `charts/test/gaps/`, specified by a row in `charts/GAP-EXAMPLES.md`.
An open gap is a `test.fails` (red first) that also asserts its ergonomics constraint (raw input
data, no hand-set margin, and so on); closing the item turns it green. A docs test fails if a
row has no example.

The behaviour that works today is locked in by `charts/test/works-today.test.jsx` (stack
offsets that centre, contours, a trend with a band, a composite projection, a long route,
small multiples, segmented colour, bin-then-stack, constants versus the scales, width-free
bins). Decided there: no trend helper is shipped (fitting is plain JS in the layout).
`charts/test/docs.test.js` fails if this file points at a `GAPS` item (the work list is closed) or a
gap-suite row has no example.

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
forwarding test and the `$` guard test are acceptance items. 

## 9. Open items

- Text width (`fonts.jsx`, built; this is the method and its error, the 1.6 precondition). `measure(text, size)` is
  bound to the theme font in `compile` (a `measure` prop still wins). A font stack picks the first family it knows:
  `mono` (a name containing mono, courier, consolas, menlo, code ...; the default `ui-monospace, monospace`) is 0.6 em a
  character, as before, so every existing snapshot and key is unchanged; `sans` and `serif` (the generics, Helvetica, Arial,
  system-ui, Times, Georgia ...) use a table of advances in 1/1000 em for ASCII and common punctuation, an accented letter as its base
  letter; a combining mark, joiner or variation selector is 0, a full-width (CJK) character 1 em; an unknown font, or any other character not in the table, falls back to 0.6 em. In `mono` the unit is the column: a full-width character or an emoji is two columns, a combining mark none. The tables were read with fontTools from the
  hmtx tables of Liberation Sans and Liberation Serif found on this machine (`/usr/share/fonts/liberation`, metric-compatible
  with Arial/Helvetica and Times New Roman, SIL OFL), and are not copied from any other source. JetBrains Mono and Liberation
  Mono both measure 600 on every glyph checked, so the monospace case is exact. Measured error, not rendering inside tauler
  (that cannot be run here): for 14 sample labels (3 to 36 characters, digits and units included), the table equals the
  advance sum of its own font exactly, and kerning (Pillow's basic layout, the `kern` table) moves a string by under 0.1%. The
  error that matters is the face tauler actually draws: against Noto Sans the sans table is 4.4% narrower on average (range -8.9% to
  +4.5%), against Roboto 0.9% wider (-2.6% to +8.8%); a bold face is about 5% wider (up to 9%) than the regular table; the old
  flat 0.6 em was +22% on average against Helvetica metrics (range -4% to +54%). So for a proportional face expect labels to measure
  within about 9% either way; a monospace face is exact. Not covered: bold and italic tables, CJK and other wide scripts
  (0.6 em, which under-measures them), emoji, and the font tauler's resvg falls back to when the family is missing.
- One smooth colour along a single path is `<Line color="field" gradient/>` (5.2). Segment-coloured
  lines (consecutive pairs drawn as `Link`s) remain the way to colour by a non-monotone field.
- Roadmap step 8's "integer-band error text" is not specified anywhere else; nothing throws for
  integer categories on a linear axis (the README says to declare `type="band"`).

## 10. Decision log (reviewer disagreements)

- Pixel stage, paints and effects (plan items 1.3, 1.5, 2.3 and 3.4b, done). 1.3 was built only as far as its one
  consumer, `jitterPx`: `g45` (a beeswarm) does not need it, since a swarm only moves points and
  stays a mark (`Swarm`, 5.2). So there is no `px py`, no pixel reading in `ctx.line` and no
  second training pass. Paints live in the shape as objects and are deduplicated by their JSON
  in `drawScene`, instead of a scene-level `defs` list: no new top-level scene field, so every
  existing key and snapshot is unchanged. 2.3 uses a user-space gradient on the stroke, because
  an object-box gradient on a flat line has no height.

- Key: toString-hashing rejected (closures collide); scene hash is the default; input hash
  with a required `key` is the fallback; the measurement gate decides, not opinion.
- Statistics: grammar `transform`s rejected for plain functions (ADR 0013); only `position`
  needs rows, so only it is in the grammar.
- Rect: the "infer `[0,v]` / spans plot" magic was replaced by explicit `baseline` and `±Infinity`.
- Polar coord, facet component, size/opacity channels, theme-slot colour strings,
  `label` channel, `train`, `Rule`: cut. (History: polar, and size and opacity channels, are in
  scope again under section 1; polar is built: 5.13.) `Arc` kept as the dogfood mark because pie is common.
- `key` vs `figureKey`: tauler's JSX keeps `key` in props, so `key` stays.
- Dual axis: built as named scales; stacked Plots are not an equivalent.
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
- Cost gate and isolation (plan items 0.2 and 0.3, done). `charts/test/bench.js` times the reference plot
  (Grid + Area + Line + two Axes, time x) and any new stage alternately in one loop (median of
  15) and `costOf(stage)` returns the stage as a fraction of the reference; a stage over 25%
  (`BUDGET`) ships a cheaper form or a `key`-path plan. Node medians of the reference plot:
  1.1 ms at 50 rows, 4.1 ms at 500, 21 ms at 5000. Measured inside tauler's real render runtime (a probe against the `tauler` library crate, not the binary; `charts/TAULER-SUPPORT.md`, T3), the same plot without a `key` costs 3.4 to 3.9 ms at 50 rows, about 20 ms at 500 and 158 to 205 ms at 5000 per Tick, and 0.02 ms with a `key`: QuickJS is roughly 6 to 12 times slower than Node here, not the 1.9 times derived earlier from the d3 benchmark table (that derivation was wrong). So the 10 ms of a Hop holds without a `key` only up to about 100 rows; above that give the `Plot` a `key` (5.11). A Node budget of `B` ms stands for about `6B` to `12B` ms in tauler. `isolate: true` passes every test (172 passed), but the whole run takes
  3.1 to 4.9 s against 3.0 s with `isolate: false`, so the "under 3 s" target is not met on
  this machine and `isolate: false` stays; the no-module-level-state rule (5.11) holds.
- Stress-test pass (7.2): fixed NaN stacking, array channels, multi-stop colour
  ramps (one polylinear scale replaces the sequential/diverging split), named curves, time bins
  and long-label overflow. All are made-up examples.
- Trees and maps reversed from non-goals to marks (5.12) at the user's request: d3's layouts
  and projections do the work, and `defineMark` already hands marks the pixel area, so the only
  core change is `ctx.projection`. Polar stays parked: unlike these, it needs every mark to map
  (x, y) jointly, which is a coordinate stage (as in ggplot2, G2 and ECharts; Observable
  Plot's projections are geographic only); marks-only polar (Vega-Lite, Recharts) was the cheaper option.
  (Superseded by section 1's scope rule: polar is built as that coordinate stage, 5.13.)


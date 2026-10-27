# charts: gaps and work list

Source: a stress test of the library against a wide range of charts (SPEC 7.1, 7.2), three
independent verification passes that tried to disprove each finding by building it, and review
rounds on this plan. Scope rule, principles and decisions: SPEC section 1 and 1.1. This file owns
the **future only**. Examples are described, not copied; tests use invented, seeded data.

Each item has a requirement, use cases, gap/challenge, **depends on**, and a **done when** test
that fails first (a `test.fails` or a stub-proof assertion, never a bare `typeof` check). Every
done-when also includes: the SPEC section is updated and the item is deleted from this file, in
the same commit. "Precondition" means a piece of evidence or design that must exist before
building, never a reason to descope (SPEC 1, scope rule).

## Order of work and dependencies

| Step | Items | Why here |
|---|---|---|
| A. Safety net | 0.1, 0.2, 0.3, A.4 | bug and engine risks first; tests lock in behaviour before any refactor |
| B. Refactor | 0.4 | no behaviour change; every later item lands in a named file or stage |
| C. Small and independent | 3.1, 3.3, 3.4a, 1.4a | each has a failing test or a clear bug; none needs a new stage |
| D. Encoding channels | 1.1, 2.1 | one concept; 2.1 is its first consumer |
| E. Built from existing pieces | 3.9, 3.8a, 2.2 | need 3.1 or 3.9 as stated per item |
| F. Large designs, with preconditions | 1.3, 3.4b, 1.4b, 1.5, 1.6, 3.8b, 1.7, 2.3 | each begins with its named precondition |
| G. Any time | 3.2, 3.5, 3.6, 3.7, 3.10 | independent; each names the user chart that needs it (3.10 lands with the items it covers) |

Dependency lines: 3.1 before 2.2; 3.9 before 3.8a and 2.2; 1.6 before 3.8b; 1.4b only for the
sunburst case of 3.8a; 1.1 before 2.1; 1.4a before 1.3 (pixel fields go through `ctx.point`);
1.3 before 3.4b and before hexbin-style layouts; 3.8b after 3.8a and 1.6; 1.5 before 2.3 and
before 3.6 arrowheads.

## Consolidation: every new concept, in one table

This is the complete list. If implementing an item adds a concept not named here, stop and
redesign.

| Piece | Covers | New concepts it adds |
|---|---|---|
| **Pipeline as stages** | 0.4 | an ordered stage list over one state object (shape given in 0.4) |
| **Encoding channels** | 1.1, 2.1 | `defineScale` and `defineChannel` (built-ins register through them); `sizeScale`/`shapeScale`/`opacityScale` helpers |
| **Positions and statistics** | 3.1, 3.3, 3.4a, 3.4b | a `by` group-by option; a `key` channel (never trained); `position` accepts an array; a `stage: 'pixel'` tag on a position function; slot fields `u1 u2` read by `ctx.point` so point marks honour band offsets |
| **Scale domain helpers** | 3.2, 3.7 | `orderBy` and `dateRange`, plain functions returning a domain |
| **Coordinate** | 1.4a, 1.4b | a `coord` prop; `ctx.point` and `ctx.line` joint mappings |
| **Stage after the scales** | 1.3 | pixel-space row fields (`px`, `py`, `dx`, `dy`) applied inside `ctx.point` and `ctx.line` only; a second training pass for non-position scales only (margins are already fixed) |
| **Curved and data-unit shapes** | 3.9 | `Link curve="link-horizontal"`; `Area` with `thickness1`/`thickness2`; `Dot` with `rx`/`ry` in data units |
| **Scene vocabulary** | 1.5, 2.3 | extra shape and style fields (gradients and others) |
| **Text measurement** | 1.6, 3.8b | a per-font width table; a `fit` option on `Text` |
| **Guides** | 1.7 | axes placed and replaced like marks |
| **Range padding** | 3.5 | `rangePad` on `Scale` |
| **Vector mark** | 3.6 | `Vector`; a pixel offset computed inside a mark |
| **Marks over derived rows** | 3.8a, 2.2 | none beyond the rows above |

---

## Step A: safety net

### 0.1 Unknown scale types fall back to linear (bug)
- **Requirement:** a request the library cannot honour fails loudly, naming what was asked for.
- **Use cases:** a mistyped or unsupported scale type; a mistyped channel or mark name.
- **Gap/challenge:** `buildScale` falls through to a linear scale for any unknown `type`, so a
  chart looks right and is wrong. Validate scale types, `Scale`/`Axis`/`Grid` channel names and
  mark names. Do **not** reject unknown mark style props: custom marks read their own props.
- **Depends on:** nothing.
- **Done when:** an unknown scale type throws an error naming the channel and the type; an
  unknown channel on `Scale`/`Axis`/`Grid` throws; existing tests pass.

### 0.2 Determinism across engines, and test isolation
- **Requirement:** the same props give the same scene and key in every runtime tauler uses.
- **Use cases:** tauler renders in two runtimes (one is QuickJS) and finds figures by key; a key
  the Draw runtime cannot reproduce is not drawn (SPEC 2).
- **Gap/challenge:** the risk is a different float engine, not a second module graph. Trig
  (polar, hexagons, geo), `Math.exp` (kde) and d3 curves may differ in the last bit, and `tidy`
  rounds to 2 decimals, so a value on an x.xx5 boundary can flip the key. Vitest runs Node only,
  so the engine check needs a shared artifact: a checked-in file of golden keys, asserted by a
  Node test here and by a test on tauler's side that runs in its own runtime. Never run the bare
  `tauler` binary. Also, vitest runs with `isolate: false`, so every file shares one module
  instance; rule: no module-level mutable state in the charts package.
- **Depends on:** nothing. Do this before items that add trig or randomness.
- **Done when:** the golden-key file covers trig-based marks and kde and the Node test passes; a
  rounding-boundary case has a test; `isolate: true` passes in under 3 s and the time is
  recorded in SPEC 10; the tauler-side test is recorded as present or as an explicit follow-up.

### 0.3 Cost budget under the slow runtime
- **Requirement:** each new stage and helper stays inside the update budget.
- **Use cases:** windows of a few hundred rows redrawn every update.
- **Gap/challenge:** SPEC 10 measured 7.8 ms at 500 rows in tauler's runtime against a 10 ms
  budget, leaving about 2 ms. Vitest runs Node, which is about 12 times faster, so a Node limit
  must be scaled. Polar densifying, projecting marks and the scene hash grow with the amount of
  drawing (29 ms for a 3000-point map without a `key`).
- **Depends on:** nothing; applies to every later item.
- **Done when:** a Node benchmark helper times the reference plot (Grid + Area + Line + two
  Axes, time x, 500 rows) and any new stage in the same run, as the median of N runs, and a test
  fails if the new stage costs more than 25% of the reference; the measured Node/QuickJS factor
  is recorded in SPEC 10 (every later budget derives from it, so it is measured, not assumed).
  An item over the limit ships a cheaper form or a `key`-path plan (the work runs in the Draw
  runtime). Caching between updates is not available: nothing survives a Tick (SPEC 2).

### A.4 Tests for behaviour that works today
- **Requirement:** nothing that works today can regress during the refactor.
- **Use cases:** step B.
- **Gap/challenge:** the catalog already exercises several of these (streamgraph `21`, contours
  `38` and `39`, regression `31`, a county choropleth with `d3.geoAlbersUsa()` in `109`, facets
  `facets-anscombe` and `51`, a route map `105`): confirm each before writing a duplicate, and
  keep only what is not covered. Ten behaviours (plus the docs test), one test each, in `charts/test/works-today.test.jsx` with
  invented data and one SVG fixture per seam, not per option: (1) stack offsets that centre
  around a moving baseline; (2) contour lines and filled contours from a grid, as a custom mark;
  (3) a trend with an uncertainty band via plain-JS fitting (decide whether to ship a helper);
  (4) a composite projection by name, fitted to data; (5) a line between distant places drawn
  along the curved shortest path; (6) small multiples (faint other-panel background, ragged last
  row, edge-only axes, shared domains); (7) segmented line colour; (8) bin-then-stack with
  automatic thresholds; (9) a finite constant mark extends a scale and an infinite one does not;
  (10) data-space bins unchanged by plot width; and (11) a docs test, `charts/test/docs.test.js`,
  that fails if a `GAPS N.N` reference in the SPEC does not resolve to a heading in this file.
- **Depends on:** nothing.
- **Done when:** the eleven tests exist and pass.

## Step B: refactor, no behaviour change

### 0.4 Split `core.jsx` and make the pipeline an ordered list of stages
- **Requirement:** each later item lands in a named place; adding a stage is an insertion.
- **Use cases:** every item in steps C to F.
- **Gap/challenge:** `core.jsx` is one 516-line file and `compile` is one linear function.
  Files: `scales.jsx` (inference, training, building, `colorScale`), `guides.jsx` (ticks,
  margins, axis and grid shapes), `scene.jsx` (shape schema, `tidy`, `drawScene`, `hash53`);
  `core.jsx` keeps collect, evaluate and `compile`. Each stage is `(state) -> state` over
  `{ spec, rows, domains, margin, area, scales, scene }`, written up in SPEC 4 with the fields
  each stage reads and writes. The 1.3 stage inserts between scale building and render; 1.4a
  changes `ctx`, not the stage list. A second split is already named: `scales.jsx` into
  `scales.jsx` (building) and `domains.jsx` (inference and training), taken when the line limit
  forces it. Fix the unused `d` at `core.jsx:62`.
- **Depends on:** A.4 and 0.2.
- **Done when:** all existing tests and every SVG fixture are byte-identical; a script test
  fails if a source file in `charts/` exceeds 300 lines; SPEC 4 names the state fields and each
  stage's reads and writes.

---

## Step C: small and independent

### 3.1 Per-series statistics
- **Requirement:** rolling windows, running totals, normalisation to a first value and "last
  point" computed within each series.
- **Use cases:** several lines smoothed separately; index charts; labelling each line's end;
  waterfalls per category; per-variable normalisation for parallel axes.
- **Gap/challenge:** `rolling` and `cumsum` treat the data as one sequence, so values leak
  across series. Add `by`, as `stack` has: `rolling(data, { by, value, window })`,
  `cumsum(data, { by, value })`, and new `normalize(data, { by, value })` and
  `last(data, { by })`. Plain `data -> data`. Input must already be ordered within each series;
  the helpers do not sort (documented).
- **Depends on:** nothing.
- **Done when:** with two series, each series' first output equals its own start.

### 3.3 Dodge fits the series present in each band
- **Requirement:** in grouped bars a band with fewer series gives them wider bars.
- **Use cases:** grouped bars with sparse combinations.
- **Gap/challenge:** `dodge` divides every band by the global series count. Change the default;
  keep global series order, remove empty slots. No `preserve` flag.
- **Depends on:** nothing.
- **Done when:** `grammar.test.jsx` #13 (`test.fails`) turns green.

### 3.4a Deterministic jitter on band axes
- **Requirement:** reproducible spreading of overlapping points on a category axis.
- **Use cases:** strip plots; dense categorical dot plots.
- **Gap/challenge:** a `key` channel (field name or function, like `group`; inherited like other
  channels; never trained). `jitter()` hashes `String(key)` with `hash53`. Rows with no `key` get
  offset 0 and overlap; this is documented, because deriving a key from row order makes twins
  jump every update when an Accumulator window slides. The offset is a fraction of bandwidth
  written as slot fields `u1 u2` (data space). Positions run before domains are inferred, so
  `jitter()` reads the **declared** `Scale type` and throws, naming `jitterPx` (3.4b), unless
  the axis is declared `band`. `position` accepts an array applied in order:
  `position={[dodge(), jitter()]}`. Point marks (`Dot`, `Link`) read `u1 u2` through
  `ctx.point` (1.4a), not only `Rect`.
- **Depends on:** 1.4a.
- **Done when:** `grammar.test.jsx` #15 is rewritten to assert: `jitter()` called twice on the
  same rows gives equal offsets; two rows with different keys differ; rows with no key get 0;
  every offset stays inside the band; removing one unique row leaves the others unchanged; an
  undeclared or non-band axis throws.

### 3.4b Jitter on continuous axes
- **Requirement:** the same for continuous axes.
- **Gap/challenge:** `jitterPx()`, a position tagged `stage: 'pixel'` (1.3); no dispatch on
  axis type. A `position` array splits by tag into a data-space prefix and a pixel suffix.
- **Depends on:** 1.3, 3.4a.
- **Done when:** an array holding a pixel-stage entry runs that entry after the scales; offsets
  are in pixels and equal across repeated runs.

### 1.4a Generic marks honour the projection (one `coord` prop)
- **Requirement:** `Dot`, `Line`, `Link` and `Text` given longitude and latitude draw where
  `GeoDot` draws them.
- **Use cases:** points, routes and labels on a map without a map-only mark.
- **Gap/challenge:** only `Geo` and `GeoDot` use `ctx.projection`, which violates principle 9.
  One prop: `coord`. `projection="mercator"` stays as sugar for `coord={geo('mercator')}`.
  Contract (shared with 1.4b): a coord receives the trained scales and maps (x, y) to a pixel;
  `geo` ignores the scales and reads `lon` and `lat` as the defaults for `x` and `y`, so no x/y
  scales are trained under `geo`. `ctx.x`/`ctx.y` are separate point functions, so a joint
  `ctx.point(x, y)` is added and every built-in mark uses it. A line cannot be densified from
  `ctx.point` alone, so the coord also provides `ctx.line(points)` (a projected, densified
  path). `Axis` and `Grid` are not drawn under `geo` by default; a graticule is data.
- **Depends on:** 0.3 (map cost), 0.4.
- **Done when:** `<Dot/>` and `<GeoDot/>` given identical data and no channel props produce the
  same pixel; a long `Link` bows along the projected path; map cost is measured against 0.3.

---

## Step D: encoding channels

### 1.1 Open scale types and mark-declared channels
- **Requirement:** an author adds a scale kind without editing the package, and a mark or
  position can write a field it computes and declare it as a channel that trains a scale.
- **Use cases:** area-proportional sizes; heavy-tailed data including zero or negatives;
  banded colour by thresholds; a rank or density written by a position and coloured by a scale.
- **Gap/challenge:** scale types are a closed switch: `log` is hard-coded in `trainDomains`,
  `buildScale` and the `nice` list, band scales are detected by `scale.bandwidth` in `at()` and
  `context`, and `Scale({type:'sqrt'})` falls back to linear (0.1). Only built-in channels train
  scales; a field written by a position (`u1`, a rank) is never trained (SPEC 5.4). One
  contract, with built-in types registered through it:
  `defineScale('sqrt', { train(values, opts) -> domain, build(domain, range, opts) -> fn with
  .ticks(n), .nice(), .invert? })` and `defineChannel('rank', { scale: 'color' })` for a
  position or mark (position scales only on the first training pass; later is 1.3). Replace
  SPEC 5.6's "function-typed `type`" wording with this contract.
- **Depends on:** 0.1, 0.4.
- **Done when:** `sqrt` and `pow` (with exponent) are built-in types through the same contract
  as two test-defined types, a band-like one and a discrete threshold one; a position writes a
  field that is not a built-in channel, declares it, and a second mark reading that scale gets
  its domain (this fails today because custom keys do not train).

### 2.1 Shape, size and opacity channels
- **Requirement:** a data field can drive marker shape, size and opacity through scales.
- **Use cases:** scatter plots readable without colour; bubble charts; fading by confidence or
  age; one field on two channels.
- **Gap/challenge:** `Dot` draws circles; `r` and opacity are style functions, so no scale
  trains them. Rule: a channel prop (`size`, `shape`, `opacity`) goes through a scale and sets
  the style prop (`r`, marker, `fillOpacity`); an explicit style prop wins, using the existing
  `ctx.resolve` order. Call site: `<Dot size="mass" shape="kind"/>` with
  `<Scale channel="size" type="sqrt" range={[0, 10]}/>`, where the range is the radius; on a
  mark with no size meaning (`Rect`, `Line`) a `size` channel throws. The `opacity` channel
  prop takes a field name only; a function stays the old style form. Shape values are names from d3's symbol set (circle, cross, diamond, square, star, triangle,
  wye). Legend helpers match `colorScale`: `sizeScale` and `opacityScale` return a function
  with `.domain()`; `shapeScale` returns a function from value to symbol name with `.domain()`.
- **Depends on:** 1.1.
- **Done when:** one categorical field drives colour and shape; for `domain=[0, max]` and
  `range=[0, R]`, `r**2 / value` is constant; each helper returns what a legend needs.

---

## Step E: built from existing pieces

### 3.9 Curved links, ribbons and data-unit shapes
- **Requirement:** links can curve, ribbons have thickness, and a circle can take its radius in
  data units.
- **Use cases:** tree and flow links; ribbons between stages; packed circles in unit space.
- **Gap/challenge:** `Link` is straight (`marks.jsx:116`), and `Dot` takes a radius in pixels.
  Add `curve="link-horizontal"` to `Link` (d3's horizontal-link path, plus the names `Line`
  already takes), `thickness1`/`thickness2` on `Area` for a ribbon whose thickness differs at
  the two ends, and `rx`/`ry` on `Dot` as radii in data units so a unit-space layout can drive
  a circle.
- **Depends on:** 0.4.
- **Done when:** a curved `Link` draws the d3 horizontal-link path between two points; a ribbon
  has the given thickness at both ends; a circle in unit space scales with the plot.

### 3.8a Hierarchy layouts as statistics, not fused marks
- **Requirement:** treemap, tree, pack and partition layouts return rows that any mark can draw.
- **Use cases:** a treemap with custom labels; a tree drawn with different node shapes; one
  layout reused by two marks; sunburst once polar exists (1.4b).
- **Gap/challenge:** `Treemap`, `Tree`, `Pack` and `Partition` (`hierarchy.jsx`) run the layout
  and draw, label and colour in one mark, bypassing the x/y scales. Move the layouts to
  `stats.jsx`: `treemap(data, { path, value })`, `tree(data, { path })`,
  `pack(data, { path, value })`, `partition(data, { path, value })`. They return node rows
  (`x0 y0 x1 y1`, `depth`, `branch`, `id`, `parentId`), and `tree` also returns link rows
  (`sourceId`, `targetId`, `x1 y1 x2 y2`). Drawn with
  `<Rect x1="x0" x2="x1" y1="y0" y2="y1" color="branch"/>` over
  `<Scale channel="x" domain={[0, 1]}/>`; the y scale flips, so layouts return y already
  inverted. The stat then runs on the loop every update, where the marks today can skip that
  with a `key` (SPEC 5.11, 5.12). Cost control is not caching (nothing survives a Tick): measure
  against 0.3, and if over the limit ship a `key`-path form where the stat runs in the Draw
  runtime. Keep the old marks until parity is tested.
- **Depends on:** 3.9, 0.3.
- **Done when:** the existing hierarchy tests pass using the stat plus generic marks (curved
  links included), with the label assertions marked `test.fails` until 3.8b; the layout is
  reused by two different marks; and Node cost is within 0.3.

### 2.2 Parallel coordinates and flow diagrams, from existing pieces
- **Requirement:** multivariate profiles across several axes, and flows between categories,
  with no new core piece.
- **Use cases:** comparing many rows over several measures; quantities moving between groups.
- **Gap/challenge:** parallel coordinates are a reshape to long form, a per-variable
  normalisation (3.1) and a `Line` over a band axis of variable names; per-axis ticks are
  ordinary `Text` and `Link` marks fed by data. A flow diagram is a layout statistic (nodes and
  links to rows, in unit space) drawn with `Rect` and the ribbon from 3.9. The flow layout
  algorithm is not in d3's default bundle; the catalog already writes one in about 50 lines
  (`sankeyLayout`, `b.test.jsx`), so write it in the library. Several named scales per chart
  stay tier 2 (real dual axes only; see 1.7).
- **Depends on:** 3.1, 3.9.
- **Done when:** both kinds render from plain data and no file outside marks and stats changes.

---

## Step F: large designs (each starts with its precondition)

### 1.3 A stage after the scales are built
- **Requirement:** layouts that need pixel positions can run, and the values they create then
  train scales.
- **Use cases:** hexagonal and other spatial binning; jitter on continuous axes; any layout
  whose result changes with plot size.
- **Gap/challenge:** positions run before scales and cannot see pixels. Mechanism: a function
  tagged `stage: 'pixel'` goes in `position`; order is: scales train, the pixel stage runs,
  created channels train **non-position** scales only (margins are already fixed), then render.
  Pixel results travel as row fields `px`, `py`, `dx`, `dy`, applied inside `ctx.point` and
  `ctx.line` only (1.4a), so marks gain no new code. A created channel is declared with
  `defineChannel` (1.1), with a non-position target. State reads and writes: reads `rows`,
  `scales`, `area`; writes `rows` (adds the pixel fields and created fields) and retrains and
  rebuilds non-position scales in `domains` and `scales`. Layouts that only move things
  (beeswarm, label avoidance) stay marks.
- **Precondition:** a concrete chart that 1.1 cannot express, such as a pixel-dependent hexbin,
  written first as a failing test.
- **Depends on:** 1.1, 1.4a, 0.3, 0.4.
- **Done when:** the same data at two widths gives identical data-space bins and different
  pixel-space cell counts; a pixel-stage count colours a scale shared with a second mark; a
  `position` array holding a pixel-stage entry runs it after the scales.

### 1.4b Polar coordinates
- **Requirement:** circular charts with angular and radial scales, ticks, grid and clipping.
- **Use cases:** radar, coxcomb, sunburst, polar lines, spirals.
- **Gap/challenge:** the shared coord contract (1.4a) given trained scales: x is the angle and y
  the radius, `<Plot coord={polar({ inner: 0.2 })}>`. Needs a mark-geometry contract (a `Rect`
  becomes a wedge path, so it must emit paths, and `Arc` currently ignores scales entirely),
  polar axes and grid (`margins`, `axisShapes`, `gridShapes` assume horizontal and vertical
  axes), and a non-rectangular clip (`scene.clip` is a rectangle). Densify cost is controlled as
  in 0.3.
- **Precondition:** a design note signed off by the owner, plus a prototype of one chart that
  has survived a review. Two polar prototypes already exist in `charts/test/catalog/`
  (`polar-c.jsx`, `polar-f.jsx`; see "Evidence from the chart catalog"); the note reconciles them.
- **Depends on:** 1.4a, 0.3, 0.4.
- **Done when:** one data set renders as a bar chart and a coxcomb by changing the coordinate
  only, the wedge path count equals the bar count, and each wedge's angle is proportional to its
  band; polar axes and grid draw.

### 1.5 A wider scene vocabulary (decoration)
- **Requirement:** the scene can express what an author can draw in SVG within what tauler's
  rasteriser supports.
- **Use cases:** gradients, patterns, shadows, blur, rounded corners, caps, images, clipped
  regions, groups with transforms, line markers, blend and opacity.
- **Gap/challenge:** five shapes and a fixed style list today (SPEC 5.5).
- **Precondition:** write the rasteriser capability list first, one named test per feature.
- **Depends on:** 0.4.
- **Done when:** each feature the rasteriser renders has a passing scene test, and each it does
  not render is a `test.fails` with the reason recorded in SPEC 5.5.

### 1.6 Text: multi-line, wrapped and rotated
- **Requirement:** labels, titles and annotations of any length and orientation.
- **Use cases:** long category labels; annotations; rotated axis labels; titles.
- **Gap/challenge:** one line only (SPEC 7.2); width is an estimate because the Draw runtime
  has no layout (SPEC 9: a per-font width table).
- **Precondition:** measured error of the width estimate against real rendered text for the
  fonts in use, which decides the table approach.
- **Depends on:** 0.4.
- **Done when:** wrapped label boxes computed from `measure` stay inside the stated width and
  rotated label boxes do not intersect their neighbours.

### 3.8b Labels that draw only where they fit
- **Requirement:** a label is drawn only if its box fits the shape it names.
- **Use cases:** treemap and pack labels; narrow bars.
- **Gap/challenge:** today part of the hierarchy marks; as a general rule in `Text`
  (a `fit` option comparing `measure` with the available box).
- **Depends on:** 1.6, 3.8a.
- **Done when:** the existing hierarchy label behaviour is reproduced with `Text` plus `fit`.

### 1.7 Axes and guides as an open seam
- **Requirement:** axes and grid are built from the same pieces as marks and can be placed,
  styled and replaced.
- **Use cases:** top and right axes, per-panel axes, axes inside the plot, polar axes, axis
  titles, second and third y axes.
- **Gap/challenge:** axes and grid are fixed (x bottom, y left; SPEC 5.7). The catalog adds axis
  titles and extra y axes as test-local marks (`AxisTitles`, `OwnY`). Several axes per chart
  need named scales (SPEC 5.6, tier 2) or marks that bring their own scale.
- **Precondition:** one failing test that needs an axis the fixed layout cannot draw.
- **Depends on:** 0.4, 1.4b.
- **Done when:** a test places an axis on another side and a user-defined axis replaces the
  built-in one.

### 2.3 Smooth colour along a single path
- **Requirement:** one stroke whose colour changes along its length.
- **Use cases:** time-coloured trajectories; soft threshold transitions.
- **Gap/challenge:** segmented colouring works today (consecutive pairs drawn as `Link`s). A
  single smooth path needs a gradient (1.5); gradients follow an axis, so colour must be a
  function of x or y.
- **Precondition:** 1.5's capability list says whether the rasteriser renders a gradient. If it
  does not, close this item as a host constraint and move it to Non-goals in the same commit.
- **Depends on:** 1.5.
- **Done when:** a line over a time axis colours by x as one path, in a test that fails first.

---

## Step G: independent (each names the user chart that needs it)

### 3.2 Ordering a category axis by a statistic
- **Requirement:** order the categories of a band axis by an aggregate of another channel, and
  give small multiples one shared order.
- **Use cases:** ranked bars; sorted dot plots; trellis panels with aligned rows.
- **Gap/challenge:** band domains are first-seen or numeric/date sorted. A plain function takes
  **all** the data and returns one ordered domain that every panel passes to `Scale`:
  `orderBy(data, { field, by, stat = 'sum', descending = false })`, where `stat` is a d3
  reducer name (sum, mean, median, max, min, count) or a function, and ties keep first-seen
  order. Panels never sort alone.
- **User chart:** a ranked bar list in a status bar; panels per host with one shared order.
- **Depends on:** nothing.
- **Done when:** the same helper output gives identical category order in every panel.

### 3.5 Room at the edges
- **Requirement:** marks and labels at the extremes are not clipped or crowded.
- **Use cases:** labels at the first and last point; dots on extreme values.
- **Gap/challenge:** `margin` is the only fix. Add a pixel inset on the range:
  `<Scale channel="x" rangePad={8}/>`, named to avoid `inset` (pixels off a band edge on
  `Rect`) and `padding` (the band gap); ticks stay on round values.
- **User chart:** a sparkline with a value label at each end.
- **Depends on:** nothing.
- **Done when:** a new `test.fails` for the clipped end label turns green with `rangePad`.

### 3.6 Vector marks
- **Requirement:** an arrow or tick from a point given a rotation and a length.
- **Use cases:** flow and direction fields; needles and gauge hands.
- **Gap/challenge:** the existing arrow takes endpoints. Mark `Vector`:
  `<Vector x="lon" y="lat" angle="dir" length={12}/>`; `angle` in degrees clockwise from up;
  `length` is a constant in pixels (a data-driven length would be a channel through a scale,
  decided with 2.1). The end is computed from a pixel offset inside the mark. Arrowheads wait
  for 1.5.
- **User chart:** wind direction in a weather bar; a gauge needle.
- **Depends on:** nothing for plain lines; 1.5 for heads; 2.1 for a data-driven length.
- **Done when:** a mark draws rotated, fixed-pixel-length vectors from two numeric channels.

### 3.7 Date bands with empty slots, and zero bars
- **Requirement:** a calendar bar chart shows missing days as empty slots; a zero-value bar
  draws nothing.
- **Use cases:** daily counts with quiet days; month grids.
- **Gap/challenge:** without a domain, a date band closes the gaps. A plain function
  `dateRange(data, { field, interval = 'day' })` returns the full domain for `Scale domain`.
  `Bar` at zero draws a flat line today; `Rect` zero-height lines (median rules, dojis) stay.
- **User chart:** a daily-count bar chart with quiet days.
- **Depends on:** nothing.
- **Done when:** the helper's domain keeps gaps; a zero-value `Bar` emits no shape; `Rect`
  zero-height lines are unchanged.

---

## Evidence from the chart catalog (`charts/test/catalog/`, read 2026-10-27)

What it is: about 190 examples in six groups (a: cartesian core, b: distributions, spatial,
network and multivariate, c: polar, hierarchy and maps, d: interaction and motion, e: themes
and dashboards, f: pie, radar and radial), rebuilt on made-up seeded data, one test per example,
each drawing kept as an SVG. No `test.fails` or `test.skip`: everything is built, and the
whole suite passes. Everything the core lacks is built as a mark local to the test file, on
`defineMark`, and the file headers list it:

- axis titles; second and third y axes (`OwnY`); in-picture legends and tooltips;
- Delaunay, grid and density contours, vectors and arrows, hexbin, swarm, violin, tick, and
  flow (Sankey) marks;
- polar maths repeated per mark (`polar-c.jsx`, 268 lines; `polar-f.jsx`, 225 lines);
- gradients, done by layering translucent slices because the scene has no `<defs>`.

What this changes in the plan:

- **Nothing is infeasible; the gap is reuse.** Each recipe is a test-local mark, so a second
  chart cannot share it. Item 3.10 decides which become library pieces.
- **1.4b:** two divergent polar designs already exist: `polar-c.jsx` repeats frame and
  `angleDomain`/`radiusDomain` props on every mark, and `polar-f.jsx` passes one shared
  `polar()` object to each. The second is nearer the coord contract in 1.4a. The design note
  must reconcile them.
- **1.3:** the catalog's hexbin is a self-contained mark that colours by its own count and
  works today. So 1.3 stays unjustified until a chart needs a pixel-derived value to train a
  scale shared with a second mark (the precondition already says this).
- **1.5:** gradients are worked around by stacking translucent slices; this is the use case.
- **1.7:** axis titles and extra y axes have no library support (use cases added there).
- **2.2:** the flow layout is about 50 lines in `b.test.jsx` (`sankeyLayout`), because
  d3-sankey is not in d3's bundle; write it in the library rather than import. A parallel
  coordinates example (`27`) exists.
- **Interaction:** group d draws each interaction as a pure function of an explicit state
  (pointer, hidden series, brush, zoom window, playback clock). The library needs no change to
  be driven by a host that owns the state; SPEC's non-goal wording was updated to say so.
- **Provenance:** example slugs and titles mirror upstream catalogs (TanStack Charts, shadcn,
  Recharts, ECharts); data is made up and code is original. Record the origin the way SPEC 7.2
  does ("challenge found by reading"), keep the data synthetic, and do not copy upstream code.

### 3.10 Promote catalog marks to the library, or document them as recipes
- **Requirement:** a mark that works in a catalog test is either reusable by everyone or
  documented as a recipe; none stays a private copy.
- **Use cases:** a Delaunay mesh, contours, density contours, vectors and arrows, hexbin, swarm,
  violin, tick marks, flow diagrams, axis titles, an in-picture legend, a tooltip.
- **Gap/challenge:** these are local to `b.test.jsx`, `e.test.jsx` and the polar files. Apply the
  fewest-pieces test to each: promote only where it is a general piece (a statistic plus a
  generic mark, or an input to 1.5 to 1.7), and leave the rest as recipes. Several are
  already covered by items here (vectors 3.6, hexbin 1.3, flows 2.2, axis titles 1.7), so they
  land with those items, not separately.
- **Depends on:** 0.4, and the item that covers each mark.
- **Done when:** every catalog-local mark is either exported from the library with its
  catalog test unchanged, or listed in SPEC as a recipe with a link to its test.

## To review (not yet decided)

- Legends inside the Picture (SPEC 5.10): the stated reason is design (swatches cannot drift),
  not a host constraint, and the catalog draws legends in the picture as a mark. Decide whether
  the non-goal stands.
- SPEC 7.2 open decisions: years print as `2,020`; an ordinal palette repeats past six colours;
  `Text text="field"` is literal text.
- `d3-hexbin` and the flow-layout package are not in d3's default bundle (SPEC 5.4).

## Non-goals (host constraints only)

- In-figure interactivity, and animation: a figure is a static Picture (ADR 0044).
- A dataframe: data is plain JSON (ADR 0013).
- Legends inside the Picture: tauler JSX draws them beside the figure.

## Housekeeping

- Agents do not commit; they stage and print the commit command.
- The README's chart sections link to the SPEC for the pipeline and must not restate it.

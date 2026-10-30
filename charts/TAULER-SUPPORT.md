# What the chart library needs from tauler: support requests T1-T18

Part 1 of 3: overview, background, contracts, rollout. Part 2 holds T1-T8, Part 3 holds T9-T18 and Appendices A-F.

Audience: the tauler maintainers. Author: the maintainer of the chart library in `dotfiles-tauler` (`charts/`). Tone: plain. This document asks for changes in tauler. It does not ask for a charting feature; the grammar stays in our library.

## How to read this document

Every request T1-T18 uses the same nine subheadings: Problem, What we do today instead, Evidence, Reproduce today, Proposal, Acceptance tests, Compatibility and rollout, Alternatives, Open questions. A request is meant to be implementable from its own text.

Evidence conventions:

- `path:line` is relative to the tauler repo (`/home/kantord/repos/tauler`) unless it starts with `DT:`, which means the `dotfiles-tauler` repo (`/home/kantord/repos/dotfiles-tauler`).
- `ADR 00NN` is `docs/adr/00NN-*.md` in tauler. `#NNN` is a tauler GitHub issue number as quoted in tauler's own sources; no network was used, so issue status is not re-checked.
- Each claim carries a status. **VERIFIED**: read in source at the commits below, or run, with the output recorded. **INFERRED**: follows from the code shape but was not read as a stated behaviour or run. **UNVERIFIED**: not read and not run; the text says what would settle it.
- Tauler-side facts come from four read-only research notes made against the tauler commit below. We never run the `tauler` binary (it starts a second bar, even for `--version`). Where a tauler-side run is shown (Part 2), it came from small probe programs that call the `tauler` library crate and tauler's own functions (`JsxEvaluator`, `draw_figure`, `flatten_passthrough`, the `themeColor` resolver) and are listed in Appendix F. Tauler-side reproduction steps without a run shown are either `file:line` to read or a Rust test to write, and are marked UNVERIFIED.
- Every "Reproduce today" step on our side was run in this repo. Commands are run from `/home/kantord/repos/dotfiles-tauler`.

## Environment and exact commits

| Item | Value | Status |
|---|---|---|
| tauler commit | `7babd12b3e39b32d0ffdc753e476dee203936b06` (`git -C /home/kantord/repos/tauler rev-parse HEAD`; package version 0.7.0 from the research notes) | VERIFIED |
| dotfiles-tauler commit | `a4ca7e21b752b0487d20e1ab2bb09c26e2c01991` (`git -C /home/kantord/repos/dotfiles-tauler rev-parse HEAD`) | VERIFIED |
| dotfiles-tauler branch | `feat/charts-gap-suite` (`git branch --show-current`) | VERIFIED |
| Node | `v24.7.0` (`node -v`) | VERIFIED |
| pnpm | `12.15.0` (`pnpm -v`) | VERIFIED |
| Test runner | vitest 5.0.3, d3 7.9.0, linkedom 0.18.14 (`DT:package.json`); `TZ` pinned to `UTC` in `DT:vitest.config.js` | VERIFIED |
| Verification run | `pnpm vitest run charts/test/gaps/state-determinism.test.jsx charts/test/key.test.js charts/test/Plot.test.jsx` gives 3 files, 13 tests, all passed | VERIFIED |

The tauler working tree may have moved since the notes were taken; re-check each `path:line` against your HEAD.

## Summary table

"Removes" is what our library can delete or stop maintaining if the request is accepted. Priority: P0 = blocks correct or cheap use today, P1 = removes a large workaround, P2 = nice to have. Effort is tauler-side: S = days, M = a week or two, L = more. Controversy: how likely the maintainers will want a different design (see each request's Alternatives). The request headings carry the same three values; the table was made to match them.

| ID | Title | Priority | Effort | Controversy | What it removes from our library |
|---|---|---|---|---|---|
| T1 | Text measurement reachable from layout and Draw runtimes | P0 | M | high | The estimated text width: `DT:charts/core.jsx:34` `defaultMeasure` and the per-font advance tables in `DT:charts/fonts.jsx`; label overflow guesses |
| T2 | Font availability contract for figure text | P1 | S | some | The font-stack classifier `kindOf` (`DT:charts/fonts.jsx:21-27`) and the "missing font draws nothing" ambiguity |
| T3 | Cheap deterministic content keys (`hash` in render and Draw runtimes) | P1 | S | high | Our own `hash53` (`DT:charts/scene.jsx:92`) and the need to compile the scene each Tick just to get a key |
| T4 | Figure identity: size and theme in Picture identity | P1 | S | some | The rule "encode width, height and theme in your key" and the `clipId` hash in `DT:charts/Plot.jsx:24` |
| T5 | Visible UnknownKey and Draw failures | P1 | S | some | Debugging by guesswork: a blank figure with only a DEBUG log line |
| T6 | Layout-evaluation budget and visibility | P2 | M | some | Our Node-to-QuickJS cost factor guess (`DT:charts/SPEC.md` section 10) and the `key=` escape hatch advice |
| T7 | Determinism contract for render, Draw and page runtimes | P1 | M | high | Defensive rounding in `tidy` (`DT:charts/scene.jsx:103`) and golden-key stability worries |
| T8 | JSX reshaping rule made opt-in or branded | P2 | S | some | The `mark` field workaround (`DT:charts/core.jsx:38-39`); data objects can use `type` and `props` |
| T9 | More pinned third-party modules for D3Figure (d3-hexbin, d3-sankey) | P2 | M | high | Hand-written hexbin (`DT:charts/hexbin.jsx`) and the sankey layout we omit |
| T10 | `d3` availability parity across desktop and page | P2 | S | none | Special-casing where `d3` is a global versus an import (issue #683) |
| T11 | Package subpath imports and a runtime-free export subset | P1 | M | some | The duplicate export list `DT:charts/index.jsx` and its agreement test |
| T12 | Published test harness / runtime emulation | P1 | L | high | `DT:test/tauler.js` and the `themeColorFor` copy in `DT:charts/examples/palettes.js`, plus drift tests |
| T13 | Cross-runtime golden-key conformance test in tauler | P1 | S | none | The open follow-up in `DT:charts/SPEC.md` 5.11 and our only unverified determinism claim |
| T14 | Container size available to a chart | P1 | L | high | Width and height constants copied from layout code (owner's `StatusPanel.jsx` / `layout.js`) |
| T15 | Pointer input to figures (hover, brush, tooltip) | P2 | L | high | Nothing today (the library stays pure: state in, no state out); unlocks examples now listed as non-goals |
| T16 | Deterministic clock; timestamps in `tauler-accumulate` | P2 | M | some | Time passed in as a stream value; "never call `new Date()`" rule in `DT:charts/Plot.jsx` |
| T17 | SVG/raster capability contract and conformance SVG | P1 | S | none | Guesswork about filters, masks, patterns, markers, gradients, colour glyphs, string image hrefs |
| T18 | Version and capability detection for packages | P1 | S | some | Having no way to ship a library that adapts to the host; a new import specifier blanks the layout |

## Status after tauler's review (2026-10-30)

Tauler's maintainers checked the 18 requests against their code (tauler `main` at `bc3e932`, with #711, #713, #714/#716 merged since). **This section supersedes the request texts where they disagree.** Request texts below are kept as written, because their evidence and reproductions still stand; each request that changed has a "Status" note under its heading.

| ID | Outcome |
|---|---|
| T1 | Parked. `measureText` would exist only if the chart library commits to using it; we have not. If it comes back it goes in render and Draw, or nowhere; with no resolvable font it returns the fallback face's width; an empty family list throws |
| T2 | Partly corrected: text with an unknown family still draws ink in tauler's real path (the "draws nothing" result came from standalone usvg). An unmatched family draws at an arbitrary weight of the primary face. End every family list with a registered generic |
| T3 | Done differently (#714, #716): `<D3Figure key>` accepts any JSON value, which tauler stringifies and hashes natively. No public `hash()` global. Lossy values (functions, `undefined`, NaN, Infinity, Date, BigInt, cycles) are to throw |
| T4 | Done (#711): the Picture name is `<key>@WxH` |
| T5, T7 (mechanism), T13 (tauler side), T16 (`ctx.now`) | Done in a different form (#713): the Draw runtime evaluates with the inputs of the Tick that asked for the figure. The real cause of blank figures was the Draw runtime reading live streams and post-render `globals`, not JS-engine differences. Unknown keys now log at warn level. There is no per-Tick `ctx.now`: `ctx` is set once per runtime |
| T6 | Dropped (the warn-only eval timer) |
| T8 | Agreed, small: the flatten pass descends only through `children` |
| T9 | Library side. An `@gh` package would not load on the page, so hexbin and flow stay in the library |
| T10 | Agreed: the page resolves `import "d3"` (#683) |
| T11 | Library side: the root `index.jsx` does `export * from './charts/index.jsx'` (QuickJS resolves it) |
| T12 | Library side: vitest can load tauler-web's wasm `boot()`; we still need our linkedom shim to draw |
| T13 | Library side: turn the Node golden keys into golden scenes; the Rust side lives in our CI |
| T14 | Deferred: measuring the real box costs 0.6 to 2.2 ms per panel per Tick. A cheap opt-in (`object-fit: contain`) is later |
| T15 | Deferred: no hover or motion input on X11 or Wayland; hover stays a non-goal (ADR 0020) |
| T16 | Timestamps via `jq -c --unbuffered '{t:(now|floor),v:.}' \| tauler-accumulate`. No `--stamp`. Take time from the newest row's `t` |
| T17 | The pixel conformance test is dropped; an "SVG in figures" docs note remains |
| T18 | Agreed, small: a `tauler.version` constant |

On our side: `Plot` now keys a figure by a canonical string of its props (`charts/speckey.jsx`) and compiles only in the Draw runtime. A closure, a custom mark or a projection in the props falls back to the scene hash. The rule for mark authors: a mark's `render` reads only rows, ctx and props.

Corrections to this document, from the review:

- Only render and Draw must agree on a key, and they share one engine (QuickJS) in one process. The page keeps its own cache and never has to match desktop keys. Wherever T7 and T13 say that Node, the browser and QuickJS must agree, read "render and Draw".
- A Picture is pre-rasterised at the `<img>`'s numeric size, so it is not shown at another CSS size without a redraw (T14).
- The unknown-family "draws nothing" claim in T2 came from standalone usvg 0.48.1, not from takumi's vendored copy.
- The text-width table is 14% off in tauler's default config, where "JetBrains Mono" is not registered and draws as Noto Sans.

## Background

### Data flow of a figure (VERIFIED from the research notes; see Part 2 for per-request detail)

```
layout file (one source, evaluated by several engines)
 |
 +-- render runtime (QuickJS, on the loop, EVERY Tick, draw never runs)     jsx.rs:1219
 |     <D3Figure key width height draw>  ->  {type:"img", src:"tauler:picture/<key>"}   globals.rs:329-339
 |
 +-- reconciler runtime (QuickJS, own thread, for Units; ADR 0034)
 |
 +-- Draw runtime (QuickJS, own thread "tauler-draw")                       draw.rs:135, jsx.rs:934
 |     evaluates the WHOLE layout again with the latest stream values        draw.rs:268-269
 |     finds draw by key in ITS tree, runs draw(svg, d3) -> svg markup       jsx.rs:808-822
 |     key not in its tree -> UnknownKey, DEBUG log, nothing drawn           draw.rs:86-87, 307-309
 v
 loop keeps one Picture per key  ->  Render worker rasterises once per (Picture, physical w, h)   picture.rs
 
 page (tauler-web): the browser's own JS engine runs the layout; draw runs inline in a real <svg>; no Draw runtime, no Picture (ADR 0027, ADR 0044:51-54)
```

Rules that matter for us: the key is required and names one Picture "for good" (ADR 0044); a figure whose key is unchanged is never redrawn; "same figure" across Ticks is its position among figures in document order (`src/d3_figure/requests.rs:1-6`); the Draw runtime may trail the loop by one round (ADR 0044:42-44); nothing survives between Ticks except `globals` (ADR 0007).

### Where compile runs: Plot with and without `key`

Our `Plot` (`DT:charts/Plot.jsx`) has two paths. Both end in a `<D3Figure>`.

| | No `key` (default) | With `key` |
|---|---|---|
| Source | `DT:charts/Plot.jsx:28-31` | `DT:charts/Plot.jsx:22-26` |
| `compile(props)` runs in layout eval | yes, every evaluation, to compute `key = hash53(JSON.stringify(scene))` (`DT:charts/core.jsx:291`) | no; only inside `draw`, i.e. in the Draw runtime, when tauler asks for that key |
| Runtimes that pay it | render runtime every Tick (VERIFIED: layout eval); the Draw runtime on every round, for every figure in the layout, not only the one being drawn (INFERRED from `draw.rs:268-269`); the reconciler runtime if the layout module runs there (INFERRED from ADR 0034) | Draw runtime, once per new key |
| Who owns identity | the library: key changes exactly when the scene changes | the caller: the key must change whenever the picture should |
| Failure mode | slow Ticks for large data; any float difference between runtimes changes the key, so the Draw runtime cannot find it (UnknownKey) | a stale key shows a stale chart with no warning; same key at two sizes is one Picture |

Costs. Two measurements, both VERIFIED, on the same reference plot (`DT:charts/test/bench.js` `referenceProps`: Grid + Area + Line + two Axes, time x). Ms per evaluation, two runs each ("a / b"); this machine carries about 30% load noise, so read the orders of magnitude, not the digits.

| rows | Node: `compile` | Node: `Plot` without `key` (layout eval) | **tauler render runtime per Tick, no `key`** | tauler render runtime, with `key` | tauler Draw runtime layout eval per round, no `key` | `draw_figure`, with `key` |
|---|---|---|---|---|---|---|
| 50 | 1.66 / 0.60 | 1.04 / 0.41 | **3.41 / 3.87** | 0.02 / 0.03 | 3.67 / 3.98 | 5.10 / 5.97 |
| 500 | 3.92 / 1.79 | 3.54 / 1.67 | **20.88 / 20.19** | 0.02 / 0.01 | 18.51 / 18.69 | 23.24 / 17.99 |
| 5000 | 28.45 / 15.58 | 15.36 / 14.86 | **204.77 / 158.09** | 0.03 / 0.01 | 182.18 / 156.34 | 182.69 / 157.82 |

The tauler columns were measured against the real `tauler` library crate (see T3, "Reproduce today"), not by running the `tauler` binary. So QuickJS in tauler is roughly 6 to 12 times slower than Node for this plot. At 500 rows the default (no `key`) path costs about 20 ms per Tick, twice the 10 ms of a Minimal Hop; at the 60 samples of a real status-bar sparkline it costs about 4 ms. A figure with a `key` costs the loop 0.02 ms and moves the 18 to 180 ms into the Draw runtime's `draw`. The Draw runtime reproduces the render runtime's key (`draw_figure(key)` succeeds with no `UnknownKey` for the three row counts). An earlier version of our own `charts/SPEC.md` section 10 derived a factor of 1.9 from tauler's d3 benchmark table; that derivation was wrong and is corrected. Other tauler-side costs from its docs: render-runtime layout eval is about 2 ms for a few hundred nodes (ADR 0007), and a short key costs 0.05-0.17 ms per Tick against 1.5-19 ms to ship SVG through the tree (ADR 0044:22-26). There is no time limit on render-runtime layout eval (INFERRED: the only interrupt handler is in `draw_figure`, `src/jsx.rs:993-1005`); only `draw` has a 5 s limit (`src/d3_figure/draw.rs:54`). Whatever our `compile` costs, on the default path the loop pays it every Tick. The hash itself is cheap in the host: sha256 of the 33 KB scene JSON costs 0.014 ms against 3.75 ms for our JS `hash53` (T3).

### Root-cause analysis

The one structural fact: **tauler needs the key at layout-eval time, but the key is a function of the picture, and the picture is computed by code that, by design, must run off the loop.** `draw` is off the loop; the key is not. Four problems follow, each a request:

1. **Cost (T3, T6).** To get a content-derived key we must compile the scene on the loop every Tick. The alternative is a caller-supplied key. There is no host primitive that hashes props cheaply (`hash` exists only with `Effects::Allowed`, `src/jsx.rs:1099-1110`) and no way to see or bound the time (T6).
2. **Identity (T4).** The key names a Picture; size and theme are not part of it. A key reused at two sizes gives one Picture (INFERRED from registry shape, `src/render/picture.rs`; to be confirmed by the T4 test).
3. **Agreement (T7, T13).** The key computed in the render runtime must equal the key the Draw runtime computes from a separate evaluation, possibly later and from newer stream values. Any difference (floating point from libm, time zone, `Date`, text measurement that depends on the font set at that moment) gives UnknownKey, which is logged at DEBUG and drawn as nothing (T5).
4. **Inputs the layout cannot learn (T1, T14, T16).** The layout cannot measure text, cannot see its container, and has no clock. We compensate with estimates and constants. Each estimate is a place where the key can drift from what is drawn.

T8-T12, T17, T18 are about authoring and testing a package against a host we cannot run in CI: the reshaping rule (T8), module availability (T9-T11), the test harness (T12), the SVG feature set (T17) and version detection (T18). T15 is an optional feature request; the library does not need it.

## Cross-cutting: determinism contract overview

Our library promises: **the scene, and therefore the key, is a pure function of props.** To keep that promise it uses no clock, no randomness (`seeded` PRNG only in tests; jitter uses `hash53` of the row key, `DT:charts/positions.jsx:124,141`), no environment reads, and rounds numbers to 2 decimals in the scene (`DT:charts/scene.jsx:103`). Statistics are ordinary deterministic JS.

What we need from the host, in one table (details in T1, T7, T13, T16):

| Source of variation | Where it can differ | Our mitigation today | Request |
|---|---|---|---|
| libm (`Math.sin`, `Math.exp`, ...) | QuickJS on host libm vs Node/V8 vs browser | rounding to 2 decimals; 3 golden keys (`DT:charts/test/golden-keys.json`) asserted in Node only | T7, T13 |
| Time zone | three native runtimes share one process; page uses the browser's | vitest pins `TZ=UTC`; time scales formatted by d3 in local time | T7 |
| `Date`, `Intl` | `Date` exists in QuickJS; `Intl` absent (INFERRED, to be verified in T7) | no `Intl`; passes Date values from streams | T7, T16 |
| Text width | takumi layout, usvg SVG text, browser differ | estimated width from tables | T1, T2 |
| Font set | `reload_font_config` can change fonts between evals (`src/render/mod.rs:127`) | none | T1, T2 |
| Float formatting in `JSON.stringify` | engine-specific shortest round-trip should be identical (INFERRED) | none | T7, T13 |

A **contract** here means: documented guarantees on the host side plus one conformance fixture (T13) that fails when a host change breaks them. We are not asking for a bit-identical Math across engines in the first step; we ask to know what is promised, and for a test that notices when it stops being true.

## Rollout order and dependencies

Dependency graph (an arrow `A -> B` means: do A before B, or B is much weaker without A):

```
T18 capabilities ----------------------------> (every request below can be feature-detected)

T13 golden-key test  -> T7 determinism contract -> T16 clock
        |                       |
        |                       +-> T3 hash builtin -> T4 identity (size/theme)
        |                                   |
        v                                   +-> T5 visible failures <- T6 budget/trace
T12 test harness <- T11 subpath imports <- T8 JSX reshape rule (independent, small)

T2 font contract -> T1 text measurement -> T14 container size -> T15 pointer input

T17 SVG capability contract   (independent, documentation + one fixture)
T10 d3 parity                 (independent, small) -> T9 more modules
```

Suggested order, with the reason:

1. **Wave 1, small and independent, unblock everything else:** T13 (a test, no API), T5 (logging), T4 (decide and document identity), T17 (docs + fixture), T10 (parity), T18 (a `tauler` global with version and capability list, so later waves are detectable).
2. **Wave 2, the core contract:** T7 (determinism document and any shims), then T3 (hash builtin) because a key from props is only trustworthy after T7. T6 (budget and trace) alongside, since T3 changes where cost lands. T8 is independent and can go in this wave.
3. **Wave 3, text:** T2 then T1. T1 needs a definition of which fonts exist (T2) and a determinism statement (T7) because a measured width can enter the scene and so the key.
4. **Wave 4, packages and tests:** T11, T12 (T12 is much cheaper after T11 and T13), T9.
5. **Wave 5, host features:** T14, T16, then T15 only if the maintainers want it.

If only three things are done: T13 + T5 (we learn when keys disagree and why), T3 (the cost), T7 (the contract).

## Not requested, and why

- **Animation.** Timers in the Draw runtime never fire and transitions never play (`src/d3_figure/mod.rs:60-65`); layouts have no frame clock; a Tick happens only when a stream changes. A moving figure would need a new key per frame, which is costly (#686). The library's position: a motion example is a function of (data so far, now), and `now` arrives as data (T16).
- **Hover, tooltips, brushing.** Only if T15 is chosen. ADR 0020 explains why hover is absent (hit testing runs an uncached layout per call) and ADR 0012 why controls hold no state. Without T15, our library draws any state it is given (pointer, brush, zoom) and does not read any.
- **A native `<Chart>` component (#39).** The grammar lives in userland on purpose: it is changed often, composed in JSX, and keeps tauler's core small. Everything we ask is generic (keys, text, determinism, modules), not chart-specific.
- **A dataframe, canvas rendering, or a different rasteriser.** Data is plain JSON (ADR 0013); figures are SVG Pictures (ADR 0044).
- **Network or filesystem access from `draw`.** The Draw runtime has no fetch, fs or shell, and that is correct (ADR 0045 security). T9 asks for pinned modules, not for network access from drawing code.
- **A bit-exact cross-engine `Math`.** See the determinism section: we ask for a stated contract and a conformance test, and list a shim only as one alternative in T7.

---

# Part 2: Text, keys, determinism and the JSX shape (requests T1 to T8)

This part stands alone. It covers Group 1 (text and fonts: T1, T2), Group 2 (keys, caching, cost: T3 to T6) and Group 3 (determinism and the language runtime: T7, T8). Every request uses the same template. Every claim carries a status: VERIFIED (read in source, or run, with the command shown), INFERRED (follows from code read but not run), UNVERIFIED (not checked).

## 0. Conventions used in this part

Paths. `TAULER:` is `/home/kantord/repos/tauler` (commit `7babd12b3e39b32d0ffdc753e476dee203936b06`). `DT:` is `/home/kantord/repos/dotfiles-tauler` (commit `a4ca7e21b752b0487d20e1ab2bb09c26e2c01991`, branch `feat/charts-gap-suite`). A bare `path:line` is relative to `TAULER:`. Toolchain: node v24.7.0, pnpm 12.15.0, vitest 5.0.3, python3 with fontTools 4.67.0, rquickjs 0.14.0 (quickjs-ng 0.16), glibc 2.44, release builds for all Rust probes, Chromium from `/usr/bin/chromium`. Note: the working tree of TAULER has one untracked file, `examples/validate_layout.rs`, which is not ours and was not touched. No file in either repo was edited; every probe lives in a scratch directory `$WORK`.

Probe set-up (all of it ran offline, and none of it runs the bare `tauler` binary). The probes use the real `tauler` library crate (the one `tests/` and `examples/` already use) as a path dependency, so "the real render runtime" and "the real Draw runtime" below are `JsxEvaluator::new_with_packages` and `JsxEvaluator::new_draw` from `src/jsx.rs`, not a model of them. The sources of every probe are in section 9 at the end of this part. To rebuild:

```sh
export WORK=<a scratch directory holding the files of section 9>
export REPO=/home/kantord/repos/dotfiles-tauler
# 1. real tauler runtimes (about 2 minutes the first time, offline)
cd $WORK/tp && cp /home/kantord/repos/tauler/Cargo.lock . && CARGO_TARGET_DIR=$WORK/tp/target cargo build --offline --release
# 2. QuickJS alone (same quickjs-ng as tauler): a 40 s build
cd $WORK/qjs && CARGO_TARGET_DIR=$WORK/qjs/target cargo build --offline --release
# 3. offline copy of the pinned d3 + linkedom that tauler already cached
mkdir -p $WORK/d3dir && cp ~/.cache/tauler/d3/* $WORK/d3dir/ && export TAULER_D3_DIR=$WORK/d3dir
# 4. the chart library as one ES module for a layout, and as an IIFE for QuickJS
node $WORK/build-lib.mjs && node $WORK/build.mjs
```

VERIFIED: all four steps ran on 2026-10-29 and produced the outputs quoted below. The vitest scratch tests run from `$REPO` with `npx vitest run --config $WORK/vitest.scratch.config.mjs <name>`; that config is the repo's `vitest.config.js` minus the line `process.env.TZ = 'UTC'`, so that `TZ` comes from the environment.

---

## Group 1: Text and fonts

### T1 A text measurement API reachable from layout and Draw runtimes   [priority P0 | effort M | controversy: high]

> **Status (tauler review, 2026-10-30):** parked; the library has not committed to calling `measureText`. See the status section near the top.

**Problem.** A chart cannot be laid out without knowing how wide its labels are: the left margin is the widest y tick label, ticks are thinned when labels would touch, long labels are cut with an ellipsis, a legend row wraps, a treemap cell shows a label only if it fits. In the desktop Draw runtime linkedom has no layout engine, so `getBBox`, `getComputedTextLength` and `getBoundingClientRect` "measure nothing" (`src/d3_figure/mod.rs:66-68`; docs `components.md:298-301`, "Text cannot be measured. Place labels from your scales, not from the size of the text."). Worse, the width is needed in the layout evaluation, before `draw` runs, whenever the library derives the figure key from the scene (T3). The user-visible effect: margins that are too wide or too narrow, ticks that overlap or are dropped, labels cut when there was room, on whatever face tauler picks. Section "Evidence" gives the measured size of that error: against Noto Sans (the face `fc-match sans-serif` returns on the maintainer's machine) the best table we can build is 3.9% too narrow on average and wrong by up to 14% for one label.

**What we do today instead.** `DT:charts/fonts.jsx` keeps a per-face table of advances (1/1000 em) for ASCII read from Liberation Sans and Liberation Serif, plus a 0.6 em rule for monospace and unknown faces (`DT:charts/fonts.jsx:7-14` tables, `:22-31` `kindOf` picks the table from the CSS font stack, `:51-65` `measureFor(font)`). `DT:charts/core.jsx:34` keeps the older `defaultMeasure = text.length * size * 0.6`. `compile` binds one function per Plot: `DT:charts/core.jsx:289` `measure: props.measure ?? measureFor(theme.font)`; a caller can pass its own `measure` prop. The exact list of consumers of `measure` in our library (all of them read `env.measure` or `ctx.measure`, never a global):

| Consumer | DT file:line | What it decides |
|---|---|---|
| bound per Plot | `charts/core.jsx:285-290` (`compile`), `:289` | `env.measure`; the `measure` prop overrides |
| given to every mark as `ctx.measure` | `charts/scene.jsx:84` | marks measure with the same function |
| ellipsis truncation | `charts/scene.jsx:19-23` (`fit`) | shortens a label until it measures at most `room` px |
| x/y axis label sizing | `charts/guides.jsx:31-32`, `:65-66`, `:71`, `:77-78`, `:83` | left/right/bottom margin from the widest tick label, rotated label extents, truncation |
| tick thinning | `charts/ticks.jsx:35-40` (`tickLabels`) | drops ticks whose widest label would not fit the length |
| polar axis labels | `charts/polaraxis.jsx:30`, `:38` | label offsets on the circle |
| legend layout | `charts/legend.jsx:26-44`, `:60` | item widths, truncation, wrapping to the budget |
| Text mark | `charts/text.jsx:20` (`wrap`), `:29` (`fitsBox` when `fit`) | line breaks and whether a label fits its box |
| hierarchy marks | `charts/hierarchy.jsx:36` (`fits`), `:61` (room for tree labels) | cell labels shown only if they fit; margin for tree labels |
| typesetting helpers | `charts/typeset.jsx:9-22` (`wrap`), `:49-50` (`fitsBox`) | the generic wrap and fit rules |
| font tables | `charts/fonts.jsx` (all) | the implementation being replaced |

VERIFIED by `grep -n measure charts/*.jsx` in `$REPO`: 13 files mention `measure`; the ones above are the consumers, `theme.jsx:8` and `hexbin.jsx:12` are comments. Because of this single seam, adopting a host measurement is a change in one function (`measureFor`), plus feature detection (see Proposal).

**Evidence.**

Tauler side.
- Ordinary layout text is measured by takumi's own inline layout: `takumi-core-0.32.0 layout/inline/block_layout.rs:68` (`measure`), shaping with harfrust, tables with skrifa (takumi-core `Cargo.toml:103,117,122,202`); takumi has no system font source, tauler loads fonts through the fontconfig CLI (`src/render/mod.rs:238`, `fc_query("fc-list")` around `:265`, generic names from `fc-match`; README.md:18). Registered families are only: `fonts.primary`, `fonts.extra`, and the `fc-match` answers for sans-serif, monospace and emoji, then a symbol fallback (`src/render/mod.rs:332-355`, `:395`). `fonts.files_only` registers only configured paths and never consults fontconfig (`src/render/mod.rs:71-78`, `src/config.rs:66-72`).
- SVG text inside a figure goes through usvg, built from the same registry: `svg_fontdb` / `build_svg_fontdb` (takumi-core `resources/font.rs:370,386`) push every registered face and map the five CSS generics (serif, sans-serif, cursive, fantasy, monospace) to whatever family the registry's settings name; tauler registers faces only for SANS_SERIF, MONOSPACE and EMOJI (`src/render/mod.rs:342`), so serif, cursive and fantasy name nothing. The Draw runtime sets `font-family="sans-serif"` on the root `<svg>` (`src/jsx.rs:818`).
- The web page runs `draw` against a real `<svg>` in the browser's engine with the page's CSS fonts (`tauler-web/js/runtime.js:228-247`); it never uses tauler's fontconfig set (ADR 0027, ADR 0028:19-20, 110-114: web fidelity gates geometry on a pinned browser, "individual glyph pixels will differ").
- Where a host function would plug in: all common host functions are registered in `with_effects`, `src/jsx.rs:1039`, with `renderTemplate` at `:1179` ("Registered unconditionally ... touches nothing in the world", `:1172-1177`) and `warn` at `:1183`. That function builds all three QuickJS runtimes (render: `src/app.rs:1121,1127,1247,1253`; reconciler: `src/units.rs:325-333`; Draw: `JsxEvaluator::new_draw`, `src/jsx.rs:934`). A takumi layout can already be run on demand: `with_scene` (`src/hit_test.rs:126`) builds a `TakumiRenderContext` from `global.fonts.snapshot_with_fallbacks(None)`, lays a node out and exposes `results.layout(id).size.width`; `painted_boxes` (`src/hit_test.rs:177`) is its public wrapper.
- Fonts can change under a running process: `reload_font_config` (`src/render/mod.rs:127`, job `RenderJob::FontsChanged`, `src/render/worker.rs:96`). After a layout reload tauler redraws every key (`Requests::after_reload`, `src/d3_figure/requests.rs:90-95`); whether a font reload does the same is not stated (see Open questions).

Our side, run today.

(a) Error of our table against real faces. The script `fontwidth.py` (section 9.1) reads the SANS array from `DT:charts/fonts.jsx`, checks it against the hmtx table of Liberation Sans, then compares it to four other installed sans faces over 95 ASCII glyphs and 14 labels (advance sums, no kerning; fontTools 4.67.0). `fc-list` on this machine has Liberation Sans, Noto Sans, Roboto, Adwaita Sans and Atkinson Hyperlegible; `fc-match sans-serif` answers `NotoSans-Regular.ttf` (VERIFIED, `fc-match sans-serif file family` prints `Noto Sans:file=/usr/share/fonts/noto/NotoSans-Regular.ttf`), so that is the face tauler would draw here.

```
$ python3 -I fontwidth.py $REPO/charts/fonts.jsx
table == Liberation Sans hmtx (rounded to 1/1000 em) for ASCII 32..126: True (differences: [])

face                    glyph>0  glyph<0   glyphs | per-glyph |err| mean  | 14 labels: mean  min  max  (table vs face, %)
Liberation Sans               0        0       95 |      0.0%          |   +0.0   +0.0   +0.0
Noto Sans                    40       55       95 |     10.4%          |   -3.9  -14.0   +7.3
Roboto                       56       39       95 |      7.8%          |   +1.3   -8.6   +9.4
Adwaita Sans                 16       78       95 |      9.7%          |   -5.8  -14.1   -0.1
Atkinson Hyperlegible        58       36       95 |     10.4%          |   +1.8  -14.1  +12.4

Old flat 0.6 em vs Liberation Sans, 14 labels: mean +25.6%
```

The per-label table is in the script's output (worst case `iiilll`: -14.0% against Noto Sans, -14.1% against Adwaita Sans; best case a label of digits and capitals). So: the table is exact for the face it was read from, 4% off on average for the face tauler actually draws here, and the error for any one label can reach 14%. The 14 labels are listed in the script. (The SPEC's own figures at `DT:charts/SPEC.md:949-955`, -4.4% against Noto Sans, are for a different label set; both say the same thing.)

(b) The three text measurers agree with each other to 0.014 px when they use the same font bytes. This matters for the shape of the API: the disagreement between desktop layout text (takumi), desktop SVG text (usvg) and the page (browser) is a disagreement about which face is used, not about shaping. Measured with `fc-match`'s face, Noto Sans Regular, 11 px, 14 labels, with files from `/usr/share/fonts/noto`:

```
$ FONT_FILE=/usr/share/fonts/noto/NotoSans-Regular.ttf tauler-probe takumi-text labels.json 11   # tauler::hit_test::painted_boxes, files_only
$ usvg-probe NotoSans-Regular.ttf NotoSansMono-Regular.ttf labels.json                            # usvg 0.48.1 <text> bounding box
$ chromium --headless=new --dump-dom measure.html                                                  # canvas measureText and DOM span width
$ python3 -I compare3.py labels.json takumi.tsv usvg.tsv chrome.tsv
label (Noto Sans 11px)                   takumi     usvg   canvas      dom     hmtx    table
CPU                                      21.656   21.648   21.648   21.656   21.648   23.221
Quarterly revenue (USD)                 125.609  125.598  125.597  125.609  126.038  121.638
iiilll                                   17.031   17.028   17.028   17.031   17.028   14.652
Average request throughput by region    198.641  198.638  198.637  198.641  199.738  184.657
(10 more rows in the full output)
largest spread between the four engine widths for one label: 0.014 px
mean |hmtx sum - takumi| / takumi: 0.21%
mean (table - takumi) / takumi: -3.8%
```

takumi layout widths are quantised to 1/64 px (21.65625 = 1386/64), which explains the 0.008 px offsets between takumi and the others. Caveats: Latin text, one face, one size; usvg here is the standalone crate 0.48.1, not the vendored copy inside takumi-core (which uses tauler's registry); complex scripts, bold and italic were not measured. The plain advance sum without kerning (`hmtx` column) is 0.21% off on average and up to 1.1% off (`Temperature -12.5 C`: 105.84 against 104.64): kerning matters little for Latin UI labels, so a per-font advance table (alternative B below) is a good approximation if exactness is not required.

(c) Cost of one uncached takumi measurement: 0.032 ms per call through `painted_boxes` on a one-node tree, with one registered face and `files_only` (VERIFIED, `tauler-probe takumi-text`, 500 calls, release). With a full fontconfig set `snapshot_with_fallbacks` is slower (PERF-AUDIT.md:78-81 puts font matching at about 10% of a render), so the call must be memoised. A plot has 20 to 60 labels, so unmemoised that is 0.6 to 2 ms per Tick per figure, against the 2 ms an entire layout eval costs (ADR 0007).

**Reproduce today.**
1. `python3 -I $WORK/fontwidth.py $REPO/charts/fonts.jsx` prints the table above (VERIFIED, exit 0).
2. Show that the Draw runtime cannot measure: `grep -n "getBBox\|measureText" /home/kantord/repos/tauler/src/d3_figure/mod.rs /home/kantord/repos/tauler/src/jsx.rs` finds only the doc comment at `mod.rs:66-68`; and `tauler-probe globals` prints, for both the render and the Draw runtime, `"measureText":"undefined"` (VERIFIED, section 9.3 scenario `globals`).
3. The takumi / usvg / browser comparison (VERIFIED), from `$WORK`:
```sh
FONT_FILE=/usr/share/fonts/noto/NotoSans-Regular.ttf tp/target/release/tauler-probe takumi-text labels.json 11 2>/dev/null | sed 's/Some(\(.*\))/\1/' > takumi.tsv
us/target/release/usvg-probe /usr/share/fonts/noto/NotoSans-Regular.ttf /usr/share/fonts/noto/NotoSansMono-Regular.ttf labels.json | sed 's/Some(\(.*\))/\1/' > usvg.tsv
chromium --headless=new --no-sandbox --disable-gpu --virtual-time-budget=3000 --dump-dom file://$PWD/measure.html | sed -n '/<pre/,/<\/pre>/p' | sed 's/<[^>]*>//g;s/^done//' | grep -P "\t" > chrome.tsv
python3 -I compare3.py labels.json takumi.tsv usvg.tsv chrome.tsv
```
   `takumi-text` also prints, on stderr, `uncached painted_boxes call: 0.032 ms each (n=500, release)`.
4. The consumer count: `cd $REPO && grep -n measure charts/*.jsx | grep -v "^charts/\(fonts\|theme\|hexbin\)"` (VERIFIED).

**Proposal.**

API. One global function, available in the render, reconciler and Draw runtimes and in the page:

```js
measureText(text, { family, size, weight = 400, style = "normal" }) -> { width, ascent, descent }
```

- `text`: a string, measured as a single line, no wrapping, no whitespace collapsing (CSS `white-space: pre`). `family`: the same string that goes in an SVG `font-family` attribute or a CSS `font-family` list (so `"JetBrains Mono, monospace"` and `"sans-serif"` both work). `size`: logical px (the unit of a layout number, `tauler-core/src/dom.rs:44`), finite, greater than 0. `weight`: 1 to 1000. `style`: `"normal"` or `"italic"`.
- Result in logical px, rounded to 1/64 px (what takumi's layout produces, and the page's canvas already agrees within 0.014 px). `ascent` and `descent` are positive distances from the baseline for the resolved face at that size (hhea or OS/2 typographic metrics, the same ones the layout's line box uses).
- The family is resolved exactly as drawing resolves it, so the answer describes what will appear. If nothing resolves the result is the width of the fallback that drawing would use, and if drawing would draw nothing (see T2) the function throws `RangeError("measureText: no font for family ...")`. Throwing on a bad `size` or non-string `text` is a `TypeError`.
- Pure given the font set: the result depends only on its arguments and the registered fonts, never on time or call order.

Rust sketch (desktop). Register next to `renderTemplate` at `src/jsx.rs:1179` so all three runtimes get it with no effect permission:

```rust
// src/jsx.rs, inside with_effects, after "renderTemplate"/"warn":
globals.set("measureText", Function::new(ctx.clone(), |text: String, opts: rquickjs::Object| -> rquickjs::Result<Metrics> {
    let key = MeasureKey::from(&text, &opts)?;                 // family, size.to_bits(), weight, italic, text
    crate::render::text_metrics(key)                           // memoised, see below
}))?;

// src/render/text_metrics.rs
static CACHE: Mutex<(u64 /*fonts generation*/, HashMap<MeasureKey, Metrics>)> = ...;
pub fn text_metrics(key: MeasureKey) -> rquickjs::Result<Metrics> {
    let generation = FONTS_GENERATION.load(Ordering::Acquire);   // bumped in reload_font_config (render/mod.rs:127)
    let mut cache = CACHE.lock();
    if cache.0 != generation { *cache = (generation, HashMap::new()); }
    if let Some(m) = cache.1.get(&key) { return Ok(*m); }
    // one-node tree, the same machinery as hit_test::with_scene (src/hit_test.rs:126):
    // {type:"div", style:{display:"flex"}, children:[{type:"div", style:{fontFamily, fontSize, fontWeight, fontStyle, whiteSpace:"pre"}, children:[text]}]}
    let m = with_global_ctx(|g| lay_out_one_line(g, &key))?;     // width from results.layout(id).size.width; ascent/descent from the baseline and the line box
    if cache.1.len() >= 4096 { cache.1.clear(); }
    cache.1.insert(key, m); Ok(m)
}
```

Notes on the sketch. Ascent and descent: takumi's inline measurement carries a baseline (`block_layout.rs` around `:100`, INFERRED from reading, not run); if it cannot be reached from outside takumi-core, read `hhea` through skrifa (a dependency of takumi-core only today; a direct dependency would be needed). `ascent`/`descent` are the only part of the sketch that I could not check against the code; the width path is the one measured in "Evidence (c)".

Page: define the same global in `tauler-web/js/runtime.js` with a `CanvasRenderingContext2D` (`ctx.font = style + weight + size + family`, `measureText(text)`, `fontBoundingBoxAscent/Descent`), rounded to 1/64. The page then measures with the browser's font for that family. VERIFIED that Chromium's canvas agrees with takumi to 0.014 px for the same face; UNVERIFIED that the page and the desktop resolve the same face (they will not unless the user installs it on both: this is the documented ADR 0028 position).

Memoisation and determinism design.
- Keyed by `(fonts generation, family, size bits, weight, style, text)`, capped at 4096 entries, one process-wide cache so the three runtimes (one process) always agree within a generation. Never per-runtime state: ADR 0007 forbids state surviving between Ticks inside a runtime, and a process-wide cache of a pure function is not that.
- `FONTS_GENERATION` is bumped by `reload_font_config`. The one hazard is a font reload that lands between the render runtime's eval and the Draw runtime's eval of the same Tick: the two evaluations see different widths, so a key derived from the scene differs, so the Draw runtime reports `UnknownKey` (debug-logged, `src/d3_figure/draw.rs:307-308`), and the loop asks again for the key it now shows (`draw.rs:303-306` comment). So it heals itself within a round; make it deterministic by redrawing all keys after a font reload, as `after_reload` already does after a layout reload.
- `fonts.files_only` (`src/render/mod.rs:71-78`) is the switch that makes widths host-independent. Golden tests and `tauler-screenshot` already use it (`tauler-screenshot/src/lib.rs`, `Options::files_only`). Without it a library that hashes measured widths into a key gets different keys on different machines; that is correct (different pictures) and needs no handling, but must be documented.
- For a consumer whose output must also be identical in the page, the library should round measured widths before they enter the scene (ours does: the scene is rounded to 2 decimals at `DT:charts/scene.jsx:103-106`).

Usage in our library, after the change:

```js
// charts/fonts.jsx
export const measureFor = font =>
  typeof measureText === 'function'
    ? (text, size) => measureText(text, { family: font, size }).width
    : tableMeasure(font);          // today's tables, for older tauler versions (T18)
```

Cost: one memoised map lookup per label after the first Tick (about a microsecond, INFERRED), 0.03 ms per new label (VERIFIED above).

**Acceptance tests.** Rust, in `src/jsx.rs` tests (use `files_only` with a vendored Noto Sans or Liberation Sans file so the numbers are host-independent):
- `measure_text_equals_the_layout_width`: `assert!((measureText("Requests per second",{family:"sans-serif",size:11}).width - painted_boxes(<same node>).width).abs() < 1.0/64.0)`. With Noto Sans Regular the expected widths are `CPU 21.65625`, `Memory 63% 67.859375`, `Requests per second 107.53125`, `iiilll 17.03125` (VERIFIED values from the probe).
- `measure_text_is_identical_in_all_three_runtimes`: evaluate `export default () => <div>{JSON.stringify(measureText("Hello",{family:"sans-serif",size:11}))}</div>` in `new_with_packages`, in `new_reconciler*` and in `new_draw`; assert the three strings are equal.
- `measure_text_is_memoised`: a counter around `lay_out_one_line` is 1 after 100 identical calls and 2 after changing `size` by 0.01.
- `measure_text_changes_after_a_font_reload`: `reload_font_config` with a different primary file; the same call returns a different width, and the cache generation advanced.
- `measure_text_agrees_with_the_svg_path_within_a_twentieth_of_a_pixel`: for the 14 labels, `|measureText.width - usvg text bounding box width| < 0.05` (the measured spread is 0.014).
- Page (`docs/tests/d3-figure.spec.ts` style): `await page.evaluate(() => measureText('Hello',{family:'sans-serif',size:11}).width) > 0`.
- Library side (ours, to land with the change): `measureFor('sans-serif')` called with a stubbed global `measureText` returns `stub(...).width`; with the global absent it returns the table's value (a vitest test next to `DT:charts/test/text.test.jsx:10-23`).

**Compatibility and rollout.** Additive: a new global. Layouts that do not call it are unaffected. Feature detection is `typeof measureText === 'function'` (T18 proposes something better). Docs to change: `components.md:298-301` ("Text cannot be measured") and `src/d3_figure/mod.rs:66-68`. An ADR is needed ("measureText is a pure function of the registered font set"). Our library keeps its tables as the fallback, so a package works on old and new tauler; the keys it produces differ between the two paths, which is fine because a key only has to agree between runtimes of one tauler.

**Alternatives.** The choice is high-controversy because it fixes what a layout can depend on.

- A. A host function per call, `measureText(text, opts)` (the Proposal). How it works: Rust lays out one line with the same engine as the rest of the bar and returns width and metrics, memoised. Pros: exact for the face drawn, one place for fonts to be right, no tables to ship, works for any face the user installs (including bold and italic), and `ascent`/`descent` are exact. Cons: a new host surface in three runtimes plus the page; a result that depends on the machine's fonts, so keys built from it are machine-dependent (acceptable, see determinism); the page and the desktop can still disagree on which face is used. Favours: library authors who need exactness (us), users of unusual fonts. Our recommendation: this one.
- B. A per-font advance-table export `fontMetrics(family) -> { unitsPerEm, advances: Float32Array-like or {codepoint: advance}, kern?: ..., ascent, descent }`, read once and memoised in module scope. How it works: the host serialises the cmap-to-advance map of the resolved face once; the library measures in JS. Pros: it is plain data, so it is pure, hashable, trivially identical in all three runtimes, and a layout can be tested in Node by feeding a fixture; zero per-label host calls. Cons: the table for a full face is large to marshal into QuickJS in each of three runtimes (a Latin subset is 95 numbers, a full face has thousands of glyphs), per-runtime module state is "expected to live forever" (`src/jsx.rs:12-14`) but is repeated three times; no kerning (0.21% mean, up to 1.1% off on our 14 labels, VERIFIED above), no shaping for complex scripts, no fallback-per-cluster. Favours: users who want purity and Node-testable code. Recommendation: acceptable as a later addition if the maintainers prefer data over functions, and it is the better shape for a Node test harness (T12); not first.
- C. A canvas-like object, `const c = measureContext(); c.font = "11px Noto Sans"; c.measureText(s).width`. How it works: mimic the 2D canvas API so d3 code that measures with canvas runs unchanged. Pros: a known API, d3 and other libraries already have canvas paths. Cons: stateful (a `font` setter), a bigger surface to keep compatible with the web API for the page and desktop, and the state is awkward given "nothing survives between ticks" (ADR 0007). Favours: porting existing code. Recommendation: no; it can be built in userland on top of A.
- D. Status quo plus per-font tables in the library. How it works: we ship a table per common face. Pros: no tauler change. Cons: error up to 14% per label and 4% on average for the face drawn here (VERIFIED), bold and italic are not covered (about 5% wider, up to 9%, per `DT:charts/SPEC.md:952-953`), and every new font is a table to maintain; the owner's own default theme font is monospace so that case is exact, which hides the problem for them but not for other users. Favours: nobody but the status quo. Recommendation: keep as the fallback only.
- E. Let the host lay the text out inside SVG using explicit SVG features (`text-anchor`, `textLength`, `lengthAdjust`, `dominant-baseline`). How it works: the library asks for a given width and the rasteriser fits the glyphs. Pros: no host API. Cons: it does not answer the questions a chart asks before drawing (how wide must the margin be, which ticks to drop), `textLength` distorts glyph spacing instead of choosing a shorter label, and support in the vendored resvg is UNVERIFIED. Favours: charts with fixed margins. Recommendation: no.

**Open questions for the maintainers.**
1. Should a font reload (not only a layout reload) mark every key for redraw, so a width change can never leave a stale Picture?
2. Is takumi's inline layout the right authority (so text in the figure matches ordinary text next to it), given usvg agrees with it to 0.014 px for Latin text? Complex scripts and colour glyphs were not measured.
3. May `measureText` throw when no font resolves, or should it return the width of tauler's last-resort fallback?
4. Does the maintainer want `ascent` and `descent` in the first version, or only `width`?
5. Is a direct skrifa dependency acceptable if takumi's baseline is not reachable?

---

### T2 A font availability contract for figure text   [priority P1 | effort S | controversy: some]

> **Status (tauler review, 2026-10-30):** the unknown-family 'draws nothing' evidence is from standalone usvg; in tauler's real path text draws ink. End family lists with a registered generic. See the status section near the top.

**Problem.** A figure's `font-family` is whatever the library writes (`DT:charts/guides.jsx:102`, `legend.jsx:68`, `text.jsx:49`, `hierarchy.jsx:37`, `polaraxis.jsx:48` all use `theme.font`). Which families resolve in the desktop SVG path is narrow and not documented, so a chart can silently draw no text. On the desktop only the families tauler registered (sans-serif and monospace generics, `fonts.primary`, `fonts.extra`, the emoji font) exist; there is no `serif`; an unregistered family alone draws nothing. A layout also cannot ask which family resolves, and cannot learn the theme's font roles (`ctx.theme` carries name, mode and colours only).

**What we do today instead.** The library never draws a font it cannot rely on: the default font is the string `ui-monospace, monospace` (`DT:charts/core.jsx:29`), where the trailing generic `monospace` is what resolves on the desktop. The layout passes its own font by name to `chartTheme(themeColor, "JetBrains Mono")` (`DT:charts/theme.jsx:10-31`, examples such as `DT:charts/examples/01-getting-started/02-line.jsx:18`). `kindOf` (`DT:charts/fonts.jsx:22-31`) falls back to monospace for any unknown family so the measure agrees with the common case.

**Evidence.**
- Layout families come from the theme `fonts` role map (`tauler-core/src/theme/mod.rs:112`, resolved by `font-<role>` in `tauler-core/src/theme/resolver.rs:159`); an unknown role passes through (`resolver.rs:323`); an arbitrary family is written `font-[JetBrains_Mono]` (`resolver.rs:329-332`).
- `ctx.theme` is exactly `{ name, mode, colors }`: `tauler-core/src/theme/mod.rs:174-183`, test at `:309-316`. There is no `fonts` in it. VERIFIED by reading.
- Registered generics: only SANS_SERIF, MONOSPACE and EMOJI (`src/render/mod.rs:332-355,395`); no SERIF.
- Missing-family behaviour in the SVG path. usvg tries the listed families and then appends serif as the default (`usvg-0.48.1/src/text/mod.rs:99-155`; `:143` logs "No match for ... font-family" and the text is dropped). I ran standalone usvg 0.48.1 with a font database that holds what tauler's `build_svg_fontdb` builds (Noto Sans registered as sans-serif, Noto Sans Mono as monospace, no serif; `usvg-probe --families`, section 9.4). Result, VERIFIED for standalone usvg and INFERRED for the vendored copy:

```
sans-serif                   -> Some(26.686)     (drawn)
monospace                    -> Some(33.0)       (drawn)
serif                        -> None             (nothing drawn)
'Noto Sans'                  -> Some(26.686)
'noto sans'                  -> None             (usvg alone is case-sensitive; takumi's css selector folds case, css_font_selector.rs:215, INFERRED to apply in tauler's path)
DoesNotExist                 -> None
DoesNotExist, sans-serif     -> Some(26.686)
DoesNotExist, monospace      -> Some(33.0)
'JetBrains Mono'             -> None             (unless registered through fonts.primary / fonts.extra)
ui-monospace, monospace      -> Some(33.0)
system-ui                    -> None
Helvetica, sans-serif        -> Some(26.686)
Helvetica                    -> None
```

So the families a figure may rely on today are `sans-serif`, `monospace`, and anything tauler registered by name; every list must end in a generic.

**Reproduce today.**
1. `cd $WORK/us && CARGO_TARGET_DIR=$WORK/us/target cargo run --offline --release -- --families /usr/share/fonts/noto/NotoSans-Regular.ttf /usr/share/fonts/noto/NotoSansMono-Regular.ttf` prints the table above (VERIFIED).
2. `grep -n "fonts: HashMap\|pub fn ctx_json" -A8 /home/kantord/repos/tauler/tauler-core/src/theme/mod.rs` shows `fonts` is in `Theme` and absent from `ctx_json` (VERIFIED).
3. A real-tauler check of the vendored copy is UNVERIFIED. To do it: in a Rust test write a layout whose `draw` appends `<text font-family="serif">Hello</text>`, run `draw_figure`, `set_picture`, rasterise as `examples/figures/mod.rs` does, and assert the bitmap has no ink (all pixels transparent). The same with `sans-serif` must have ink.

**Proposal.**
1. Register a serif generic as well (`fc-match serif`, `generic_family` as for sans-serif, `src/render/mod.rs:342`), plus cursive and fantasy mapped to the sans-serif face, so the five CSS generics always resolve to something when fontconfig has any font. Under `files_only` the generics resolve to the configured primary file only.
2. Document the contract in `components.md` next to "Text cannot be measured": "In a figure, `sans-serif` and `monospace` (and `serif`) always resolve. A named family resolves only if it is `fonts.primary`, listed in `fonts.extra`, or the system answer for a generic. A `font-family` list is tried left to right; end every list with a generic. If nothing in the list resolves the text is not drawn and a warning is logged once per figure."
3. A host function to ask: `fontResolves(family) -> { resolved: boolean, face: string | null }` (render, reconciler, Draw runtimes), implemented by the same lookup `measureText` uses (T1). Example: `fontResolves("JetBrains Mono, monospace").face === "JetBrains Mono"`.
4. Expose the theme's font roles: add `"fonts": self.fonts` to `Theme::ctx_json` (`tauler-core/src/theme/mod.rs:174-183`) so `ctx.theme.fonts.display` is available to a layout (and in the page and screenshot tool: ctx_json is the one shape for every host, `:171-173`). Today `chartTheme(themeColor, font)` needs the layout to repeat the family by hand.
5. Log: when a `draw` produced `<text>` whose families do not resolve, `tracing::warn!` once per key (cheap check: after `__tauler_draw_figure`, scan `font-family` attributes against the resolver).

**Acceptance tests.** Rust: `serif_generic_resolves_in_svg_text` (draw a figure with `font-family="serif"`; assert pixels with ink); `unknown_family_alone_logs_a_warning_and_draws_nothing` (assert log line and empty bitmap); `font_resolves_reports_registered_and_missing_families` (`fontResolves("sans-serif").resolved === true`, `fontResolves("DoesNotExist").resolved === false`, `fontResolves("DoesNotExist, monospace").face` is the monospace face); `theme_ctx_json_includes_the_font_roles` (extend `ctx_json_is_name_mode_and_colors` at `tauler-core/src/theme/mod.rs:309` with a `fonts` map and assert it round-trips); `files_only_resolves_generics_to_the_configured_file`.

**Compatibility and rollout.** Additive. Adding `fonts` to `ctx.theme` changes the shape of an object layouts read; nothing that reads `ctx.theme.colors` breaks. Registering `serif` changes what already-written layouts that name `serif` draw (from nothing to something). Docs: `components.md`, the ADR 0044 consequences section.

**Alternatives.**
- A. Document the current behaviour only. Pros: no code. Cons: the silent-nothing failure stays; libraries must end every list with a generic and cannot detect a mistake. Favours: minimal maintenance. Not recommended alone, but the documentation is needed in every case.
- B. Register all generics and add `fontResolves` plus `ctx.theme.fonts` (the Proposal). Pros: the failure mode becomes opt-in; a library can warn its own caller. Cons: new surface (`fontResolves`) and new keys in `ctx.theme`. Favours: library authors and users who pick fonts by name. Recommendation: this one, in this order: documentation, serif generic, `ctx.theme.fonts`, then `fontResolves` (the last one can wait for T1's resolver).
- C. Make the Draw runtime append `, sans-serif` to every `font-family` attribute it emits. Pros: nothing ever disappears. Cons: hides errors, silently changes the face the author asked for, and the page behaves differently (a browser has its own fallback). Favours: users who never read docs. Recommendation: no.

**Open questions.** Which face should `cursive` and `fantasy` map to? Should `files_only` hosts be allowed to resolve `serif` to the primary file, or draw nothing (an honest failure)? Is `fontResolves` wanted if T1's `measureText` already throws when nothing resolves?

---

## Group 2: Keys, caching, cost

### T3 Cheap, deterministic content keys: a pure `hash` builtin in render and Draw runtimes   [priority P1 | effort S | controversy: high]

> **Status (tauler review, 2026-10-30):** superseded by JSON-valued `D3Figure` keys (#714, #716): no `hash` global is added. Plot keys itself from a spec string (`charts/speckey.jsx`). See the status section near the top.

**Problem.** A figure must be keyed by its content: "a figure whose key is unchanged is never drawn again, and a figure that should look different gets a new key" (ADR 0044, "Why a key"). The only way for a library to know that the picture changes is to build the picture. Our `Plot` without a `key` compiles the whole scene in the layout evaluation on every Tick and hashes it. That layout evaluation is on the loop, and the same layout is evaluated again by the Draw runtime on each draw round. With a `key` the compile moves into `draw` (Draw runtime only) but then the caller must produce a key that tracks the data, and tauler gives no host hash to do it cheaply: `hash` exists only in the reconciler runtime (`Effects::Allowed`). The user-visible effect is measured below: 20 ms per Tick per 500-row plot on the loop, 160 to 200 ms at 5000 rows.

**What we do today instead.** `DT:charts/Plot.jsx:21-31`. Without `key`: `compile(props)` in the layout, key = `hash53(JSON.stringify(scene))` (`DT:charts/core.jsx:285-291`, cyrb53 in `DT:charts/scene.jsx:92`). With `key`: `Plot` forwards the key and compiles inside `draw`. The docs tell the caller to use a `key` "for windows of thousands of rows, or when a function prop captures values the scene hash would not see" (`DT:charts/Plot.jsx:18-20`, SPEC 5.11 at `DT:charts/SPEC.md:702-723`). The cost gate is `DT:charts/test/bench.js` (reference plot: Grid, Area, Line and two Axes over `rows` rows).

**Evidence.**

Tauler side.
- `hash` is a global only with `Effects::Allowed`: `src/jsx.rs:1099-1109` (`globalThis.hash = __esto_hash;` inside `if effects == Effects::Allowed`). The render and Draw runtimes are `Effects::Denied`. VERIFIED by running the real runtimes (section 9.3, scenario `globals`): both print `"hash":"undefined"`.
- What `__esto_hash` is: `optative-script-0.0.13/src/builtins.rs:139-145` `register_hash` registers `hex_sha256(&data)` (`src/engine.rs:155`), a pure function from a string to 64 hex characters. It sits in `EFFECTFUL_BUILTINS` (`builtins.rs:285-287`) only because it was grouped with `sh`, `read`, `ls`, `exists`. Registering it needs only `optative_script::builtins::register_hash(&qjs_ctx)`.
- The render runtime evaluates the layout every Tick, with "nothing survives between ticks except `globals`" (ADR 0007), and an unlimited time budget: the only interrupt handler is in `draw_figure` (`src/jsx.rs:993-1005`, `TIME_LIMIT` 5 s, `src/d3_figure/draw.rs:54`). The Draw runtime evaluates the whole layout again per request round (`src/d3_figure/draw.rs:268-269`) with no limit. The reconciler runtime evaluates it too (ADR 0034). So scene-building work in a layout body runs up to three times per Tick.
- Latency classes: a Hop of 8 ms is Negligible, 10 ms Minimal, 100 ms Slow (`CONTEXT.md:504-536`).
- Open issue: kantord/tauler#686 (a figure keyed by live data repaints its panel on each update); #681 (no D3Figure benchmark).

Our side, measured in the real tauler runtimes (VERIFIED). The probe `tauler-probe cost lib.js <rows>` loads the chart library bundle as a layout module, calls `Plot(referenceProps(rows))` (the reference plot of `DT:charts/test/bench.js`) with and without `key`, and times `JsxEvaluator::eval` 21 times in the render runtime, then runs the Draw runtime's own layout eval and `draw_figure`. Release build, this machine, two runs (the first value is the first run). All in ms, medians.

| rows | render-runtime eval per Tick, no `key` | with `key` | Draw-runtime layout eval per round, no `key` | with `key` | `draw_figure`, no `key` | `draw_figure`, with `key` |
|---|---|---|---|---|---|---|
| 50 | 3.41 / 3.87 | 0.02 / 0.03 | 3.67 / 3.98 | 0.03 / 0.05 | 1.41 / 2.01 | 5.10 / 5.97 |
| 500 | 20.88 / 20.19 | 0.02 / 0.01 | 18.51 / 18.69 | 0.03 / 0.02 | 1.25 / 1.03 | 23.24 / 17.99 |
| 5000 | 204.77 / 158.09 | 0.03 / 0.01 | 182.18 / 156.34 | 0.02 / 0.02 | 1.91 / 1.90 | 182.69 / 157.82 |

(An earlier run, before the Draw-eval column was added to the probe, gave 28.5 ms for 500 rows without a key: this machine has load noise of about 30% on these measurements, so read the orders of magnitude, not the digits.) The same plot in Node, from the repo's own bench helper (`DT:charts/test/bench.js` `median`, run through vitest, two runs; ms):

| rows | `compile` | `Plot` without key (layout eval) | `Plot` with key |
|---|---|---|---|
| 50 | 1.66 / 0.60 | 1.04 / 0.41 | 0.002 / 0.001 |
| 500 | 3.92 / 1.79 | 3.54 / 1.67 | 0.001 / 0.001 |
| 5000 | 28.45 / 15.58 | 15.36 / 14.86 | 0.001 / 0.001 |

So QuickJS in tauler is roughly 6 to 12 times slower than Node for the 500 and 5000 row plots, not the 1.9 times derived at `DT:charts/SPEC.md:1030-1034` ("derived from the table above, not re-measured in tauler"). That derived factor is wrong and the SPEC should be corrected; the measured 500-row cost of about 20 ms is above the 10 ms of a Minimal Hop. Two further results from the same probe: the key the render runtime computes is reproduced by the Draw runtime (`draw_figure(key)` succeeds with no `UnknownKey`, for the three row counts), and a figure with a `key` costs the loop nothing but moves 18 to 180 ms of compile into the Draw runtime's `draw`.

Cost of deriving a key from props instead of from the scene (alternative A below), VERIFIED:

```
$ qjs-probe keycost.js          # QuickJS 0.16, JSON.stringify(data) then hash53, 3 columns per row
rows=50   JSON.stringify(data) 0.045 ms  hash53(3236 chars)   0.370 ms
rows=500  JSON.stringify(data) 0.430 ms  hash53(32805 chars)  3.750 ms
rows=5000 JSON.stringify(data) 4.400 ms  hash53(328372 chars) 37.800 ms
$ sha-probe                      # Rust sha256, what __esto_hash computes
sha256 of 3236 bytes: 0.0014 ms   32805 bytes: 0.0144 ms   328372 bytes: 0.1434 ms
```

So the stringify costs 0.4 ms at 500 rows, and the JS hash costs ten times that, where a host hash is 0.014 ms. A key from props is 20 to 40 times cheaper than compiling (0.43 + 0.014 ms against 20 ms) and a host `hash` is what makes it cheap.

**Reproduce today.**
1. `TAULER_D3_DIR=$WORK/d3dir $WORK/tp/target/release/tauler-probe globals` prints for both runtimes `"hash":"undefined","sh":"undefined"` (VERIFIED).
2. `TAULER_D3_DIR=$WORK/d3dir $WORK/tp/target/release/tauler-probe cost $WORK/libbundle/lib.js 500` prints the two rows `no key` and `with key` (VERIFIED; build the bundle with `node $WORK/build-lib.mjs`).
3. The Node numbers: `cd $REPO && OUT=$WORK/cost.txt npx vitest run --config $WORK/vitest.scratch.config.mjs cost && cat $WORK/cost.txt` (VERIFIED). The repo's own gate passes: `npx vitest run charts/test/bench.test.jsx` gives 4 passed.
4. `$WORK/qjs/target/release/qjs-probe $WORK/keycost.js` and `cd $WORK/sha && cargo run --offline --release` for the key-cost table (VERIFIED).

**Proposal.** Make a pure `hash` available in every runtime and take hashing out of `Effects`.

```js
hash(value) -> string          // 64 lowercase hex characters, SHA-256
```
- `hash(string)`: SHA-256 of the UTF-8 bytes (identical to today's `__esto_hash`, which `sh`-using units already call).
- `hash(value)` for any other JSON-like value: SHA-256 of its canonical JSON (object keys sorted, numbers in shortest round-trip form, no whitespace). A function, `undefined` in an array, a `Symbol`, a cycle or a non-finite number throws `TypeError("hash: cannot hash <kind> at <path>")` instead of being dropped as `JSON.stringify` does; a `Date` is hashed as its ISO string. This is what protects a library from the silent case of a function prop that the key does not see.
- Deterministic across the three runtimes by construction (host Rust; floats written in the shortest round-trip form, as `serde_json` does). Cost O(size).
- Rust: in `src/jsx.rs` move `register_hash` and `globalThis.hash = __esto_hash` out of the `Effects::Allowed` block at `:1099-1109`, next to `renderTemplate` (`:1179`); implement the canonicalisation over `serde_json::Value` (tauler already has canonical JSON for the panel cache, ADR 0011 "keying on canonical JSON"). Page: expose the same function from the wasm glue (`tauler-web/js/runtime.js:110-125` shows where `wasm.taulerThemeColor` is wired) because SubtleCrypto is asynchronous. UNVERIFIED that the wasm build can take a sha2 dependency.

Library usage after the change (ours):

```js
export function Plot(props) {
  const key = props.key ?? 'plot-' + hash([props.width, props.height, props.data, props.x, props.y /* serialisable props */]);
  return <D3Figure key={key} width={props.width} height={props.height} draw={svg => drawScene(svg, compile(props).scene, 'chart' + key)} />;
}
```

Descriptors with functions (mark `render` closures, accessor props) cannot be hashed, so `Plot` would hash the serialisable inputs and require an explicit `key` when a function prop is present (it throws today's way: a message naming the prop). The loop's cost per Tick drops from 20 ms to under 1 ms at 500 rows.

**Acceptance tests.** Rust, `src/jsx.rs` tests, using `new` (render, Denied), `new_draw` and a reconciler evaluator:
- `hash_is_available_in_the_render_and_draw_runtimes`: `export default () => <div>{hash("abc")}</div>` gives `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad` in both.
- `hash_of_an_object_ignores_key_order`: `hash({a:1,b:[2,3]}) === hash({b:[2,3],a:1})`.
- `hash_distinguishes_values_that_json_stringify_conflates`: `hash([1,undefined])` throws; `hash({x:()=>1})` throws with the path `x`.
- `hash_of_a_float_is_the_same_in_every_runtime`: `hash({v:0.1+0.2})` equal in render and Draw, and equal to the Rust-computed canonical form `{"v":0.30000000000000004}`.
- `a_figure_keyed_by_hash_is_reproduced_by_the_draw_runtime`: `<D3Figure key={hash(props)} ...>`; after `eval` in both runtimes `draw_figure(key)` is `Ok` (compare `tests/` for the two-runtime pattern at `src/jsx.rs:3226-3322`).
- Library (ours): `Plot` without `key` and with a function prop throws an error whose message names the prop; `Plot` with the same serialisable props twice returns the same key; changing one data value changes the key.

**Compatibility and rollout.** Additive; `hash` in units already means the same function, so existing reconciler code is unaffected. If a layout defined its own `hash` global it keeps working (a module-scope `const hash` shadows the global). Feature detection: `typeof hash === 'function'`. Docs: `components.md` D3Figure section ("keys") and the hooks docs that list `hash`. No ADR beyond a note in ADR 0044's consequences.

**Alternatives.**
- A. A host `hash` builtin in every runtime (the Proposal). How it works: pure SHA-256 over a string or canonical JSON; the library builds its own key from its inputs. Pros: smallest change (about 10 lines), library keeps full control of what is in the key, works for any figure library; the cost measured above is 0.44 ms at 500 rows. Cons: the library must choose the key inputs and gets it wrong when a function captures state; it does not remove the need for the layout to evaluate the props (the data is already in memory). Favours: library authors, existing `key=` users. Recommendation: do this first.
- B. `D3Figure deps={[...]}` with a host-derived key. How it works: `<D3Figure deps={[data, theme]} width height draw>`; tauler computes `key = hash(deps, width, height)` itself. Pros: ergonomic, includes the size automatically (solves most of T4), one concept instead of two; errors on unhashable deps are central. Cons: a second way to name a figure beside `key`; hidden hashing cost in the host; closures that capture values not listed in `deps` render stale pictures, the same trap as React's dependency arrays, and ADR 0007 deliberately has "no dependency array". Favours: authors writing figures by hand. Recommendation: a good sugar on top of A later, if maintainers want it.
- C. A host-side keyed memo across Ticks, `memo(key, fn)`. How it works: tauler caches `fn()`'s JSON result under a key, so the library avoids recomputing `compile`. Pros: removes the compile cost even when the scene changes slowly; helps non-figure layouts. Cons: it conflicts with ADR 0007 ("nothing survives between ticks except `globals`"), needs eviction and per-runtime caches (three runtimes, three caches, or one shared cache that crosses a thread boundary), and results must be JSON. Favours: heavy statistical layouts. Recommendation: no.
- D. Status quo: the caller supplies `key=`. How it works: today. Pros: nothing to build; the key can encode exactly what the caller knows (a data version, the newest timestamp). Cons: every caller invents a key; without a host hash the key is built with JS string concatenation or a JS hash (3.75 ms at 500 rows in QuickJS), the 20 ms compile still happens for keyless use, and a wrong key shows a stale picture silently. Favours: callers with a natural version number. Recommendation: remains valid, supported by A.
- E. The host derives the key from props automatically. How it works: `D3Figure` hashes everything it is given, including `draw.toString()`. Pros: no key at all. Cons: a closure's captured values are invisible to `toString()`, so the picture can be stale; function source text differs between engines (QuickJS and the page), so the page and desktop would not agree; the cost is hidden. Favours: demos. Recommendation: no.

**Open questions.** Canonical JSON: sorted keys and shortest-float output, or "whatever `serde_json` writes"? Should `hash(value)` reject functions (our preference) or hash their source text? Does the page wasm build have room for sha2? Should the render runtime get a soft time limit as well (T6)?

---

### T4 Figure identity: size and theme in the key, or documented   [priority P1 | effort S | controversy: some]

> **Status (tauler review, 2026-10-30):** done (#711). See the status section near the top.

**Problem.** A key names one Picture "for good" (ADR 0044:27-35), and the Picture registry is keyed by the key string alone. The size is not part of the identity. If a layout draws the same key at two sizes, the Draw runtime draws it once (at the first call's size), and the bitmap kept is the largest one, scaled into the smaller box; and if two `D3Figure`s share a key but have different `draw` functions, the last registered `draw` wins for both. Theme changes are the same kind of problem (the same key under a dark and a light theme is one Picture). The effect is a figure that is blurry, the wrong shape, or drawn by the wrong closure, with no message.

**What we do today instead.** The scene hash covers the size and theme: width and height are part of the scene (clip rect, scales), and the theme colours are baked into the shapes (INFERRED for the colours; the size part is VERIFIED below), so the keyless path never collides. With a caller `key`, the caller must put width, height and theme into the key itself; this is stated in `DT:charts/Plot.jsx:18-20` and SPEC 5.11 only as "the key must change whenever the picture should".

**Evidence.**
- Requests are deduplicated by key and carry the first call's size: `src/d3_figure/requests.rs:66-80` (`if requested.insert(call.key.clone()) { plan.draw.push(DrawRequest { key, width: call.width, height: call.height }) }`).
- A key shown at two sizes keeps the largest bitmap: `src/render/picture.rs:277-290` ("Binding is by src, so one key holds one bitmap per frame. If the same key is shown at two sizes, keep the largest; takumi scales it into the smaller box, which is good enough.").
- The Draw runtime keeps one `draw` per key (`__tauler_figures` Map, `src/jsx.rs:797-800`), so the later registration replaces the earlier one.
- The theme: the Draw runtime's `ctx` is fixed at spawn and the runtime is respawned on every layout load (`src/d3_figure/draw.rs:123`, `src/app.rs:1188-1192`); issue #678 asks to verify that a theme switch redraws every figure.

Our side, run today (VERIFIED).
- In the real runtimes, `tauler-probe keys` evaluates a layout with `<D3Figure key="same" width={100} height={50} draw={circle r=1}>` and `<D3Figure key="same" width={200} height={80} draw={circle r=2}>`:

```
render runtime figure_calls: [FigureCall { key: "same", width: 100.0, height: 50.0 }, FigureCall { key: "same", width: 200.0, height: 80.0 }, ...]
draw "same" 100x50 -> Ok <svg ... viewBox="0 0 100 50" height="50" width="100" ...><circle r="2" /></svg>
draw "same" 200x80 -> Ok <svg ... viewBox="0 0 200 80" height="80" width="200" ...><circle r="2" /></svg>
```

Both requests draw the second figure's `draw` (`r="2"`), including the one asked at the first figure's size.
- Our keyless path: `compile(referenceProps(60))` has key `12d4z0no09n` at 248x110 and `8wdz0o2meq` at 300x110 (VERIFIED, `size.scratch.jsx`). With a caller key `cpu` the test harness `DT:test/tauler.js:42` (`figures.set(String(key), ...)`) holds one figure for both sizes and `drawFigure('cpu')` draws at 300x110, the last registration: the harness behaves like the real runtime in this respect.

**Reproduce today.**
1. `TAULER_D3_DIR=$WORK/d3dir $WORK/tp/target/release/tauler-probe keys` (VERIFIED; the output also contains the two UnknownKey lines of T5).
2. `cd $REPO && OUT=$WORK/size.txt npx vitest run --config $WORK/vitest.scratch.config.mjs size && cat $WORK/size.txt` gives:
```
scene key at 248x110: 12d4z0no09n   at 300x110: 8wdz0o2meq   at 248x110 again: 12d4z0no09n
figure keys registered: ["cpu"]
harness drawFigure("cpu") size: <svg font-family="sans-serif" viewBox="0 0 300 110" height="110" width="300" ...>
no key, two sizes -> figure keys: ["12d4z0no09n","8wdz0o2meq"]
```

**Proposal.** Two parts, cheapest first.
1. Document the rule: "A key is the whole identity of a Picture. The same key at two sizes, with two different `draw` functions, or under two themes is one Picture; put the size and anything the picture depends on in the key." Add the example from `components.md` with `key={`cpu-${w}x${h}-${theme.name}`}`.
2. Detect the collision in the host and log it: in `figures_in` (`src/jsx.rs:60-85`) when two `FigureCall`s in one tree share a key but not a size, `tracing::warn!(key, sizes, "the same D3Figure key is used at two sizes; one Picture is drawn")`. Optionally (breaking) make the size part of the Picture name: `tauler:picture/<key>@<w>x<h>`, so the same key at two sizes is two Pictures. The 1/64-style tolerance is not needed: sizes are numbers the layout wrote.

**Acceptance tests.** `jsx.rs` tests: `two_figures_with_the_same_key_and_different_sizes_log_a_warning` (use `tracing_test::traced_test` as `src/hit_test.rs:372` does; assert the log contains the key); `figure_calls_lists_both_sizes` (already true: `figure_calls.len() == 2` for the layout above); if the size becomes part of the name: `the_same_key_at_two_sizes_draws_twice` (two `DrawRequest`s, one per size) and `a_picture_is_never_stretched` (bind picks the Picture named with the box's size).

**Compatibility and rollout.** The documentation and the warning are non-breaking. Making the size part of the name changes `src` strings and the Picture registry keys (`src/render/picture.rs`) and the e2e fixture expectations (`tauler-e2e/tests/scenarios.rs:639-801`); breaking for anything that names Pictures by hand (nothing public does). Docs: `components.md` D3Figure; ADR 0044 consequences.

**Alternatives.**
- A. Document only (step 1). Pros: free. Cons: silent failure remains. Favours: maintainers short of time. Acceptable as the minimum.
- B. Document plus a warning (steps 1 and 2 without renaming). Pros: finds the bug at the first render; no behaviour change. Cons: still one Picture. Favours: everybody. Recommendation: this.
- C. Size (and theme name) become part of the Picture identity. Pros: correct by construction; matches the page, where each Mount draws at its own size. Cons: more Pictures and rasters when a layout shows the same key at two sizes on purpose (memory: ADR 0044 counts a Picture per key); a theme name in the identity needs the ctx in `Requests`; breaking. Favours: authors who reuse a figure at several sizes. Recommendation: later, if the warning shows people hit it.

**Open questions.** Is "two sizes, one key" ever intended (a thumbnail of the same figure)? If so, should the larger win as now? Should the theme name be in the identity (#678)?

---

### T5 Make UnknownKey and Draw failures visible   [priority P1 | effort S | controversy: some]

> **Status (tauler review, 2026-10-30):** done in the form of snapshot eval (#713); remaining unknown keys log at warn level. See the status section near the top.

**Problem.** When the Draw runtime cannot find the requested key in its own latest evaluation, the figure is not drawn, nothing is sent, and the event is logged at DEBUG. That is the right call when the data has legitimately moved on (a figure keyed by live data) and the wrong call when the layout is non-deterministic (a key from `Date.now()` or `Math.random()`), where the figure is never drawn and the user sees a permanent blank or stale picture with no warning at any default log level.

**What we do today instead.** We forbid it by construction: keys are hashes of the scene (a pure function of props) and `Plot`'s header says "Never call `new Date()` in the layout; take the time from a stream and pass it in" (`DT:charts/Plot.jsx:9-12`). We verify the keys with golden values (`DT:charts/test/golden-keys.json`, `DT:charts/test/gaps/state-determinism.test.jsx:90-111`), but only in Node.

**Evidence.**
- `DrawError::UnknownKey` is "no <D3Figure> with key {0:?} in the latest eval" (`src/d3_figure/draw.rs:86-88`) and is logged with `tracing::debug!` at `draw.rs:307-308`, in a branch whose comment says it is "Expected, not a fault: ... a figure keyed by live data has usually moved on" (`draw.rs:303-306`). Every other `DrawError` is `warn!` (`draw.rs:310-312`).
- The case where it is a fault: `src/d3_figure/mod.rs:77-80` ("nondeterministic module-scope code can give the Draw runtime a different tree. A key the Draw runtime's latest eval does not have is logged and not drawn."). A throwing `draw` keeps the previous Picture and warns (`mod.rs:58-59`). In the browser a key whose draw threw is not retried (`tauler-web/js/runtime.js:144`).
- Real runtime, VERIFIED (`tauler-probe keys`): a layout with keys `"rand" + Math.random()` and `"now" + Date.now()`:

```
draw "rand0.34112603493523475" 10x10 -> Err(UnknownKey("rand0.34112603493523475")) "no <D3Figure> with key "rand0.34112603493523475" in the latest eval"
draw "now1793279755245" 10x10 -> Err(UnknownKey("now1793279755245")) "no <D3Figure> with key "now1793279755245" in the latest eval"
```
(the render runtime's key never exists in the Draw runtime's evaluation). With the bar, the only trace of this is a DEBUG line that default filters hide.

**Reproduce today.** `TAULER_D3_DIR=$WORK/d3dir $WORK/tp/target/release/tauler-probe keys` (VERIFIED). To see the log level: `grep -n "was not drawn" /home/kantord/repos/tauler/src/d3_figure/draw.rs` shows `debug!` at `:308` and `warn!` at `:311`. Seeing it in the bar needs the bar; not done (never run the bare `tauler` binary).

**Proposal.**
1. Distinguish "moved on" from "cannot be reproduced". The Draw runtime already evaluates "against the streams as they are now"; record in each `DrawRequest` a fingerprint of the stream values at request time. On `UnknownKey`: if the Draw runtime's current stream fingerprint equals the request's, the layout produced a different key from the same inputs: that is a determinism fault, `warn!` once per key with the text "the Draw runtime's evaluation produced no figure with this key from the same stream values: the key must be a pure function of the layout's inputs (no Date.now(), Math.random(), or module state)". If the fingerprint changed, keep the `debug!`.
2. Count them: add `d3_figure_unknown_key` and `d3_figure_draw_failed` counters to the existing Trace report (`src/trace.rs`, `tauler::trace` target at DEBUG) and to whatever `status` output the bar has.
3. Optional strict mode: a config switch `d3_figure: strict` (or an env var) that turns the fault above into a layout error shown the way a layout error is shown (ADR 0033 keeps the previous layout on screen), for use in development.
4. Page: log to `console.warn` when a draw throws and is not retried (`runtime.js:144`).

**Acceptance tests.** `an_unknown_key_with_unchanged_streams_warns` (draw runtime evaluated twice with the same stream map; request a key that is absent; `traced_test` asserts a WARN containing the key); `an_unknown_key_after_a_stream_change_stays_at_debug` (change the stream map between request and draw; assert no WARN); `a_key_from_math_random_is_reported` (the layout in the probe above; assert WARN); `strict_mode_turns_the_fault_into_a_layout_error`. The existing tests at `src/jsx.rs:3226-3322` already assert the `UnknownKey` value; extend them.

**Compatibility and rollout.** Logging levels are not an API; the strict mode is opt-in. Docs: `components.md` D3Figure ("a key must be a pure function of the layout's inputs; what you see if it is not").

**Alternatives.**
- A. Raise the existing log to `info` or `warn` always. Pros: trivial. Cons: logs on every legitimate "moved on" case (the comment says every bar start logged one for the placeholder data); noise. Favours: nobody for long.
- B. Fingerprinted classification, counters, optional strict mode (the Proposal). Pros: quiet in normal use, loud for the fault. Cons: needs a stream fingerprint on `DrawRequest` (new field; the loop must be able to compute it: INFERRED that the stream map is available, `draw.rs:7-9,268`). Favours: layout authors. Recommendation: this.
- C. A dev-mode overlay (a red badge on a figure that the Draw runtime could not reproduce). Pros: visible without logs. Cons: needs a rendering path for the overlay and a notion of dev mode. Recommendation: later.

**Open questions.** Is the stream fingerprint cheap enough to attach to each request? Is there a notion of "dev mode" in tauler today, or is `RUST_LOG` the only one?

---

### T6 Layout-evaluation budget and visibility   [priority P2 | effort M | controversy: some]

> **Status (tauler review, 2026-10-30):** the eval timer is dropped. See the status section near the top.

**Problem.** The cost of a layout evaluation is the author's business and nothing shows it. The render runtime has no time limit (only `draw` has: 5 s), a slow layout is "a Lagged Tick" (ADR 0044:15-16), and PERF-AUDIT has no D3Figure numbers (issue #681 is open). Section T3 measured a library plot at 20 ms per Tick on the loop at 500 rows: twice the 10 ms of a Minimal Hop, and it is paid again in the Draw runtime. The author can only find this with their own timers.

**What we do today instead.** Our cost gate in CI: `DT:charts/test/bench.js` times the reference plot and any new stage alternately and gates a new stage at 25% of the reference (`BUDGET`, `bench.js:6`; `DT:charts/SPEC.md:1026-1036`). It runs in Node, so it cannot see the 6 to 12 times slower QuickJS cost (T3).

**Evidence.**
- No time limit for layout eval: the only interrupt handler is in `draw_figure` (`src/jsx.rs:993-1005`); `TIME_LIMIT = 5 s` (`src/d3_figure/draw.rs:54`). INFERRED for the render runtime (no handler found).
- Budgets: Negligible 8 ms per Hop, Minimal 10 ms, Slow 100 ms, Non-interactive 400 ms, Lagged over 1200 ms stacked (`CONTEXT.md:504-536`); layout eval "about 2 ms for a few hundred nodes" (ADR 0007), bench `eval_only` 1.62 ms (PERF-AUDIT.md:50-56) on a synthetic fixture of four panels.
- Trace infrastructure exists: `src/trace.rs` records one `hop=<ms>ms` per mark when `tauler::trace` is enabled at DEBUG (`trace.rs:30-37`). No mark is per figure.
- Measured here (T3, VERIFIED): 500 rows, no key: 20 ms in the render runtime and 18.5 ms again in the Draw runtime; with a key: 0.02 ms and 18 to 23 ms in `draw`.

**Reproduce today.** The T3 probe (`tauler-probe cost lib.js 500`) is the reproduction. A tauler-side bench does not exist: `ls /home/kantord/repos/tauler/benches` shows `fixtures` and `pipeline.rs`, and `grep -rni 'd3\|figure' /home/kantord/repos/tauler/benches` finds nothing (VERIFIED).

**Proposal.**
1. A D3Figure benchmark in `benches/pipeline.rs` (closes #681): a layout with one `D3Figure` whose `draw` builds a 500-row line chart with d3, measuring render eval, Draw eval, `draw_figure`, rasterisation. Use the chart bundle from our T3 probe as a fixture if the maintainers want a library-shaped load. The probe's `cost` scenario is a ready skeleton.
2. A per-runtime eval timer in the Trace report: `eval_render=<ms> eval_draw=<ms>` marks, and a `figure_draw=<ms>` mark per key, at DEBUG on `tauler::trace` (no cost when off, `trace.rs:30-37`).
3. A soft time limit for layout evaluation: reuse the interrupt-handler mechanism of `draw_figure` for render and Draw evals with a limit configurable and generous by default (for example 250 ms, warn above 50 ms): on overrun, keep the previous tree, log `warn!("layout eval took N ms")` naming the Hop class. Off by default for the first release.
4. Document the budget in `components.md`: what costs what in a layout (a table with the numbers from step 1) and the advice to build heavy things inside `draw`.

**Acceptance tests.** Bench: `d3_figure_eval_and_draw` exists and prints the four timings. Rust: `a_layout_that_spins_is_interrupted_after_the_soft_limit` (a layout with `while(true){}`, limit 50 ms; the evaluation returns an `Err(JsError)` and the previous tree stays); `the_trace_report_names_the_slow_figure` (`traced_test` with the `tauler::trace` target enabled; assert `figure_draw=` appears).

**Compatibility and rollout.** Benchmark and trace marks are internal. The soft limit is behaviour: default off or high, documented in ADR 0007's consequences.

**Alternatives.**
- A. Visibility only: benchmark, trace marks, docs. Pros: no behaviour change. Cons: a runaway layout still blocks the loop. Favours: the loop's owners. Recommendation: step 1 to 2 and 4 now.
- B. Add the soft limit as well. Pros: protects the bar from a bad layout; mirrors the Draw limit. Cons: a limit has no right value (our 5000-row plot takes 160 to 200 ms legitimately in the layout path), partial evaluation is unsafe to keep, and the previous-tree fallback hides the cause. Favours: users of third-party packages. Recommendation: later, warn-only first.
- C. Leave it to authors (status quo). Pros: no work. Cons: measured pain; every library re-invents timing. Not recommended.

**Open questions.** Where should the per-figure time be attributed (the time between two D3Figure calls is not the figure's)? What hop class should a layout eval claim?

---

## Group 3: Determinism and the language runtime

### T7 A determinism contract for render, Draw and page runtimes   [priority P1 | effort M | controversy: high]

> **Status (tauler review, 2026-10-30):** the mechanism is snapshot eval (#713); only render and Draw must agree on keys, and they share one engine. See the status section near the top.

**Problem.** A key is only useful if the render runtime and the Draw runtime compute the same one, and a picture should be the same whatever the machine. The language runtime has several sources of difference that tauler neither documents nor tests: the process time zone (QuickJS `Date`), `Intl` (absent in QuickJS, present in the page), `Math` functions (host libm in QuickJS, V8's own in the page), `Math.random` and `Date.now` (different values in each runtime), and float formatting. The user-visible effects are: a time label that differs between the bar and the page, a figure that never draws (T5), and a golden test that passes on one machine.

**What we do today instead.** Our library avoids every one of them by design: time scales are UTC (`d3.scaleUtc`, `utcFormat`; `DT:charts/scales.jsx:162`, `DT:charts/ticks.jsx:26-28`, `DT:charts/domains.jsx:22`, `DT:charts/legend.jsx:14`); the scene is rounded to 2 decimals before it is hashed (`DT:charts/scene.jsx:103-106`); no `Date.now()` or `Math.random()` (`DT:charts/Plot.jsx:9-12`); the repo's vitest config forces `TZ=UTC` (`DT:vitest.config.js:4-5`), which hides TZ problems from our own tests. Three golden keys (`DT:charts/test/golden-keys.json`) for a rounding-boundary scene, a trig scene and a kde scene guard the rest; tauler's side of that test is "an explicit follow-up" (`DT:charts/SPEC.md:721-723`).

**Evidence.**

Tauler side.
- Engines: desktop render, reconciler and Draw runtimes are all QuickJS (quickjs-ng 0.16 via rquickjs 0.14.0; `quickjs.h` `QJS_VERSION_MINOR 16`) in one process; the page uses the browser's engine (ADR 0027: "a layout file can behave differently in each").
- Time zone: QuickJS reads it through libc `localtime_r` (`rquickjs-sys quickjs/quickjs.c:49093-49129`); tauler sets no `TZ` (grep none). The page uses the browser's zone.
- `Intl`: not defined in QuickJS.
- `Math`: QuickJS calls host libm (`quickjs.c:49019` `js_math_sin(d){return sin(d);}`, table `:49047-49051`); V8 uses its own ieee754 port. Math.round is exact (`:48641-48660`).
- No float-determinism test or doc exists in tauler (grep `ulp|determin` finds nothing relevant); ADR 0028 gates geometry on a pinned browser only, never pixels.
- Page: each Mount keeps its own key cache (`tauler-web/js/runtime.js:59-230`), so desktop and page never need to agree on a key, only each of its own runtimes.

Our side, run today (all VERIFIED unless marked).

(a) QuickJS in the process follows the environment's TZ; the page and Node do too; `Intl` is absent. The QuickJS used by tauler (the bare engine, `qjs-probe probe.js`):

```
TZ=UTC           typeof Intl=undefined  tzoffset(2026-10-24)=0     getHours of 12:00Z=12   local string=Sat Oct 24 2026 12:00:00 GMT+0000
TZ=America/New_York                     tzoffset=240               getHours=8              Sat Oct 24 2026 08:00:00 GMT-0400
TZ=Asia/Kolkata                         tzoffset=-330              getHours=17             Sat Oct 24 2026 17:30:00 GMT+0530
Node (TZ=Asia/Kolkata): typeof Intl=object, getHours=17, string has a trailing "(India Standard Time)"
```
and in the real tauler render runtime (`tauler-probe env`): `TZ=UTC` gives `"hours":12,"offset":0`; `TZ=Asia/Kolkata` gives `"hours":17,"offset":-330`; both print `"intl":"undefined","d3":"undefined","window":"undefined"`.

(b) The scene key under two time zones, with the existing test as the model. `DT:charts/test/gaps/state-determinism.test.jsx:90-111` computes keys in Node under the repo config (TZ forced to UTC). Run the same kind of scene under three TZ values with the TZ-free config (`tz.scratch.jsx`, section 9.2; labels from epoch seconds, as a stream line would carry them):

```
TZ=UTC               library axis key=12d4z0no09n  timeFormat label=14:00 key=1wb1nf5v0i5  utcFormat label=14:00 key=1wb1nf5v0i5
TZ=America/New_York  library axis key=12d4z0no09n  timeFormat label=10:00 key=1l7aprvkyti  utcFormat label=14:00 key=1wb1nf5v0i5
TZ=Asia/Kolkata      library axis key=12d4z0no09n  timeFormat label=19:30 key=24mcuck1ig6  utcFormat label=14:00 key=1wb1nf5v0i5
```
Our library's own time axis (UTC) has the same key in all three; a layout that formats with `d3.timeFormat` (the form tauler's own docs use in the D3Figure example: `new Date(d.t*1000)` with `d3.scaleTime`, `components.md` around line 216) gets a different key and a different picture per time zone. Within one tauler process the three QuickJS runtimes share the zone, so the render and Draw keys agree; the bar and the page do not.

(c) Math differs between QuickJS (glibc 2.44) and V8 in the last bit (`qjs-probe` against `node`, the 15 functions of `probe.js`, 2000 inputs each; `diff` of the two outputs):

```
Math.cos(0.1)         QuickJS 0.9950041652780258    Node 0.9950041652780257
Math.exp(0.5*1.001237) QuickJS 1.6497413202238536   Node 1.6497413202238538
Math.sinh at one input QuickJS 0.5217928418681824   Node 0.5217928418681825
5 of the 15 functions differ on these inputs (cos, exp, sinh in individual values; atan2 and atan in the sum over 2000 inputs); sin, tan, log, pow, sqrt, cbrt, tanh, expm1, log1p, asin are identical
toFixed, Math.round, number-to-string on 5 tricky values: identical
```
The same values come out of Python's glibc (`math.cos(0.1) = 0.9950041652780258`), so the QuickJS result is the glibc result and V8 is the outlier. Real runtime, same value: `tauler-probe env` prints `"cos":0.9950041652780258` (VERIFIED).

(d) Despite (c), the three golden keys reproduce in real tauler: `tauler-probe golden libbundle/lib.js` evaluates the three scenes of `state-determinism.test.jsx` (copied, `lib-entry.jsx`) inside the real render runtime and the real Draw runtime:

```
render runtime: {"rounding-boundary":"9a9ahkdnjl","trig-arc":"x3t9raw9bm","kde-line":"1j6f6fq09yx"}
draw runtime:   {"rounding-boundary":"9a9ahkdnjl","trig-arc":"x3t9raw9bm","kde-line":"1j6f6fq09yx"}
```
These equal `DT:charts/test/golden-keys.json` exactly, and the same bundle in bare QuickJS (`golden-entry.jsx` under `qjs-probe`) gives the same three keys. So: V8 and glibc disagree in the last bit, the scene rounding to 2 decimals absorbed it for these three scenes, and the keys agree across Node, bare QuickJS, and tauler's two runtimes. That is evidence for "round before you hash"; it is not a proof (a value on a rounding boundary can flip, which is why the first golden scene sits on one).

(e) `Math.random` and `Date.now` differ between the render and the Draw runtime: T5's output (keys `rand0.341...` and `now1793279755245` unknown to the Draw runtime). Not a surprise, but it is the one real fault.

**Reproduce today.**
1. `for tz in UTC America/New_York Asia/Kolkata; do TZ=$tz $WORK/qjs/target/release/qjs-probe $WORK/probe.js | head -6; done` (VERIFIED).
2. `TZ=Asia/Kolkata TAULER_D3_DIR=$WORK/d3dir $WORK/tp/target/release/tauler-probe env` (VERIFIED; the output also shows the T8 reshaping).
3. The three-zone key table: `for tz in UTC America/New_York Asia/Kolkata; do TZ=$tz OUT=$WORK/tz.txt npx vitest run --config $WORK/vitest.scratch.config.mjs tz; done; cat $WORK/tz.txt` from `$REPO` (VERIFIED).
4. The libm differences (VERIFIED: the diff shows exactly the five lines cos, exp, atan2, sinh, atan; the first six lines of `probe.js` output are the Date/Intl lines and are cut):
```sh
$WORK/qjs/target/release/qjs-probe $WORK/probe.js | tail -n +7 > $WORK/q.txt
node -e "$(sed 's/^(function/console.log((function/; $ s/$/)/' $WORK/probe.js)" | tail -n +7 > $WORK/n.txt
diff $WORK/q.txt $WORK/n.txt
node -p "Math.cos(0.1)"; echo 'String(Math.cos(0.1))' > $WORK/c.js; $WORK/qjs/target/release/qjs-probe $WORK/c.js    # node prints 0.9950041652780257, QuickJS 0.9950041652780258
```
5. The golden keys in the real runtimes: `TAULER_D3_DIR=$WORK/d3dir $WORK/tp/target/release/tauler-probe golden $WORK/libbundle/lib.js` (VERIFIED). In bare QuickJS (VERIFIED): `node $WORK/build.mjs && (cat $WORK/bundle/golden.js; echo; echo "__result") > $WORK/bundle/run.js && $WORK/qjs/target/release/qjs-probe $WORK/bundle/run.js`, which prints `{"rounding-boundary":"9a9ahkdnjl","trig-arc":"x3t9raw9bm","kde-line":"1j6f6fq09yx"}`.

**Proposal.** A written contract, a conformance fixture, and one runtime change.

Contract (to document in `components.md` and an ADR). Within one tauler process, the render, reconciler and Draw runtimes are required to produce identical results for any layout that is a pure function of `ctx`, stream values and `globals`. Specifically: (1) all three share the process time zone; (2) all three use the same libm; (3) `Math.random()` and `Date.now()` are **not** pure and a layout that lets them reach a key or a tree is outside the contract; (4) between the bar and the page nothing is promised except geometry (ADR 0028); (5) `Intl` is absent on the desktop, so layouts that need formatting use d3-format and d3-time-format with the UTC variants; (6) a scene or key that must also match the page rounds floats first (2 decimals is what our library does).

Runtime change (small): seed `Math.random` identically at the start of each evaluation in all three runtimes (a fixed 64-bit state, xorshift128+ written as a JS prelude or QuickJS's own seed setter), so a layout using `Math.random()` is a pure function of call order and the Draw runtime reproduces the render runtime's keys. `Date.now()`: see T16.

Conformance fixture shipped in tauler (`tauler-e2e/fixtures/determinism/layout.op.mdx` or a Rust test): a layout that prints, as JSON, `typeof Intl`, `typeof d3`, `new Date(Date.UTC(2026,9,24,12)).getHours()`, a fixed list of `Math` results, `toFixed`, `Math.round` and number-to-string cases, and the three golden keys of `DT:charts/test/golden-keys.json` (file given by T13).

**Acceptance tests.** Rust (`src/jsx.rs`): `the_three_runtimes_agree_on_the_time_zone_and_math` (eval the probe layout of section 9.3 scenario `env` in render, reconciler and Draw runtimes with `TZ=Asia/Kolkata`; assert the three JSON strings are equal and `hours == 17`); `intl_is_undefined_on_the_desktop` (assert `typeof Intl === "undefined"`; this pins the documentation); `math_random_is_reproduced_by_the_draw_runtime` (after seeding, a figure keyed by `"r" + Math.random()` is drawn, not `UnknownKey`); `golden_keys_are_the_same_in_render_and_draw` (compare the two outputs above with the checked-in `golden-keys.json`, T13). Docs: a page "Determinism" that lists the six rules.

**Compatibility and rollout.** The contract and the fixture are additive. Seeding `Math.random` changes what a layout that used it for visual jitter shows (the same jitter every Tick instead of a new one); document as a feature. Feature detection: none needed.

**Alternatives.**
- A. Host guarantees: set `TZ=UTC` for the process and replace `Math` with an fdlibm port, so the desktop equals V8 bit for bit. Pros: the strongest promise; the bar and the page could agree on keys. Cons: setting `TZ` in tauler's environment is inherited by every stream subprocess the bar spawns (`date` in a stream script would change meaning: breaking and surprising) unless the zone is applied to `Date` inside the engine, which needs a patched QuickJS or a `Date` shim for local-time methods (`getHours`, `toString`, ...); an fdlibm shim costs time in every `Math` call and is only needed for cross-engine key equality that nothing requires today (each engine keys its own cache: `runtime.js:59-230`). Favours: someone who wants bit-identical pages. Recommendation: no.
- B. Contract is documented caveats plus consumers round (status quo, formalised). How it works: the six rules above, a conformance fixture, the `Math.random` seed. Pros: cheap, and the VERIFIED evidence says rounding to 2 decimals is enough for the cases we tried; it matches what the bar already does. Cons: it relies on every library rounding; no guarantee for a rounding-boundary value across engines. Favours: library authors who are careful. Recommendation: this one.
- C. A host `__tauler_round`/canonical-JSON helper (`canonical(value, { digits })`). How it works: the host rounds floats by exact decimal expansion in Rust and returns canonical JSON; used with T3's `hash`. Pros: removes engine float formatting from the key entirely, in one tested place. Cons: one more API; a boundary value is still decided by the float computed in JS before it is passed in. Favours: libraries that hash scenes. Recommendation: fold into T3's `hash(value, { digits })` if the maintainers want it.

**Open questions.** Is it acceptable to document the time zone as "the process's" rather than UTC? Does the maintainer want `Math.random` seeded, or removed? Is a conformance fixture under `tauler-e2e` or in the unit tests?

---

### T8 The JSX reshaping rule (objects with `type` and `props` are flattened)   [priority P2 | effort S | controversy: some (breaking)]

**Problem.** The factory `h` and the whole-tree safety net reshape any object that has both an own `type` key and an own `props` key into a layout node (`{type, ...props, children}`), whether or not it came from JSX. A library that returns descriptors or data from a component, or a user whose stream rows happen to have `type` and `props` fields, gets its object silently rewritten: other keys vanish, `props` is spread. The effect is a wrong layout or lost data with no error.

**What we do today instead.** The library never uses `type` and `props` together: marks use `mark` (`$: 'mark', mark: name, ..., props`), pieces use `{ $: kind, props }` (`DT:charts/core.jsx:38-47`, comment at `:38-39`; SPEC 5.4 says "The `$` guard keeps tauler's JSX factory from reshaping the object", `DT:charts/SPEC.md:424-426`, "an acceptance test covers it"). A user-supplied `Scale` prop `type="log"` is never an object with a top-level `type` and `props`, so it passes.

**Evidence.**

Tauler side.
- JS: `__tauler_flatten_node` (`tauler-core/src/globals.rs:21-28`): returns `v` unchanged unless it is a non-null non-array object with both `'type' in v` and `'props' in v`; then returns `{ type: v.type, ...for-in props..., children: 'children' in v ? v.children : [] }`. `h` applies it to the return of every call, including the return value of a function component: `src/jsx.rs:1121` (`globalThis.h = (type, props, ...children) => __tauler_flatten_node(__esto_h(...))`). The browser runs the same source (`tauler-web/js/runtime.js:118-125`, "byte for byte what QuickJS is given").
- Rust: `flatten_passthrough` (`tauler-core/src/flatten.rs:23-60`), documented "the rule is global — any node given a `type` prop becomes that type instead" (`flatten.rs:19-22`), run over the whole final tree at the end of every eval, `src/jsx.rs:1358`. It treats any object, at any depth, with both keys as a node, and recurses into arrays and the values of ordinary objects.
- It is deliberate for one case: `<surface type="wallpaper">` must equal `<wallpaper>` (`flatten.rs:19-22`).

Our side, run today (VERIFIED).
(a) Through our harness `h` (`DT:test/tauler.js:20-36`, a copy of the JS rule). `flatten.scratch.jsx`, section 9.2:

```
A  h(Row) returns the row object => {"type":"deploy","env":"prod","n":3,"children":[]}
B  same row, extra key `at` survives? => false
C  same data under other key names => {"kind":"deploy","attrs":{"env":"prod","n":3}}
D  <div type="wallpaper"> (prop `type` replaces tag) => {"type":"wallpaper","children":[]}
E  a row as a prop value of a string tag (JS side only) => {"type":"div","data":{"type":"deploy","props":{"env":"prod","n":3},"at":17},"children":[]}
F  array of rows returned from a component => [{"type":"deploy","props":{"env":"prod","n":3},"at":17}, ...]   (untouched by the JS rule)
```
where `row = { type: 'deploy', props: { env: 'prod', n: 3 }, at: 17 }`. A row that a component returns is reshaped and its key `at` is lost (A, B).
(b) In the real runtime (`tauler-probe env`, the layout returns `<div data={row}><Row/></div>`):

```
{"type":"div", ..., "data":{"type":"deploy","env":"prod","children":[]}, "children":[{"type":"deploy","env":"prod","children":[]}]}
```
Both the returned row and the row passed as a plain prop value are rewritten (the probe's row there is `{type:"deploy", props:{env:"prod"}, at:17}`; `at` is gone). Case E, left alone by the JS rule, is rewritten by the Rust whole-tree pass.
(c) The Rust pass itself, called directly (`flatten-probe`, the real `tauler_core::flatten::flatten_passthrough`):

```
in:  {"type":"div","data":ROW,"rows":[ROW,ROW],"deep":{"inner":{"x":ROW}},"children":[]}    ROW = {"type":"deploy","props":{"env":"prod","n":3},"at":17}
out: {"children":[],"data":{"children":[],"env":"prod","n":3,"type":"deploy"},"deep":{"inner":{"x":{"children":[],"env":"prod","n":3,"type":"deploy"}}},"rows":[{...same...},{...same...}],"type":"div"}
```
At any depth, in arrays and nested objects, and the key `at` is dropped.

**Reproduce today.**
1. `cd $REPO && OUT=$WORK/fl.txt npx vitest run --config $WORK/vitest.scratch.config.mjs flatten && cat $WORK/fl.txt` (VERIFIED, the six lines above).
2. `TAULER_D3_DIR=$WORK/d3dir $WORK/tp/target/release/tauler-probe env` (VERIFIED).
3. `cd $WORK/fl && CARGO_TARGET_DIR=$WORK/fl/target cargo run --offline --release` (VERIFIED, depends on `tauler-core` by path with default features off; no network).
4. Read: `sed -n 15,28p /home/kantord/repos/tauler/tauler-core/src/globals.rs` and `sed -n 19,60p /home/kantord/repos/tauler/tauler-core/src/flatten.rs`.

**Proposal.** Reshape only what `h` created.
- In `__esto_h` / `h` (`src/jsx.rs:1121`, shared source `tauler-core/src/globals.rs`), record the node objects it builds in a `WeakSet` (or tag them with a non-enumerable property) and make `__tauler_flatten_node` check `nodes.has(v)` instead of "has `type` and `props`". `flatten_passthrough` keeps its role for nodes that reach the tree without passing through `h`: have it act only on objects that carry the marker (`"$$tauler_node": true`, stripped by the final pass) rather than on shape.
- Keep the `type` prop override for `h`-built nodes: `<surface type="wallpaper">` still works because that node was created by `h`.
- The only thing that stops working is an object literal written by hand in the layout as `{ type: 'div', props: {...}, children: [...] }` and returned as a node. A search of the TAULER tree for hand-built nodes (`grep -rn "props:" docs/src examples tests tauler-e2e src tauler-web/js tauler-core/src` filtered for `type`) found none (VERIFIED for those directories; layouts in the wild are INFERRED to follow the docs).

**Acceptance tests.** JS/Rust: `a_data_object_with_type_and_props_is_left_alone` (`export default () => <div>{JSON.stringify(row)}</div>` and a component returning `row` inside an array; assert the tree contains the row unchanged, including `at`); `a_node_built_by_h_is_still_flat` (`<div class="x">a</div>` is `{type:"div", class:"x", children:["a"]}`); `the_type_prop_still_overrides_the_tag` (`h('div',{type:'wallpaper'})` is `{type:'wallpaper', children:[]}`); `a_hand_written_node_literal_is_not_reshaped` (documents the break); `flatten_passthrough_leaves_unmarked_objects_alone` (the Rust unit test, reusing the `ROW` of the probe); the page runs the same tests in `docs/tests`. Library (ours): once available, add a vitest test that `defineMark` descriptors survive a real-shape factory, and drop the `$` guard comment.

**Compatibility and rollout.** Breaking only for hand-built `{type, props}` literals. Roll out in two steps: first a `warn!` when `flatten_passthrough` rewrites an object that did not come from `h` (so users learn); then the change. Docs: `components.md` (a short "what is a node" section), `flatten.rs` module doc, ADR 0027 consequences.

**Alternatives.**
- A. Reshape only objects created by `h` (the Proposal, registry form). Pros: data objects are safe by construction, the rule is local to `h`, no new key names; Cons: needs a registry that survives the JSON boundary (so the Rust pass must either read a marker key or be removed for QuickJS), small cost per node (a WeakSet insert). Favours: libraries that pass descriptors, users with rows named `type`. Recommendation: this.
- B. A Symbol brand. How it works: `h` sets `node[Symbol.for('tauler.node')] = true`; the reshape checks it. Pros: no marker key in the data. Cons: `JSON.stringify` drops symbols, so the brand is lost before the Rust pass, which then must not reshape at all; the page and the desktop both need it. Equivalent to A where the JS pass is complete. Favours: purists. Recommendation: acceptable variant of A.
- C. Reserve the key names and document them. How it works: say that an object with `type` and `props` is reserved. Pros: zero code. Cons: a data row from a stream can have those names (any JSON message format with `type`/`props`); the failure is silent, and `at` is lost. Favours: the status quo. Recommendation: only as a stopgap; document it today regardless.
- D. Status quo. Pros: no change; works for the long-hand `<surface type=...>` and any code that relies on reshaping by shape. Cons: our workaround (a `mark` key and a `$` discriminator) stays in every library. Recommendation: no.

**Open questions.** Does any layout in the wild build nodes by hand? Should the final Rust pass be kept as an assertion in debug builds? Is the page's flatten source really the same bytes (ADR 0027 says so; UNVERIFIED that the page also runs the Rust pass)?

---

---

# Part 3: Requests T9 to T18, and Appendices A to F

Conventions: paths without a prefix are relative to the tauler repo (`/home/kantord/repos/tauler`, HEAD `7babd12b3e39b32d0ffdc753e476dee203936b06`); `DT:` is `/home/kantord/repos/dotfiles-tauler` (HEAD `a4ca7e21b752b0487d20e1ab2bb09c26e2c01991`). Node v24.7.0, pnpm 12.15.0. VERIFIED = read in source or run by the writer; INFERRED = reasoned from code shape, not read or run; UNVERIFIED = a step on the tauler side that was not run. All repro scripts named below live in `/tmp/claude-1000/-home-kantord-repos-dotfiles-tauler/f89e31a1-dc56-4816-ace3-b5eae94778dd/scratchpad/` (called `$SP` below) and wrote nothing into either repo.

---

## Group 4: Modules and packages

### T9 More pinned third-party modules for D3Figure (d3-hexbin, d3-sankey)   [priority P2 | effort M | controversy: high]

> **Status (tauler review, 2026-10-30):** hexbin and flow stay in the library: an `@gh` package would not load on the page. See the status section near the top.

**Problem.** Layout code, packages and `draw` can import only `"d3"` (7.9.0, 578 names) as a third-party module. `d3-hexbin` and `d3-sankey` are separate npm packages, not in the d3 bundle, so no layout can use them. Our library therefore ships its own hexagon binning and flow layout. The request is not "make us use the d3 versions"; it is: decide whether tauler wants a way to add pinned modules at all, and at what cost.

**What we do today instead.** We write both ourselves: `DT:charts/hexbin.jsx` (51 lines) and `DT:charts/flow.jsx` (107 lines); the decision is in `DT:charts/SPEC.md:120-152` ("Excluded dependencies"). `DT:charts/hexbin.jsx:2` says "d3-hexbin is not in tauler's d3 bundle". Both are exported from `DT:charts/index.jsx:9` (`flow`, `hexbin`).

**Evidence.**
- Tauler: the fixed list is two assets. `src/d3_figure/fetch.rs:46` `[&Asset;2]`, `fetch.rs:35-40` `Sources{d3,linkedom}`, `assets.rs:26-52` the two `Asset` consts. Hashes are compiled in (`assets.rs:33-39`) and re-checked on every load (`assets.rs:86-99`). `d3-7.9.0-exports.txt` has no `hexbin` or `sankey` (VERIFIED by grep in the notes; DT SPEC agrees).
- ES exports must be known before the module runs (`src/d3_figure/import.rs:12-16`), so a new module needs a static export list.
- Local copies of both packages exist on this machine (`/home/kantord/repos/minglish/web/node_modules/.pnpm/d3-hexbin@0.2.2`, `.../d3-sankey@0.12.3`). VERIFIED facts from them: both `package.json` say `"license": "BSD-3-Clause"`. `d3-hexbin/src/hexbin.js` is 112 lines and imports nothing. `d3-sankey/src/*.js` is 415 lines in 5 files, imports `d3-array` (`max, min, sum`) and `d3-shape`, and declares `d3-array "1 - 2"`, `d3-shape "^1.2.0"` (sankey.js:1-3 and `sankeyLinkHorizontal.js`). `dist/d3-sankey.min.js` is 5652 bytes (sha256 `8286db5d6aa049cc6e8a546708943b79dfb4daaefb0ccf42af674ec0ee4c86be`), `d3-hexbin.min.js` is 1706 bytes (sha256 `8a4749bbceaa91b3f2a59c1202ab34e9f11e88d629763c075b15d86dbac27866`).

**Reproduce today.**
1. Confirm the gap: `grep -ci -E "hexbin|sankey" src/d3_figure/d3-7.9.0-exports.txt` in the tauler repo gives 0 (from notes C, VERIFIED there).
2. Cost comparison of our code: `wc -l /home/kantord/repos/dotfiles-tauler/charts/hexbin.jsx /home/kantord/repos/dotfiles-tauler/charts/flow.jsx` gives `51`, `107`, `158 total`. The d3 sources: `wc -l .../d3-sankey/src/*.js` gives `415 total`; `d3-hexbin/src/hexbin.js` 112 lines. Honest reading: our versions are smaller because they are written for our row shape and do less (SPEC says no crossing minimisation, no loops around nodes), not because they are better. Our `flow` has its own tests (`DT:charts/test/spatial.test.jsx`, `DT:charts/test/gaps/layouts.test.jsx`); the d3 versions come with years of use.
3. The export list a loader needs, and a smoke test, by script (VERIFIED, real output):
   `node $SP/gen-exports.mjs /home/kantord/repos/dotfiles-tauler/node_modules/d3/dist/d3.min.js <d3-sankey.min.js>`
   ```
   sha256 8286db5d6aa049cc6e8a546708943b79dfb4daaefb0ccf42af674ec0ee4c86be bytes 5652
   exports added: ["sankey","sankeyCenter","sankeyJustify","sankeyLeft","sankeyLinkHorizontal","sankeyRight"]
   smoke: [["a",0,0,50],["b",45,0,50],["c",90,0,25]]
   ```
   and for `d3-hexbin.min.js`: `exports added: ["hexbin"]`. The script runs the base d3 UMD in a `vm` context, then the extra UMD, and diffs `Object.keys(d3)`. It shows two facts: (a) both UMD builds work against the real d3 7.9.0 UMD file despite their declared older peer ranges (the sankey smoke test lays out nodes); (b) they attach to the existing `d3` global object (`global.d3 = global.d3 || {}`), so tauler's private scope in `import.rs:29-40` would see them on the same namespace if the loader ran them after d3.
   `sha256sum ~/.cache/tauler/d3/d3.min.js` gives `f2094bbf...6539`, equal to the pin at `assets.rs:33-39` (VERIFIED).
4. Steps to add one pinned module today, as read from the code shape (all INFERRED, nobody has done this; from notes C section 2):
   1. New `Asset` const in `assets.rs` (url, `tar_member`, sha256 of the extracted file).
   2. `Fetcher` hard-codes two assets (`fetch.rs:35-55`, `build`, `new`, `offline`): generalise to N.
   3. Resolver: add the specifier in `GitPackageResolver::resolve` (`jsx.rs` about 755-770) and a branch in `SchemaAwareLoader::load` (about 528-540); `resolve_fetched` reads `pkg_ctx.d3.sources()`, so readiness is all or nothing.
   4. A static export list per module, like `d3-7.9.0-exports.txt`.
   5. Reach `draw`: `DRAW_BOOTSTRAP_JS` (`jsx.rs` about 828) sets only `globalThis.__tauler_d3`, and `figure.draw(svg, d3)` passes only that namespace. A module reached by `import` works without this; to appear on the `d3` object it must be merged (the scripts above show UMD does this by itself).
   6. Tests: `test_support.rs` fakes (`fake_d3_assets()` returns `[&Asset;2]`), an `#[ignore]` real-download test like `import.rs:108-143`, the pin test at `assets.rs:340`.
   7. ADR 0045 security check for each pin (`docs/adr/0045`, lines 106-120 in the notes), docs line "`d3` is d3 7.9.0" in `components.md`, `TAULER_D3_DIR` documentation.

**Proposal.** Recommended: alternative D now, B only if more than two modules are wanted in a year (see Alternatives). For B, the design:

Manifest (`tauler-assets.toml` next to the layout, or a `[assets]` table in the lockfile; the lockfile today maps `owner/repo -> {commit, development}`, `src/pkg/lockfile.rs:10`):
```toml
[module."d3-sankey"]
specifier = "d3-sankey"          # what `import ... from` uses; must not start with "@" or "tauler:"
url       = "https://registry.npmjs.org/d3-sankey/-/d3-sankey-0.12.3.tgz"
tar_member = "package/dist/d3-sankey.min.js"   # omit for a raw file
sha256    = "8286db5d6aa049cc6e8a546708943b79dfb4daaefb0ccf42af674ec0ee4c86be"   # of the extracted file, as assets.rs:11
format    = "umd-extends-d3"     # run after d3 in the private scope; exports are the new keys on d3
exports   = ["sankey","sankeyCenter","sankeyJustify","sankeyLeft","sankeyLinkHorizontal","sankeyRight"]
license   = "BSD-3-Clause"       # shown by `tauler pkg list`; informational
```
Semantics: same verify-on-every-load rule as `assets.rs:86-99`; HTTPS only; 16 MiB cap (`assets.rs:129`); no fetch from the Draw runtime (unchanged); a missing or mismatching file fails resolution like a cold d3 (`jsx.rs:696-715`). `exports` is checked at generation time by the script above and again by an `#[ignore]` test; at load, a name in `exports` that the file does not define is an error naming the module. Export list generation: `node gen-exports.mjs <d3.min.js> <module.min.js>` (it prints the sha256 and the sorted names); tauler would ship it as `tauler pkg add-asset <url>` doing the download, hash and listing in one step.
Trust: a manifest entry is code the layout owner chose, same trust as a package (ADR 0041 security posture, "same capabilities a layout file's own code already has"). The model change is that `Asset` fields are `&'static str` compile-time pins (`assets.rs:168` leaks strings for tests); a manifest makes pins runtime data, so the hash is no longer a tauler-reviewed constant.

Alternative D, what works today with no tauler change (INFERRED for the bare `import ... from "d3"` inside a package file; relative imports inside a package are VERIFIED by the notes: `package_root_for`, `jsx.rs` about 720-745): vendor the BSD sources into the package and import them relatively.
```js
// charts/vendor/d3-sankey/sankey.js: the upstream file with its first lines changed from
//   import {max, min, sum} from "d3-array";   ->   import {max, min, sum} from "d3";
// charts/stats.jsx or a mark file:
import { sankey, sankeyLinkHorizontal } from "./vendor/d3-sankey/index.js";
```
Licence facts (VERIFIED from the local `LICENSE` files and `package.json`): d3-hexbin and d3-sankey are BSD-3-Clause ("Copyright 2015, Mike Bostock. All rights reserved." in d3-sankey; "Copyright Mike Bostock, 2012-2016" in d3-hexbin). What a package must carry when it vendors them:
- Clause 1 (source): keep the copyright notice, the list of conditions and the disclaimer in each vendored source file or in a `LICENSE` file beside it (`charts/vendor/d3-sankey/LICENSE`, verbatim). Keep a header comment in any file you edit saying it was modified and how (the `d3-array`/`d3-shape` import change).
- Clause 2 (binary): if the package is ever distributed other than as source (a bundle, a wasm build), the same text goes in the documentation or other materials shipped with it. A tauler package is a git checkout (source), so clause 1 covers it; a docs page that lists third-party notices covers the rest.
- Clause 3: do not use the author's name to endorse the package.
- Our `NOTICE` (`DT:NOTICE`, Apache-2.0 repo) gets one entry per vendored library in the style of its existing cyrb53 and Liberation lines: name, version, copyright holder, licence name, path. The Apache NOTICE file does not replace the BSD text; both files are needed. The BSD text needs to be present only once per library.
- Compatibility: BSD-3-Clause code may be included in an Apache-2.0 repository; each file keeps its own licence. This is the writer's reading, not legal advice (INFERRED).
Cost of D: the library gains about 530 lines it did not write (415 sankey plus 112 hexbin) next to its own 158. Both are frozen upstream (hexbin 0.2.2, 2017; sankey 0.12.3, 2019; `DT:charts/SPEC.md:129`), so there is nothing to track.

**Acceptance tests.** For B (Rust, in `src/d3_figure/`):
- `a_listed_extra_module_is_importable_after_d3`: fake d3 UMD plus a fake extra UMD that sets `d3.extra = 1`; layout `import { extra } from "d3-extra"; export default () => <div>{String(extra)}</div>`; `eval` tree contains `"1"`.
- `a_hash_mismatch_refuses_the_module`: tamper one byte in the cached file; resolution returns an error naming `d3-extra` and the layout does not evaluate.
- `an_export_not_defined_by_the_file_is_an_error`: manifest `exports=["nope"]`; error names `nope`.
- `the_draw_runtime_has_the_module`: `new_draw` + `draw_figure` of a figure whose `draw` uses `extra`; markup returned.
- `#[ignore] every_listed_export_is_defined_by_the_real_file` per shipped module, like `import.rs:108-143`.
For D (JS, in DT, runnable today): `charts/test/vendor.test.js`: `expect(sankey()...nodes.map(n=>[n.x0,n.y0,n.y1])).toEqual([[0,0,50],[45,0,50],[90,0,25]])` using the vendored copy (the numbers above come from the real min.js run).

**Compatibility and rollout.** B is additive: no manifest means today's behaviour. One new reserved-name rule (module specifiers may not collide with `d3`, `tauler:*`, `@ui/*`, `@gh/*`). Needs a new ADR (pins become data), an update to ADR 0045's checklist, and docs. A cold module blanks the layout until fetched, the same as d3 today (ADR 0045:63-67). Feature detection: see T18.

**Alternatives.**
- **A. Add hexbin and sankey to the fixed list.** How: the seven steps above, twice, with `[&Asset;2]` growing to four. Pros: no new model; pins stay compile-time, reviewed constants; fastest to use. Cons: each addition touches Rust and needs a release; the next request (d3-cloud, d3-contour is already in d3) repeats it; two more files to download on first use unless fetched lazily; adds 4 to the all-or-nothing readiness check. Favours: tauler maintainers who want control. 
- **B. Generic pinned-asset manifest.** As designed above. Pros: one mechanism for every future module; the layout owner reviews the hash in a committed file; no release needed. Cons: pins become runtime data (`&'static` model ends), which weakens ADR 0045's "tauler vouches for these bytes"; new surface to document and test (`format`, `exports`, specifier rules); the UMD-extends-d3 assumption fits d3-family modules only; an arbitrary URL is a supply-chain surface the maintainers did not have. Favours: package authors and power users.
- **C. An official "d3 extras" bundle.** One pinned file built by tauler (or a tauler-owned repo) containing hexbin, sankey and later additions, loaded as `"d3-extras"`. Pros: one more asset only (`[&Asset;3]`), one export list, one hash; tauler controls which licences ship; users get a stable name. Cons: tauler owns a build artefact and its release process; bundle growth is a decision each time; licence notices for the bundle live in tauler (BSD clause 2 applies to tauler's distribution of the bundle, as it fetches rather than ships it, this is a grey area, INFERRED). Favours: maintainers who want a small, curated surface.
- **D. Packages vendor the sources via relative imports.** Works today; costs the package author the NOTICE work above and about 530 lines. Pros: zero tauler change, nothing to review in tauler, version frozen with the package commit, works in the page runtime as well (relative imports are plain ES modules). Cons: every package that wants sankey vendors its own copy (no sharing between packages); each pays the BSD obligations; the module is evaluated in all three runtimes on every layout load (cost not measured, INFERRED small for 5 KB of code).
- **Recommendation: D now.** Our own implementations already work and are tested, so the actual need is zero; D keeps tauler's pin model intact and costs us nothing to adopt if we ever want the d3 version. Revisit B if three or more packages vendor the same module. If the maintainers prefer a tauler change anyway, C is the smallest one that does not weaken ADR 0045. Reason against A: it is the cheapest yes now and the most expensive pattern over time.

**Open questions.** (1) Does the maintainers' ADR 0045 stance ("pinned, reviewed") exclude manifest-supplied hashes? (2) Does a bare `import ... from "d3"` resolve inside a package file (notes say the resolver checks `"d3"` first for any evaluator with a `pkg_ctx`; the owner's StatusPanel runs our `charts/*.jsx`, which import `d3`, so the production claim is that it does; not re-verified in this work)? (3) Should the page runtime (`tauler-web`) get the same modules?

---

### T10 `d3` availability parity between desktop and page   [priority P2 | effort S | controversy: none]

**Problem.** In a page `globalThis.d3` is set by the UMD side effect and bare `d3` works anywhere in the layout, but `import "d3"` fails (issue #683). On desktop the opposite holds: no `d3` global in layout code (`import.rs:7-9`, test at `import.rs:104` asserts `typeof globalThis.d3 === "undefined"`), `import * as d3 from "d3"` works. A layout that uses bare `d3` outside `draw` works in the browser only; one that imports works on desktop only. Inside `draw(svg, d3)` there is no difference.

**What we do today instead.** Our library always uses `import * as d3 from 'd3'` (22 files under `DT:charts/*.jsx`, VERIFIED by `grep -l "from 'd3'" charts/*.jsx | wc -l`, e.g. `DT:charts/hexbin.jsx:4`) and never reads a global; `Plot`'s `draw` ignores its second argument and calls `drawScene(svg, ...)` (`DT:charts/Plot.jsx:21,30`), which uses its own import. So the library cannot run in the page runtime until #683 is fixed (INFERRED).

**Evidence.** Page: `tauler-web/js/runtime.js:84-88` `loadD3()` sets the global; desktop: `jsx.rs:757-760` resolves `"d3"` only with a `pkg_ctx`; `components.md:330` documents #683. Our side: `grep -c "from 'd3'" charts/*.jsx` shows the dependency on import form (22 files, VERIFIED).

**Reproduce today.**
1. Desktop: layout `import * as d3 from "d3"; export default () => <div>{typeof d3.scaleLinear}</div>` evaluates (UNVERIFIED here; covered by tauler's own tests, `jsx.rs` about 3105-3260).
2. Desktop: layout `export default () => <div>{typeof d3}</div>` gives `"undefined"` (VERIFIED by the test at `import.rs:104`).
3. Page: the same two layouts give the opposite on `docs/tests/d3-figure.spec.ts`-style Playwright (UNVERIFIED).

**Proposal.** Make the page resolve `import "d3"` and `import {x} from "d3"` (module namespace over the loaded global, with the same 578-name list), and keep the desktop rule of no global. Document "import d3, never rely on a global" as the single portable form. Acceptance: see below.

**Acceptance tests.** `docs/tests/d3-figure.spec.ts`: `a layout that imports d3 draws in the page` (the existing figure fixture with `import * as d3 from "d3"` at module scope; expect the svg has the axis ticks). Rust: unchanged; add `bare_d3_is_not_a_global_in_layout_code` if absent.

**Compatibility and rollout.** Additive for the page. Docs: replace the caveat at `components.md:330`.

**Alternatives.** No credible alternative; the obvious other direction (put `d3` global on desktop) was rejected in `import.rs:7-9` to keep the realm clean.

**Open questions.** Does the page need the same static export list, or can it re-export `Object.keys(d3)` at load (the page has no "known before the module runs" problem if it builds the module in JS)?

---

### T11 Package subpath imports and a runtime-free export subset   [priority P1 | effort M | controversy: some]

**Problem.** A package has one entry, `index.*` at its root; `@gh/o/r/charts` is not a specifier (`src/pkg/specifier.rs:42`). Our root `index.jsx` re-exports components that import `@ui/icon`, so Node cannot load it, and we keep a second file, `charts/index.jsx`, that lists the chart names again. Two lists must agree; a test guards this.

**What we do today instead.** `DT:charts/index.jsx` (11 lines) duplicates the export list of `DT:index.jsx:26-33`; `DT:vitest.config.js:10-12` aliases `@gh/kantord/dotfiles-tauler` to `charts/index.jsx` so the examples import the public name; `DT:charts/examples/examples.test.jsx:27` ("charts/index.jsx lists the same names as the package index") keeps the lists equal; `DT:charts/test/usability.test.jsx:35` parses `index.jsx` text with a regex.

**Evidence.** Tauler: `specifier.rs:42` ("a subpath after `repo` ... is `None`"); `jsx.rs` about 690 `resolve(..., "./index", None)`; ADR 0041. Ours: `@ui/icon` exists only inside tauler runtimes (`tauler-core/src/ui/components/icon/mod.rs:10-18`).

**Reproduce today.** VERIFIED, `node $SP/rootindex.mjs` (Vite SSR load with our JSX settings and `test/tauler.js` installed):
```
/charts/index.jsx OK, 81 exports
/index.jsx FAILS: Cannot find module '@ui/icon' imported from '/home/kantord/repos/dotfiles-tauler/display/WeatherSummary.jsx'
```
Also `cd DT && npx vitest run` gives `Tests 723 passed | 1 skipped (724)`, including the list-agreement test.

**Proposal.** Support subpath specifiers `@gh/o/r/<path>` resolving to `<checkout>/<path>` (extensionless, same `.js/.jsx/.ts/.tsx` fallback as `./index`, confined to the checkout like `ConfinedFsResolver`). Lockfile entry stays per `owner/repo` (the commit pins the whole repo). Parse change: `specifier.rs` returns `{owner, repo, subpath: Option<String>}`; reject `..`, absolute paths and empty segments. Usage: `import { Plot } from "@gh/kantord/dotfiles-tauler/charts"`.

**Acceptance tests.** Rust (in the style of `warm_package`, `jsx.rs:2975`): `a_subpath_import_resolves_inside_the_checkout` (fixture repo with `charts/index.js` exporting `x = 1`; layout imports `@gh/fixture/repo/charts`; tree shows `1`); `a_subpath_with_dotdot_is_rejected`; `a_subpath_import_uses_the_root_pin` (one lockfile entry, two imports `@gh/fixture/repo` and `@gh/fixture/repo/charts` share the cache dir); `specifier.rs` unit test `parses_a_subpath`.

**Compatibility and rollout.** Additive; today such a specifier is `None`, so no existing layout changes. ADR 0041 amendment: the entry is no longer the only door; the public surface of a package becomes every file (document that subpaths are not private).

**Alternatives.**
- **A. Subpath specifiers** (above). Pros: simplest mental model, no new file format, mirrors npm paths. Cons: every file is public API; no way to say "this subpath is stable".
- **B. An `exports` map in a manifest** (`tauler-package.json`-like in the package root: `{"exports": {".": "./index.jsx", "./charts": "./charts/index.jsx"}}`). Pros: explicit public surface, can also hold T18's `requires`; allows one name to map to a runtime-free file. Cons: a new file format and a new place for drift; more tauler code (parse, validate, errors); the manifest is something every package must learn.
- **C. Status quo**: a second index file the author maintains (what we do). Pros: nothing to build. Cons: exactly the duplication above; each author invents their own subset file and test.
- **Recommendation: A**, with B deferred until T18's `requires` also wants a manifest. A removes our duplicate: tests and the page can import `@gh/.../charts` from one list.

**Open questions.** Should subpaths honour the lockfile `development: true` flag per repo as now (yes assumed)? Should `@gh/o/r/charts` and `@gh/o/r` evaluate shared modules once per runtime (they should, since the module cache is keyed by resolved path; INFERRED)?

---

## Group 5: Testing and conformance

### T12 A published test harness / runtime emulation   [priority P1 | effort L | controversy: high]

**Problem.** A package author who wants Node tests must copy what the layout runtime provides: the JSX factory and its reshape, `D3Figure`, the Draw step, `themeColor`, `ctx`, `@ui/*` stubs. We copied it (`DT:test/tauler.js`, 64 lines, and `DT:charts/examples/palettes.js`). Copies drift, silently: tests pass on behaviour the real runtime does not have. We found concrete drift (list below) and one of it already changes figure keys.

**What we do today instead.** `DT:test/tauler.js` ("keep it in step with them", line 5) wired through `DT:vitest.config.js:11` (classic JSX, `h`); `DT:charts/examples/palettes.js:20-27` `themeColorFor`; a hand-kept `@gh/kantord/dotfiles-tauler` alias (`vitest.config.js:10`). Drift is checked by nothing but this document.

**Evidence.** Real runtime: `h` at `src/jsx.rs:1121`; flatten at `tauler-core/src/globals.rs:21-28` and `tauler-core/src/flatten.rs:23-60`; `D3Figure` at `globals.rs:329-340`; Draw at `src/jsx.rs:808-822`; `themeColor` at `globals.rs:32-36` and `tauler-core/src/theme/resolver.rs:81-124`. Public pieces an out-of-tree Rust test can use (notes C section 3): `JsxEvaluator::{new_with_packages,new_draw,eval,draw_figure}`, `FigureCall`, `Fetcher::{new,offline}`, `PackageContext` pub fields (`src/pkg/mod.rs:23-32`); `test_support` is `#[cfg(test)] pub(crate)` (`src/d3_figure/mod.rs:88-89`) and fake-only.

**DRIFT LIST.** Each row: what differs, real side, our side, reproduction. R = real, O = ours.

| # | Drift | R | O | Reproduce |
|---|---|---|---|---|
| 1 | `themeColor` with alpha | returns `#rrggbbaa`; byte = `round(alpha*255)` (`resolver.rs:94-98`) | `rgba(r, g, b, a)` (`DT:charts/examples/palettes.js:26`) | demo below, VERIFIED |
| 2 | alpha range | clamped to 0..1 (`resolver.rs:95`) | not clamped (`1.7` passes through) | demo below |
| 3 | CSS names and non-hex colours | `red` at 0.5 gives `#ff000080`; `oklch(...)` converted via the `color` crate (`resolver.rs:99-108`) | `red` returned unchanged, `oklch(...)` gives `rgba(NaN, NaN, NaN, 0.5)`; `#fff` unchanged (`palettes.js:23-26`) | demo below |
| 4 | flatten: props iteration | `for (k in p)` includes inherited enumerable keys (`globals.rs:25`) | spread, own keys only (`DT:test/tauler.js:23`) | `$SP/drift-flatten.mjs` |
| 5 | flatten: `props` that is a string | skipped unless `typeof p === 'object'` (`globals.rs:24-25`) | spread of a string gives `{"0":"a","1":"b"}` (`tauler.js:23`) | `$SP/drift-flatten.mjs` |
| 6 | `h` and handlers | `__tauler_register_handlers` turns `on_*` function props on string tags into handler refs (`jsx.rs:1121`, `globals.rs:139-149`) | no equivalent; functions stay functions (`tauler.js:28-36`) | read both (VERIFIED by reading; the library uses no handlers, INFERRED) |
| 7 | `D3Figure` error text | long messages naming the reason (`globals.rs:331`, `:335`) | short (`tauler.js:39`, `:42`) | read both |
| 8 | figure registry | the Draw runtime keeps the latest registration per key and prunes module-scope figures to those the latest tree shows (`jsx.rs:798-803`, `1231-1235`) | one global Map, never pruned except by `resetFigures` (`tauler.js:7`, `:47`) | read both |
| 9 | Draw step | reuses one linkedom document, empties the body first, `svg.remove()` after (`jsx.rs:808-822`) | fresh document per call (`tauler.js:56`) | read both |
| 10 | d3 and linkedom builds | UMD `d3.min.js` 7.9.0 (sha256 `f2094bb...`) and `worker.js` at a pinned commit | npm `d3` 7.9.0 ESM and npm `linkedom` 0.18.14 (`package.json`) | `sha256sum node_modules/d3/dist/d3.min.js` equals the pin (VERIFIED); linkedom build difference INFERRED |
| 11 | engine | QuickJS: no `Intl`, libm `Math`, process TZ, timers never fire, no `console`, 5 s interrupt (`draw.rs:54`) | Node: V8, Intl, timers fire, console exists | see T7 |
| 12 | time zone | machine zone | `process.env.TZ = 'UTC'` (`DT:vitest.config.js:6`) | read both |
| 13 | missing globals | `ctx`, `globals`, `HOME`, `useJSONStream`, `Module`, `unit`, ... (`jsx.rs:1082-1200`) | only `h`, `Fragment`, `D3Figure`; tests set `ctx`/`themeColor` by hand (`DT:charts/examples/examples.test.jsx:74-75`) | read both |
| 14 | `ctx` | defined only when non-null (`jsx.rs:1191-1194`) | whatever the test assigns | read both |
| 15 | `@ui/*` | Rust components as synthetic modules | no stubs (root index cannot load) | T11 repro, VERIFIED |

Demo for 1 to 3 (VERIFIED). The real function is the verbatim text of `resolver.rs:81-124` compiled in a scratch crate with `color = "=0.3.3"` (`cd $SP/tc && cargo run --offline -q`), the palette being one token `primary = #7aa2f7` and `muted = oklch(0.7 0.1 250)`:
```
REAL (Rust)                                    OURS (node $SP/drift-theme.mjs)
"primary" None      -> #7aa2f7                 "primary" undefined -> #7aa2f7
"primary" Some(0.5) -> #7aa2f780               "primary" 0.5  -> rgba(122, 162, 247, 0.5)
"primary" Some(1.7) -> #7aa2f7ff               "primary" 1.7  -> rgba(122, 162, 247, 1.7)
"primary" Some(-1)  -> #7aa2f700               "primary" -1   -> rgba(122, 162, 247, -1)
"red"     Some(0.5) -> #ff000080               "red" 0.5      -> red
"nonsense" Some(0.5) -> nonsense               "nonsense" 0.5 -> nonsense
"muted"   Some(0.5) -> #6da3da80               "muted" 0.5    -> rgba(NaN, NaN, NaN, 0.5)
"#fff"    Some(0.5) -> #ffffff80               "#fff" 0.5     -> #fff
```
Why it matters (VERIFIED, `node $SP/drift-key.mjs`): the same Plot with the same palette compiles to different keys, because `chartTheme` puts `themeColor(name, 0.5)` into the scene, and the scene is hashed:
```
DT rgba()        lineSoft = rgba(47, 53, 66, 0.5)  key = 1ok2ydcvsyj
real #rrggbbaa   lineSoft = #2f354280              key = 70bbs8yopm
```
(the second row uses a JS port of the real rule, the Rust output above being the oracle). So every golden key in `DT:charts/test/golden-keys.json` that involves a themed colour with alpha would disagree with tauler. The three current golden scenes use no theme, which is why T13 passes in Node today and would still pass for them in tauler (UNVERIFIED on tauler's side).
Flatten demo (VERIFIED, `node $SP/drift-flatten.mjs`):
```
inheritedProp real= {"type":"x","own":2,"fromProto":1,"children":[]} ours= {"type":"x","own":2,"children":[]}
propsNull     real= {"type":"x","children":[]}                        ours= {"type":"x","children":[]}
propsString   real= {"type":"x","children":[]}                        ours= {"type":"x","0":"a","1":"b","children":[]}
typeOverride  real= {"type":"y","children":[]}                        ours= {"type":"y","children":[]}
```
(`real` and `ours` here are the two function bodies copied verbatim from `globals.rs:21-28` and `test/tauler.js:20-26`.)

**Reproduce today.** Steps: 1. `cd $SP/tc && cargo run --offline -q`. 2. `node $SP/drift-theme.mjs`. 3. `node $SP/drift-flatten.mjs`. 4. `node $SP/drift-key.mjs`. 5. Read the table rows 6-9, 13, 14 at the cited lines.

**Proposal.** Choose by cost and by where the truth lives (see Alternatives). Whichever is chosen, the contract is: a package's tests run its layout code through the same `h`, flatten, `D3Figure`, `themeColor` and Draw step as the app. Minimum useful set: factory + flatten + `D3Figure` + `drawFigure(key)` + `themeColor` + a `ctx` builder (`makeCtx({theme})`) + a documented `@ui/*` stub list. Recommended deliverable is B (below) with a thin A on top for the pure parts.

**Acceptance tests.** The harness's own conformance suite (belongs to tauler): `the_harness_h_matches_the_runtime_on_a_fixture_set` (a table of `h` calls with expected JSON, run by both Rust and the harness), `theme_color_matches_resolver_for_the_resolver_tests` (feed `tauler-core/src/theme/resolver.rs` test vectors), `flatten_matches_for_in_semantics` (inherited key case above). For B: `tauler test charts/` on our package exits 0 and prints the key of every `D3Figure`.

**Compatibility and rollout.** New artefact, no breaking change. Docs page "Testing a package". The existing `tauler-screenshot` (README) is a different tool (SVG output of a layout through the real pipeline; D3Figure support there is UNVERIFIED).

**Alternatives.**
- **A. npm package `@tauler/test`** (JS re-implementation of the runtime parts, published and versioned with tauler). Pros: easy for authors (`pnpm add -D`), fast Vitest loop, matches our current setup. Cons: it is still a copy, now maintained by tauler; drift is moved, not removed; the `themeColor` colour parser would need the `color` crate's behaviour in JS; QuickJS-versus-V8 differences stay invisible. Favours package authors.
- **B. Rust crate/CLI `tauler test <package>`** that loads the package into the real `JsxEvaluator` (new_with_packages / new_draw), runs the package's test layouts, prints keys and markup. Pros: zero drift by construction; real QuickJS, real d3 (`TAULER_D3_DIR`), real `themeColor`; the golden-key test (T13) falls out; time limit and libm are real. Cons: a new CLI surface and test-file format to design; slower loop than Vitest; needs the Rust toolchain or a released binary; JS-side assertions need a runner convention (JSON out, plus a JS file of expectations). Favours maintainers.
- **C. A wasm build of the real runtime for Node.** tauler-web already builds wasm for theme and component code (`tauler-web/js/runtime.js` uses `wasm.taulerThemeCtx`), but the layout engine there is the browser's JS, so the wasm covers `themeColor` and `@ui/*` but not QuickJS semantics. Pros: real Rust parts (`theme_color`, `flatten`), usable from Vitest. Cons: not the QuickJS engine, so it fixes drift rows 1-5 and 15 but not row 11; build and publish pipeline; a third host to maintain. Favours teams that already ship the wasm.
- **D. Status quo with drift tests** (consumer copy, plus a test that fails when a copied function differs from a fixture). Pros: no tauler work. Cons: the drift list above is evidence that it does not hold without a mechanism; each author repeats the work.
- **Recommendation: B**, then the cheap half of C (publish the existing wasm `theme_color`/`flatten` as a test helper) if Vitest speed matters. B is the only option whose result cannot disagree with the app; the drift list shows the disagreement already exists and already moves keys. Until then, D with this table as the checklist.

**Open questions.** Is the release of the `tauler` crate as a lib for out-of-tree tests intended (public fields suggest yes)? Should `test_support::fake_d3_fetcher` stay private? Preferred test-result format for B (TAP, JSON lines)?

---

### T13 A cross-runtime golden-key conformance test in tauler   [priority P1 | effort S | controversy: none]

> **Status (tauler review, 2026-10-30):** golden scenes replace golden keys, since keys no longer check the compile; the Rust side is hosted in our CI. See the status section near the top.

**Problem.** Our keys (`hash53(JSON.stringify(scene))`, `DT:charts/core.jsx:291`) must be identical in QuickJS (render and Draw runtimes) and Node/browser; tauler finds each figure by its key and logs `UnknownKey` at debug only when they differ (`draw.rs:86-87`, `307-309`). We have golden keys; nobody runs them in tauler.

**What we do today instead.** `DT:charts/test/golden-keys.json` and the test `g47 a golden-key file covers boundary, trig and kde scenes, and Node reproduces every key` at `DT:charts/test/gaps/state-determinism.test.jsx:106-111`; `UPDATE_GOLDEN=1` rewrites the file. `DT:charts/SPEC.md:719-722` says tauler's side is a follow-up.

**Evidence.** The golden file (VERIFIED): `{"rounding-boundary":"9a9ahkdnjl","trig-arc":"x3t9raw9bm","kde-line":"1j6f6fq09yx"}`. Scenes: `state-determinism.test.jsx:90-94`. The key needs no draw: the render runtime never runs `draw` (`jsx.rs` test about 2162 "does not run its draw function in the render runtime"), so `JsxEvaluator::eval` and `EvalOutput.figure_calls[i].key` suffice. The package imports `d3` (22 files), so a real d3 is needed: `TAULER_D3_DIR` or `~/.cache/tauler/d3` (this machine has both files; `d3.min.js` sha256 equals the pin, VERIFIED).

**Reproduce today.**
1. `cd /home/kantord/repos/dotfiles-tauler && npx vitest run charts/test/gaps/state-determinism` gives `Test Files 1 passed (1) / Tests 7 passed (7)` (VERIFIED).
2. To regenerate: `UPDATE_GOLDEN=1 npx vitest run charts/test/gaps/state-determinism`, review the diff (not run here, to keep the repo unchanged).
3. Tauler side: not built (UNVERIFIED).

**Proposal.** A Rust integration test in tauler, `tests/golden_keys.rs`, `#[ignore]` by default, run in CI with `DOTFILES_TAULER_DIR` and `TAULER_D3_DIR` set. It needs the package source on disk, so it takes a directory, not a git fetch (relative imports are allowed and confined to the layout directory: copy `charts/` into a temp layout dir). Sketch (UNVERIFIED; model: `examples/figures/mod.rs:package_context`, `jsx.rs:854`, `:1320`):
```rust
// tests/golden_keys.rs
use std::{collections::HashMap, path::PathBuf, sync::Arc};
use tauler::{d3_figure::fetch::Fetcher, jsx::JsxEvaluator, pkg::{fetch_manager::FetchManager, PackageContext}};

fn copy_dir(from: &std::path::Path, to: &std::path::Path) { /* recursive std::fs::copy, skip node_modules, test, examples */ }

#[test]
#[ignore = "needs DOTFILES_TAULER_DIR and TAULER_D3_DIR (d3.min.js + linkedom.js)"]
fn charts_keys_match_the_golden_file() {
    let src = PathBuf::from(std::env::var("DOTFILES_TAULER_DIR").expect("set DOTFILES_TAULER_DIR"));
    let d3 = PathBuf::from(std::env::var("TAULER_D3_DIR").expect("set TAULER_D3_DIR"));
    let golden: HashMap<String, String> =
        serde_json::from_str(&std::fs::read_to_string(src.join("charts/test/golden-keys.json")).unwrap()).unwrap();

    let dir = tempfile::tempdir().unwrap();
    copy_dir(&src.join("charts"), &dir.path().join("charts"));
    let (tx, _rx) = std::sync::mpsc::channel();
    let fetcher = Fetcher::offline(d3);
    assert!(fetcher.sources().is_some(), "TAULER_D3_DIR must hold verified d3.min.js + linkedom.js");
    let pkg = PackageContext {
        fetch_manager: Arc::new(FetchManager::new(tx)),
        lockfile_path: dir.path().join("tauler-pkg.lock"),
        cache_root: dir.path().join("cache"),
        d3: Arc::new(fetcher),
    };

    // One layout per scene; the scenes are the ones in state-determinism.test.jsx:90-94, copied into
    // charts/test/golden-scenes/<name>.jsx by the DT repo (a default export returning <Plot .../>).
    for (name, want) in &golden {
        let layout = dir.path().join(format!("{name}.jsx"));
        std::fs::write(&layout, format!(r#"import scene from "./charts/test/golden-scenes/{name}.jsx"; export default scene;"#)).unwrap();
        let source = std::fs::read_to_string(&layout).unwrap();
        let ev = JsxEvaluator::new_with_packages(&source, serde_json::json!({}), Some(&layout), pkg.clone())
            .unwrap_or_else(|e| panic!("{name}: {e:?}"));
        let out = ev.eval(&HashMap::new()).unwrap_or_else(|e| panic!("{name}: {e:?}"));
        assert_eq!(out.figure_calls.len(), 1, "{name}");
        assert_eq!(&out.figure_calls[0].key, want, "{name}: Node and QuickJS disagree on the figure key");
    }
}
```
Required DT-side change (small): move the three scene functions to files `charts/test/golden-scenes/<name>.jsx` exporting a default function that returns `<Plot ...>`; the Vitest test imports the same files, so both runtimes read one definition.

**Acceptance tests.** `charts_keys_match_the_golden_file` above, plus `a_changed_scene_changes_the_key` (edit one number in a scene; the assertion fails; this proves the test can fail). Also a rounding-boundary scene already in the file covers `Math.round` half-up; trig-arc covers libm (T7).

**Compatibility and rollout.** Test-only. Add a CI job (the d3 files can be cached). Document the env variables in `CONTRIBUTING`/test docs. If the maintainers prefer, the test lives in DT's CI as a Rust test depending on the `tauler` crate by git, which needs no tauler change at all.

**Alternatives.** No credible alternative; the obvious other place (e2e) is the wrong tool: Docker and pixels for a string comparison (`tauler-e2e`, `#[ignore]`, ADR 0006).

**Open questions.** Does tauler prefer to host the test or us? Is `tempfile` a dev-dependency already? Does `PackageContext` construction stay public?

---

## Group 6: Host features

### T14 Container size: let a chart learn its available width and height   [priority P1 | effort L | controversy: high]

> **Status (tauler review, 2026-10-30):** deferred. See the status section near the top.

**Problem.** `D3Figure` needs explicit numeric `width` and `height` in logical pixels (`globals.rs:333-336`). Layout evaluation happens before takumi lays anything out, so a layout cannot know how wide its container is. Authors compute it from constants that mirror the layout code, and a change to padding in one place silently breaks the chart in another.

**What we do today instead.** The caller passes the size: `<Plot width={...}>` (`DT:charts/Plot.jsx:20`). The owner's own layout, read-only: `~/.local/share/chezmoi/dot_config/tauler/lib/layout.js:4-16` defines `SIDEBAR_W = 272`, `SIDEBAR_PAD = { left: 10, right: 16, y: 6 }`, `SIDEBAR_CONTENT_W = SIDEBAR_W - SIDEBAR_PAD.left - SIDEBAR_PAD.right`, `PANEL_PAD_X = 4`, `PANEL_CONTENT_W = SIDEBAR_CONTENT_W - 2 * PANEL_PAD_X`, with the comment (line 9) "Everything below the list has a fixed height, so the list's height is arithmetic, not a guess." `components/StatusPanel.jsx:8` imports `PANEL_CONTENT_W` and line 51 passes it: `<Plot width={PANEL_CONTENT_W} height={CHART_H} margin={{ top: 1, right: 0, bottom: 1, left: 0 }} ...>`. The same width is also what the bars use as percentages (`StatusPanel.jsx:42`, `width: X%`), so one number lives in two forms.

**Evidence.** Tauler: no size hook exists (grep `useSize|useMeasure|container` empty, notes D section 6); `Panel width height` explicit (`layout.md:155`); `ctx` has only `screen_width`, `screen_height`, `outputs`, `dpi`, `theme` (`data.md:283-289`); eval then JSON tree then takumi layout (INFERRED architecture, ADR 0007/0044). Existing measuring machinery after layout: `src/hit_test.rs:126 with_scene`, `painted_boxes` (`hit_test.rs:177`), `workspaces::measure_content_rect` (`workspaces.rs:129`). A Picture is rasterised at `style size x dpr` (`picture.rs`), and, per tauler's review, is pre-rasterised at the `<img>`'s numeric size, so it cannot be shown at another CSS size without a redraw.

**Reproduce today.** 1. Read the two chezmoi files at the lines above. 2. Change `PANEL_PAD_X` to 8 without touching `StatusPanel.jsx`'s other constants: the chart width follows only because it uses the constant; any other component with a hard-coded 4 will not (INFERRED from reading; not run, because the files are the owner's live config). 3. Tauler side: no way to ask (VERIFIED by the grep in notes).

**Proposal.** Recommended: alternative B (fill sizes for D3Figure, size delivered to `draw`) because it keeps the figure a Picture and makes `draw`, not the layout, depend on the size; see the trade-off below. API:
```jsx
<D3Figure key="cpu" width="100%" height={110} draw={(svg, d3, { width, height }) => ...} />
```
`width`/`height` accept a number (today) or `"100%"` (fill the parent's content box; also `"fill"` for flex). Semantics: the host lays out the `<img>` with the fill size, learns the physical box (`painted_boxes`-style), and asks the Draw runtime for a Picture at that size; the third argument carries the resolved CSS size. The key must still vary only with data; size is added to Picture identity by the host (this is T4's change). Determinism: a layout must not read the size, so the render runtime's tree stays independent of layout (no feedback loop). Cost: one extra layout per size change (cached per `(key, w, h)` like the raster key `(shown, generation, pw, ph)`); first frame at a new size shows the previous Picture or nothing (INFERRED UX, as for a cold key). Rust: `globals.rs` D3Figure accepts the string and emits `{type:"img", src, style:{width,height:...}}` with a `data-fill` marker; `requests.rs` plans draws from the post-layout boxes.

**Acceptance tests.** Rust: `a_percent_wide_figure_is_drawn_at_its_container_width` (panel 200 px wide, padding 10: the Draw runtime sees `width=180`); `resizing_the_panel_redraws_the_figure_once`; `a_fixed_size_figure_is_unchanged` (regression). JS: `draw_receives_a_size_object_as_its_third_argument` with the fake draw runtime.

**Compatibility and rollout.** Additive: numbers behave as today. `draw`'s third argument is new and ignored by existing code. Feature detection: T18. ADR to write: "Figure size is resolved after layout".

**Alternatives.**
- **A. `useSize`/measure hook** (`const {width,height} = useSize(ref)`). Pros: general (text boxes, any div); familiar from React. Cons: the layout is evaluated before layout, so the hook returns last Tick's size: two renders on first show, a Tick fired by layout, and ADR 0007 says "nothing survives between ticks except `globals`", so the hook needs host state, which contradicts the model. Also the size feeds the key, so the key changes after layout. Favours authors who want to branch on size (responsive layouts).
- **B. Fill sizes plus size handed to `draw`** (proposed). Pros: no feedback loop in the tree; the figure stays declarative; the dependency on size sits where the drawing is. Cons: the layout cannot choose what to show by width (hide axis labels when narrow); `draw` must compute the scene, so our "compile in the layout, key from the scene hash" mode (no `key`, `Plot.jsx:27-31`) cannot know the size and must use the caller's key (`Plot.jsx:21-26` path); the Picture identity must include the size (T4).
- **C. Two-pass layout** (evaluate, lay out, re-evaluate with measured sizes). Pros: fully general; keeps scene-in-layout. Cons: doubles eval cost every Tick when anything fills (eval is about 2 ms, ADR 0007; the budget is a hard 10 ms for the drag path, ADR 0042); the second eval can change the tree and the layout (needs a fixpoint rule); big architectural change. Favours nobody on the performance budget.
- **D. Status quo: constants duplicated from layout code** (what the chezmoi files do). Pros: no tauler work; it is explicit and cheap at runtime. Cons: the duplication is real and fragile (above); it does not help packages, which cannot know their host's layout at all (our `Plot` takes the width as a prop for that reason).
- **Recommendation: B**, since it removes the duplication for the common case (a chart that fills its panel) without a new state model. For responsive logic, authors use D plus `ctx.screen_width`. Reasons against A and C are the eval-before-layout order and the 10 ms budget.

**Open questions.** Is a Picture shown at a CSS size other than its draw size acceptable (viewBox scaling) as a cheap interim, i.e. fill sizes without redraw? How should the host treat `height` as `"auto"` (aspect ratio)?

---

### T15 Pointer input to figures (hover, brush, tooltips)   [priority P2 | effort L | controversy: high]

> **Status (tauler review, 2026-10-30):** deferred; hover stays a non-goal. See the status section near the top.

**Problem.** A chart on a desktop bar cannot show a tooltip or brush: no hover event exists, and a figure is a bitmap that receives no pointer position. The library offers a tooltip as a mark drawn from a hovered datum (`DT:charts/recipes/tooltip.jsx`), but nothing can supply the datum.

**What we do today instead.** The tooltip recipe takes the datum as data (state in, no state out): `DT:charts/recipes/tooltip.jsx`, tested in `DT:charts/test/spatial.test.jsx`. The library keeps no state and handles no events (SPEC 4: pure functions of props). A host that wants hover must supply the hovered row through props; ours cannot today. Workaround from notes D section 4: absolutely-positioned overlay `div`s driven by a Module stream, and brushing by `on_drag` on a wrapper `div` whose intents go to a Module and come back as the next stream value and a new key (a draw per brush move).

**Evidence.** Handlers: only `on_click` and `on_drag` exist (grep `on_hover|on_move|on_scroll|on_wheel` empty; ADR 0021, `src/pointer.rs:45-70`). `on_drag` gives `{x,y,press_x,press_y,width,height,buttons}` relative to the element box (ADR 0020, `components.md` "Dragging"), X11 only ("Drag is X11-only"). ADR 0020's reasoning about hover, verbatim from the notes: "Hover is not available, and this is why. Delivering motion with no button held needs POINTER_MOTION, and resolving it needs hit_test, which runs an uncached takumi layout per call. That is fine once per click and ruinous once per mouse twitch. A captured drag never pays it, because the box was snapshotted... naming one we cannot fire would be inventing an API for a constraint we have not solved." Output of a handler is only intents sent to a Module subprocess (`pointer.rs:15-40`), one in flight per module (ADR 0025), "The round trip is the whole design ... Nothing is optimistic" (`components.md` about 105-112). ADR 0012: "A control with no external owner has nowhere to keep its value ... That cost was accepted deliberately". ADR 0044: figures "arrive as Pictures", page does not use it. Also issue #686 (a live-data key costs a repaint of the whole panel) and #395 (buffer boundary, OPEN). Handler writes to `globals` may be lost and cause no Tick: UNVERIFIED (`units.md:510` versus `jsx.rs:1333-1336`).

**Reproduce today.**
1. Search for a hover handler: `grep -rn "on_hover\|on_move" src docs tauler-core` in the tauler repo is empty (VERIFIED by notes).
2. `on_drag` on a wrapper around a `D3Figure` (INFERRED to hit, since an `<img>` is a block atomic box): the handler fires only on X11 with button 1 held.
3. Our side: `npx vitest run charts/test/spatial` passes the tooltip recipe (VERIFIED as part of the 723-test run) given a datum.

**Proposal.** Do not request any of A to C unconditionally. The request is to record a decision. If the maintainers choose to open this up, the smallest design that keeps the library pure is C: a read-only `usePointer(region)` value delivered to the layout as plain data, so the library receives `hovered: {x, y}` as a prop and returns a scene (state in, no state out). What the library needs, concretely: (1) a pointer position relative to the figure box, in CSS px; (2) that the position changes the Tick's input, not a Module's output; (3) ideally that only the figure repaints (buffer boundary, #395). The library stays pure because the position is just a prop; no callbacks, no state, no events cross into `Plot`.
```jsx
const p = usePointer("cpu");          // null, or {x,y,width,height} relative to the region
<div region="cpu"><Plot ... hover={p && { x: p.x }}> <Tooltip at="hover"/></Plot></div>
```
Cost: motion without a button needs POINTER_MOTION and a cached hit region (ADR 0020's objection), and each position change is a Tick that creates a new key, hence a draw per move; the proposal needs rate limiting (quantise `x` to the nearest datum so the key changes only per datum) and a cheap-repaint path. All of that is more cost than the feature is worth until #395 and #686 are solved.

**Acceptance tests.** Only if A, B or C is chosen. For C: `a_region_reports_pointer_position_to_the_next_tick` (synthetic motion at (10, 5) in a 100x50 region; the Tick's tree receives `{x:10,y:5,width:100,height:50}`); `leaving_the_region_reports_null`; `motion_outside_any_region_costs_no_layout` (no `hit_test` call counter increment). For D nothing.

**Compatibility and rollout.** For D: none; write a one-paragraph ADR that closes the question, citing ADR 0020 and 0044. For C: new global, new input path, Wayland caveat (no motion without a button, `components.md` "Drag is X11-only").

**Alternatives.**
- **A. `on_hover` with a cached hit region.** The handler gets the position and returns intents, like `on_drag`. Pros: matches the existing handler model (ADR 0021); cached region answers ADR 0020's cost objection (snapshot at press, here at region enter). Cons: output is still intents to a Module, so the round trip stays and a tooltip lags a subprocess hop; needs POINTER_MOTION on X11 and compositor-specific work on Wayland; the library gets its datum only via a Module's next stream line. Favours people with a Module already.
- **B. Pointer delivered as a stream through a Module** (status quo plus overlay divs). Pros: no tauler change; follows ADR 0012's "someone must own state" stance. Cons: our experience is that every author writes a pointer-reporting Module; overlay `div`s are not the chart's coordinate system; no motion without a button at all, so no hover. This does not solve hover; it solves brushing on X11.
- **C. `usePointer(region)` read-only state.** Pros: the cleanest for a pure library (position in as data); no Module. Cons: it is a hook, and ADR 0007 says "no hooks protocol, no ordering rule, no dependency array", so the state (pointer position) lives in the host and the Tick input grows; contradicts the "nothing survives between ticks" simplicity; motion events cause Ticks (the dominant cost, ADR 0042's 10 ms budget); needs #395 so a cursor overlay does not repaint the panel (#686: 7-11% CPU vs 3.5% for one update every 2 s; mouse motion would be far above that).
- **D. Keep it a non-goal.** Pros: honest: ADR 0020 states hover as not solved and refuses to invent an API; the bar is mostly glanceable, not interactive; a status bar chart can show the latest value and a legend instead of a tooltip. Cons: no tooltips or brushing, ever, on the desktop path (the page runtime could still do it, INFERRED); our recipe stays useful only in the page and in tests. Favours the project's current simplicity.
- **Recommendation: D for now, revisit C after #395 and #686.** The cost is borne by every user of the bar, the benefit by one kind of chart. D is defensible and consistent with ADR 0020's own reasoning. If a maintainer wants to move, A's cached-region idea is the part worth reusing, delivered as C's read-only value.

**Open questions.** Is the page runtime expected to support hover (real SVG, real DOM events) while the desktop does not, and is that divergence acceptable under ADR 0027/0028? Would `on_drag` be extended to deliver non-button motion on X11 only as an experiment?

---

### T16 A deterministic clock for layouts, and timestamps for tauler-accumulate   [priority P2 | effort M | controversy: some]

> **Status (tauler review, 2026-10-30):** no per-Tick `ctx.now`; take time from the newest row's `t`. See the status section near the top.

**Problem.** A layout has no clock hook and no timer-driven Tick (`CONTEXT.md` "Pass"; ADR 0042). `Date.now()` works in the render runtime but is impure and different in the Draw runtime (a later wall time), so a key derived from it never matches (`draw.rs:307-309`). Time-axis charts need "now" and sample times; `tauler-accumulate` rows carry no timestamp.

**What we do today instead.** The library never calls `new Date()` (`DT:charts/Plot.jsx:9-11`: "Never call `new Date()` in the layout; take the time from a stream and pass it in."). The owner's layout takes the time from a shell stream that prints epoch seconds and builds rows with `t`. Time scales are UTC (`DT:charts/scales.jsx:162` `d3.scaleUtc`; `DT:charts/ticks.jsx:26`, `DT:charts/domains.jsx:22`).

**Evidence.** `tauler-accumulate/src/main.rs:1-60`: ring buffer, `-n` default 60, emits the whole window per input line, JSON-parsed if possible, no timestamp added. README prescribes a stream for the clock (`README.md:104-122`: `date` loop). `ctx` has no time field (`data.md:283-289`). Issue #377 (dead stream vs static, OPEN). ADR 0014: an incoming line is stored only if it differs from the stored one, so duplicates are dropped before the layout sees them.

**Reproduce today.** 1. `grep -n "Date.now\|new Date" /home/kantord/repos/dotfiles-tauler/charts/*.jsx` finds none in library code (VERIFIED by the Plot.jsx comment and the grep earlier; re-run to confirm). 2. Tauler: `ctx` fields list has no time (docs). 3. The key hazard: a layout using `Date.now()` in a key produces `UnknownKey` (INFERRED from `draw.rs:307-309`; not run).

**Proposal.** Recommended: C (accumulate emits `{t}`) plus A (`ctx.now`) for layouts that only need a coarse "now". C: `tauler-accumulate --stamp t` wraps each input line as `{"t": <epoch seconds>, "v": <parsed value>}` (or adds `t` into an object), so the window carries real sample times with no shell glue. A: `ctx.now` is epoch seconds quantised to the Tick and identical in all runtimes for that Tick.
```jsx
const rows = useJSONStream("tauler-accumulate", "--stamp t -n 60 ...");   // [{t, v}, ...]
<Plot data={rows} x="t" ... />
```
Determinism: `ctx.now` is fixed per Tick and captured by the Draw runtime at request time (so it does not move between runtimes), mirroring how `ctx.theme` is fixed at spawn (`draw.rs:123`). Cost: one number per Tick; no timer-driven Ticks are added (so it does not by itself make a clock widget tick; that stays a stream).

**Acceptance tests.** `tauler-accumulate`: `stamp_adds_an_epoch_seconds_field` (feed `3\n4\n`; output last line parses to `[{"t": T0, "v": 3}, {"t": T1, "v": 4}]` with `T1 >= T0`), `stamp_off_leaves_the_output_unchanged` (regression). Runtime: `ctx_now_is_equal_in_render_and_draw_runtimes_for_one_tick`.

**Compatibility and rollout.** Additive: `--stamp` is a new flag; `ctx.now` a new field. Docs: `data.md` ctx table.

**Alternatives.**
- **A. `ctx.now` quantised per Tick.** Pros: one source of truth; same value in all runtimes; no stream needed for "now". Cons: a value that changes on every Tick breaks nothing today, but authors will derive keys from it and cause a redraw per Tick (#686); quantisation unit must be chosen.
- **B. `useNow()`.** Pros: reads like a hook; could take a resolution (`useNow(60)`). Cons: a hook with host-owned state (see ADR 0007's stance); same key hazard; no benefit over `ctx.now` unless it schedules Ticks, which is a new loop concept (ADR 0042 "never a clock").
- **C. Accumulate emits `{t}` rows.** Pros: the sample time is the data (what a chart needs), robust to dropped Ticks, no change to the layout model; replaces the shell-side `date +%s` in the docs example (`components.md` D3Figure example). Cons: only helps accumulate users; "now" for an axis end still needs a stream or A.
- **D. Status quo (date stream).** Pros: works, explicit, no change. Cons: every author writes the same shell; clock drift between the date stream and the data stream.
- **Recommendation: C, plus A.** C fixes the data. A is a tiny field that answers "what is the right edge of this time axis" deterministically.

**Open questions.** Should `ctx.now` change on every Tick or only when a stream changes (the same thing, as Ticks are stream-driven)? UTC or local for any formatted output (T7)?

---

### T17 A documented SVG and raster capability contract with a conformance SVG   [priority P1 | effort S | controversy: none]

> **Status (tauler review, 2026-10-30):** the pixel conformance test is dropped; a docs note remains. See the status section near the top.

**Problem.** Authors cannot tell which SVG features survive the desktop path (takumi's vendored resvg 0.48.1). Our library uses filters (`blur`, `dropShadow`), masks, patterns, markers, gradients and clip paths (`DT:charts/index.jsx:6` exports `linearGradient, radialGradient, pattern, hatch, blur, dropShadow, marker, arrowhead, mask, clipRect, clipPath`). We have no way to check them in tauler's rasteriser, only the page.

**What we do today instead.** We emit them and test the markup in Node (`DT:charts/test/paint.test.jsx`); pictures in the gallery are drawn by a browser (`DT:charts/examples/gallery.js`). Whether tauler draws them is not checked. We also avoid features known to fail: no colour glyphs, no string `<image>` hrefs (SPEC 5.x).

**Evidence.** Tauler: rasteriser `takumi-core 0.32.0` with vendored resvg 0.48.1 (`takumi-core src/lib.rs:59`; `resvg/mod.rs:5-12`: system-fonts and writer stripped, "color glyph formats (COLR, SVG-in-font, bitmap) are stripped — glyphs render from outlines only"). Present in the vendored tree: filters (box_blur, color_matrix, component_transfer, composite, convolve_matrix, displacement_map, iir_blur, lighting, morphology, turbulence), masks (`mask.rs`), clipPath (`clip.rs`), patterns and gradients (`usvg/parser/paint_server.rs`), markers (`parser/marker.rs`), `<use>`, `<switch>`, CSS via simplecss, blend modes (`render.rs:145`). `<image>`: string hrefs disabled to stop reading local files; `data:` URIs fine (`resources/image.rs:144-151`). Not found (INFERRED unsupported): `<foreignObject>`, CSS animation, colour emoji. Markup that is not an SVG document draws nothing and does not panic (`picture.rs` doc). SVG text uses the registry's fonts through `svg_fontdb()` (`font.rs:370-386`), and a missing family is dropped (usvg `text/mod.rs:99-155`, T2). Filter regions: our own filter region is the shape's box grown by 20% each side (`DT:charts/defs.jsx:4-6,36`), and the library documents that a flat line, which has no height, cannot be filtered unless put in a Group (VERIFIED by reading). Whether tauler's resvg matches a browser here is what the conformance SVG should settle.

**Reproduce today.** 1. Read `takumi-core-0.32.0/src/resvg` and list the filter files (VERIFIED in notes). 2. Run tauler's tracer `cargo run --release --example d3_charts_tracer -- <out_dir> [theme]` (UNVERIFIED; not run: it may start the loop, to be checked first, it is a library example not the bar). 3. Our side: `npx vitest run charts/test/paint` passes markup checks (part of the 723 passed).

**Proposal.** (1) A docs page "SVG in figures" with a table feature, supported/not, note, derived from the vendored tree. (2) A conformance SVG `docs/examples/svg-conformance.svg` with one cell per feature (blur on a rect with a region, blur on a flat line with and without a region, drop shadow, mask, clipPath, pattern, linear and radial gradient, marker, `<use>`, text with a missing family, `<image>` data URI and string URI, `foreignObject`) and a Rust test that rasterises it and asserts a pixel per cell (non-background where supported, background where not). (3) Feature detection: a documented JS-visible list, e.g. `tauler.svgFeatures` (see T18), or simply the docs version stamp.

**Acceptance tests.** `svg_conformance_cells_render_as_documented` (Rust, pixel assertions per cell, e.g. `blur_flat_line_without_region_is_empty`, `blur_flat_line_with_region_has_ink`, `string_href_image_is_not_drawn`, `data_uri_image_is_drawn`, `foreign_object_is_not_drawn`, `color_glyph_renders_as_outline`). Our side: `charts/test/conformance-svg.test.js` could emit our own versions of the cells through `blur`/`dropShadow` and save them as fixtures for the same test.

**Compatibility and rollout.** Docs and test only. The table must be regenerated when takumi is bumped (a CI check that the vendored version string equals the documented one).

**Alternatives.** No credible alternative; the obvious one is "read the resvg README", which does not apply here because takumi strips and patches the crate.

**Open questions.** Is `foreignObject` intended to stay unsupported? Is the vendored resvg version contractually stable across takumi bumps?

---

### T18 Version and capability detection for packages   [priority P1 | effort S | controversy: some]

**Problem.** A package cannot ask which tauler it runs on or which features exist. There is no `tauler.version`. The only guard is the documentation (`DT:README.md:335`: "Needs tauler 0.7.0 or later"). A new import specifier (T9) or a new global would blank the whole layout on an older tauler (a failed import is a link-time failure, ADR 0041 Consequences), not degrade it.

**What we do today instead.** `typeof D3Figure === 'function'` style checks are possible, but our library does not make them; we rely on the README line. The charts need 0.7.0 (`D3Figure` first appeared in 0.7.0, `CHANGELOG.md:12`).

**Evidence.** No version global in `globals.rs` / `jsx.rs` (grep in notes C section 6). `CARGO_PKG_VERSION` is used only for the download UA (`fetch.rs:285`). `JSX_GLOBALS_JS` is shared by QuickJS and wasm (`globals.rs:1-11`), the natural place for a new global. Dynamic `import()` in try/catch is the ADR 0041 way for a new specifier.

**Reproduce today.** 1. In a layout: `export default () => <div>{String(typeof D3Figure)} {String(typeof tauler)}</div>` gives `function undefined` on 0.7.0 (INFERRED from the globals list; UNVERIFIED by running). 2. `grep -rn "tauler.version\|__tauler_version" src tauler-core tauler-web` empty (VERIFIED by notes).

**Proposal.** Recommended: A with B kept for specifiers. A global:
```js
tauler = { version: "0.8.0", capabilities: ["d3-figure", "pointer-drag", "ctx-now", "svg:mask", ...] }
```
Frozen, defined by `JSX_GLOBALS_JS` so both hosts agree; `capabilities` are short stable strings listed in docs, added with the feature. Usage: `const has = (c) => globalThis.tauler?.capabilities?.includes(c);`. Semver comparison is left to the author. A package that needs a new specifier still uses `await import(...)` in try/catch. Determinism: constant for a process and identical in all runtimes.

**Acceptance tests.** `tauler_global_is_defined_and_frozen_in_every_runtime` (render, reconciler, draw; `Object.isFrozen`), `tauler_version_equals_cargo_pkg_version`, and a web test that the page defines the same. Docs-site test `capabilities_listed_in_docs_exist` (each documented string appears in the runtime list).

**Compatibility and rollout.** Additive; old tauler has no `tauler` global, so `globalThis.tauler?.…` is the documented portable idiom (absence means "before 0.8"). Name collision with a user layout variable `tauler` is possible (a layout that declares `const tauler` at module scope shadows it, harmless).

**Alternatives.**
- **A. A `tauler` global with version and capabilities.** Pros: synchronous, works at module scope, no import failure, same in page and desktop. Cons: a new public surface to keep stable; capability strings need curation; does not help with the first release that introduces it.
- **B. Dynamic import try/catch (ADR 0041 today).** Pros: nothing to add; the right tool for "does this specifier resolve". Cons: asynchronous (top-level `await` in layouts is untested here, INFERRED), a cold package or d3 download looks like a failure, and it says nothing about behaviours (`draw`'s third argument, the SVG features).
- **C. A manifest `requires`** (`{"requires": {"tauler": ">=0.7"}}` in the package, T11-B). Pros: declarative, tauler can refuse to load with a clear message instead of a blank bar. Cons: needs the manifest (a new file format); semver parsing in the host; version-based checks are coarse compared with capabilities.
- **Recommendation: A**, with C added if T11 chooses a manifest. B stays for specifiers.

**Open questions.** Where should the capability list be documented so it is generated from the code? Should absent capabilities be listed explicitly for the page versus desktop?

---

# Appendices

## Appendix A: reproduction recipes (OUR side), with real output

Environment: node v24.7.0, pnpm 12.15.0, vitest 5.0.3, d3 7.9.0, linkedom 0.18.14, DT HEAD `a4ca7e2`. All commands were run by the writer in this work. `$SP` = the scratchpad path in the header. Scripts that import repo files use Vite's SSR loader and write nothing to the repo.

| # | Claim | Command | Real output |
|---|---|---|---|
| A1 | The whole suite passes | `cd /home/kantord/repos/dotfiles-tauler && npx vitest run` | `Tests 723 passed \| 1 skipped (724)`, 5.81 s |
| A2 | Golden keys are stable in Node (T13) | `npx vitest run charts/test/gaps/state-determinism` | `Test Files 1 passed (1)`, `Tests 7 passed (7)` |
| A3 | The timing gates pass | `npx vitest run charts/test/bench` | `Tests 4 passed (4)`, 3.34 s |
| A4 | Scene cost in Node (T6, T3) | `node $SP/scenecost.mjs` | `compile(reference plot, 60 rows): median 0.65 ms` and `compile(reference plot, 500 rows): median 1.77 ms` |
| A5 | Text width error vs real fonts (T1) | `python3 -I $SP/textwidth.py <font.ttf> 12 <texts>` against `node $SP/textwidth-ours.mjs <texts>` | see table below |
| A6 | themeColor mismatch (T12) | `cd $SP/tc && cargo run --offline -q` and `node $SP/drift-theme.mjs` | see T12 |
| A7 | flatten drift (T12, T8) | `node $SP/drift-flatten.mjs` | see T12 |
| A8 | The drift changes a figure key (T12, T13) | `node $SP/drift-key.mjs` | `DT rgba() ... key = 1ok2ydcvsyj` vs `real #rrggbbaa ... key = 70bbs8yopm` |
| A9 | Root index cannot load in Node (T11) | `node $SP/rootindex.mjs` | `/charts/index.jsx OK, 81 exports` and `/index.jsx FAILS: Cannot find module '@ui/icon' imported from '.../display/WeatherSummary.jsx'` |
| A10 | Export list and smoke test for extra d3 modules (T9) | `node $SP/gen-exports.mjs <d3.min.js> <extra.min.js>` | sankey: six names plus smoke `[["a",0,0,50],["b",45,0,50],["c",90,0,25]]`; hexbin: `["hexbin"]` |
| A11 | d3 file equals the tauler pin (T9, T13) | `sha256sum node_modules/d3/dist/d3.min.js ~/.cache/tauler/d3/d3.min.js` | both `f2094bbf6141b359722c4fe454eb6c4b0f0e42cc10cc7af921fc158fceb86539` |
| A12 | Library vs d3 line counts (T9) | `wc -l charts/hexbin.jsx charts/flow.jsx` | `51`, `107`, `158 total` |
| A13 | Host fonts (T1, T2) | `fc-match sans-serif file family`, `fc-match monospace file family` | `Noto Sans:file=/usr/share/fonts/noto/NotoSans-Regular.ttf`, `Noto Sans Mono:file=/usr/share/fonts/noto/NotoSansMono-Regular.ttf` |

A5 detail (12 px, advance sums from `hmtx`, no kerning; "ours" is `measureFor` from a verbatim copy of `DT:charts/fonts.jsx` since it has no JSX syntax). The Liberation table is the library's default for `sans-serif`; the host's own `sans-serif` is Noto Sans, so this is the error a figure on this machine would have if its SVG text used the host default:

| text | ours sans-serif | Noto Sans (fc-match) | error | Roboto | error |
|---|---|---|---|---|---|
| `CPU 42%` | 52.68 | 50.44 | +4.4% | 48.42 | +8.8% |
| `Memory used` | 72.68 | 77.64 | -6.4% | 72.87 | -0.3% |
| `The quick brown fox` | 107.38 | 114.46 | -6.2% | 108.04 | -0.6% |
| `iiiiiiii` | 21.31 | 24.77 | -14.0% | 23.34 | -8.7% |
| `WWWWWWWW` | 90.62 | 89.28 | +1.5% | 85.17 | +6.4% |

For monospace, ours gives `50.4 79.2 136.8 57.6 57.6` and Noto Sans Mono gives the identical `50.4 79.2 136.8 57.6 57.6`; that is why the library says a monospace face is exact (`DT:charts/theme.jsx:8`). Takumi's own layout text and usvg's SVG text were NOT measured here (no tauler run).

Not run (and why): the tauler tracer (`cargo run --release --example d3_charts_tracer`) and any tauler test or binary, per the "never run bare tauler" constraint and the no-edit rule; `UPDATE_GOLDEN=1` (it rewrites a repo file).

## Appendix B: inventory of workarounds in the library (DT:)

| Workaround | Where | Request it would remove |
|---|---|---|
| Own cyrb53 hash for keys and clip ids | `DT:charts/scene.jsx:89-100` (`hash53`), used `DT:charts/core.jsx:291`, `DT:charts/Plot.jsx:24`, `DT:charts/positions.jsx:124,141` | T3 |
| Scene compiled in the layout every Tick to get a key (no `key` mode) | `DT:charts/Plot.jsx:27-31` | T3, T6 |
| Caller-supplied `key=` path for big windows | `DT:charts/Plot.jsx:20-26` | T3, T4 |
| Estimated text width (advance tables, 0.6 em mono) | `DT:charts/fonts.jsx` (whole file), `DT:charts/core.jsx:32-34,289` (`env.measure`), used in `DT:charts/guides.jsx:31-83`, `DT:charts/text.jsx:20-29` | T1 |
| Font-stack to table guess | `DT:charts/fonts.jsx:21-27` (`KINDS`, `kindOf`) | T1, T2 |
| Mark descriptors use `mark`/`$`, never `type`/`props`, to dodge the reshape | `DT:charts/core.jsx:38-47` (`defineMark` returns `{ $: 'mark', mark: name, ..., props }`) | T8 |
| Scene rounding to 2 decimals for key stability | `DT:charts/scene.jsx:103-108` (`round`, `tidy`), `DT:charts/core.jsx:276-278`, `DT:charts/marks.jsx:72,174,211`, `DT:charts/typeset.jsx:46`, `DT:charts/guides.jsx:123` | T7 |
| UTC-only time scales and ticks | `DT:charts/scales.jsx:162`, `DT:charts/ticks.jsx:26,28`, `DT:charts/domains.jsx:19-22`, `DT:charts/legend.jsx:14`, `DT:charts/stats.jsx:19`; test TZ pinned `DT:vitest.config.js:6` | T7 |
| "Never call `new Date()` in the layout" rule | `DT:charts/Plot.jsx:9-11` | T16 |
| `themeColor` returns an unknown name unchanged, so `chartTheme` filters | `DT:charts/theme.jsx:11-12` | T2/T12 |
| Own hexbin and flow instead of d3-hexbin/d3-sankey | `DT:charts/hexbin.jsx`, `DT:charts/flow.jsx`, `DT:charts/SPEC.md:120-152` | T9 |
| Second index file listing chart names; alias in vitest | `DT:charts/index.jsx`, `DT:index.jsx:26-33`, `DT:vitest.config.js:10`, test `DT:charts/examples/examples.test.jsx:27`, `DT:charts/test/usability.test.jsx:35` | T11 |
| Test copy of the runtime | `DT:test/tauler.js`, `DT:charts/examples/palettes.js:20-27`, `DT:charts/examples/examples.test.jsx:74-75` | T12 |
| Golden keys file, tauler side missing | `DT:charts/test/golden-keys.json`, `DT:charts/test/gaps/state-determinism.test.jsx:90-111`, `DT:charts/SPEC.md:719-722` | T13 |
| Chart size passed by caller from duplicated constants | `~/.local/share/chezmoi/dot_config/tauler/lib/layout.js:4-16`, `components/StatusPanel.jsx:8,51` (read-only) | T14 |
| Tooltip drawn from a datum given as data; no pointer | `DT:charts/recipes/tooltip.jsx` | T15 |
| Timing gates for layout cost (no host budget) | `DT:charts/test/bench.js` (`BUDGET`, `costOf`), `DT:charts/test/bench.test.jsx` | T6 |
| README "Needs tauler 0.7.0 or later" | `DT:README.md:335` | T18 |
| Filter region = box +20%; flat line cannot be filtered, documented | `DT:charts/defs.jsx:4-6,36` | T17 |

## Appendix C: claims table

| Claim | Status | Evidence |
|---|---|---|
| Only `"d3"` is a pinned third-party module; the fetcher holds exactly two assets | VERIFIED (read) | `fetch.rs:35-46,98`, `assets.rs:26-52` |
| d3-hexbin and d3-sankey are BSD-3-Clause | VERIFIED | local `package.json` and `LICENSE` of both (minglish copies) |
| Both UMD builds extend the existing `d3` and work against the real d3 7.9.0 file | VERIFIED (run) | A10 |
| Adding a pinned module takes seven steps in Rust | INFERRED | notes C section 2 |
| A bare `import "d3"` works inside package files | INFERRED (production use by the owner suggests yes) | resolver order, `jsx.rs:757-760` |
| Real `themeColor` returns `#rrggbbaa`, clamps alpha, converts CSS names | VERIFIED (run, verbatim Rust) | A6 |
| Our `themeColorFor` returns `rgba(...)`, no clamp, no CSS names, `NaN` for `oklch` | VERIFIED (run) | A6 |
| The drift changes figure keys | VERIFIED (run, with a JS port of the real rule) | A8 |
| Real flatten iterates inherited keys and ignores string props; ours does not | VERIFIED (run on the two verbatim bodies) | A7 |
| `h` in tauler registers handlers; our harness does not | VERIFIED (read) | `jsx.rs:1121`, `globals.rs:139-149` |
| Root `index.jsx` cannot be loaded in Node | VERIFIED (run) | A9 |
| Package subpaths are not supported | VERIFIED (read) | `specifier.rs:42` |
| Golden keys are stable across Node runs | VERIFIED (run) | A2 |
| Golden keys match QuickJS | UNVERIFIED | no tauler run |
| Render runtime never runs `draw`, so `figure_calls` give the key without d3 draw | VERIFIED (read) | `globals.rs:322-340`, test about `jsx.rs:2162` |
| `Math` differs in QuickJS (glibc) versus V8 (fdlibm) in the last bit | INFERRED | `quickjs.c:49019,49047-49051`; no measurement |
| QuickJS has no `Intl`, uses process TZ | INFERRED | grep in notes D |
| Hover cannot be delivered; `on_drag` is X11-only | VERIFIED (read) | ADR 0020, `components.md` |
| Handler writes to `globals` cause a Tick | UNVERIFIED | `units.md:510` versus `jsx.rs:1333-1336` |
| Layout eval precedes takumi layout, so container size is unknowable | INFERRED (architecture) | ADR 0007/0044 |
| A Picture can be shown at another CSS size without a redraw | INFERRED | `picture.rs` raster key |
| Vendored resvg supports filters, masks, patterns, markers, gradients | VERIFIED (read the tree) | `takumi-core/src/resvg` |
| `foreignObject`, CSS animation, colour emoji unsupported | INFERRED | no parser hit |
| Missing font family in SVG text draws nothing | CORRECTED | true for standalone usvg 0.48.1; in tauler's real path the text draws, at an arbitrary weight of the primary face (tauler review) |
| A `tauler` version/capability global does not exist | VERIFIED (grep) | notes C section 6 |
| Text width of our tables vs Noto Sans / Roboto | VERIFIED (run) | A5 |
| Compile of the reference plot costs 0.65 ms (60 rows), 1.77 ms (500 rows) in Node | VERIFIED (run) | A4 |
| Same cost in QuickJS is about 12x | INFERRED | `d3_figure/mod.rs:69-72` (d3-force factor) |
| The test suite has 723 passing tests at `a4ca7e2` | VERIFIED (run) | A1 |

## Appendix D: questions for the maintainers

1. T9: Is a runtime-supplied (manifest) hash acceptable under ADR 0045, or must every pin be a reviewed constant? If constants only, is an official "extras" bundle (C) preferable to adding two assets (A)?
2. T9/T10: Does `import ... from "d3"` resolve inside package files on desktop, and will `import "d3"` be supported in the page (#683)?
3. T11: Should `@gh/o/r/<subpath>` be public API for any file, or only for files listed in a manifest?
4. T12: Is publishing `JsxEvaluator` and friends as a stable test surface intended? Would a `tauler test <dir>` command be accepted, and in what result format?
5. T13: Host the golden-key test in tauler (needs a source copy of the charts) or in our repo (needs the `tauler` crate by git)?
6. T14: Is "size after layout" (fill sizes plus a size argument to `draw`) compatible with ADR 0007's "nothing survives" and with the 10 ms hop budget?
7. T15: Is hover a permanent non-goal for the desktop path, and does the page runtime remain free to differ?
8. T16: Would `tauler-accumulate --stamp` and `ctx.now` be acceptable, and should `now` be UTC epoch seconds?
9. T17: Is `foreignObject` expected to stay unsupported, and is the vendored resvg version part of the contract?
10. T18: Where should the capability names be defined so docs and runtime cannot disagree?
11. Cross-cutting: Should `UnknownKey` and Draw errors be visible at `warn` (T5), and is there a plan for a layout-eval time limit (T6)?

## Appendix E: glossary

- **Tick**: one evaluation of the whole layout after a stream value changes (ADR 0007). Nothing survives between Ticks except `globals`.
- **Render runtime**: the QuickJS runtime that evaluates the layout on the main loop every Tick; `draw` never runs there.
- **Draw runtime**: a QuickJS runtime on its own thread that re-evaluates the layout, finds `draw` by key, runs it against d3 + linkedom and returns SVG markup (5 s limit).
- **Reconciler runtime**: the third QuickJS runtime, for Units (ADR 0034).
- **Page / web runtime**: the browser path (`tauler-web`), where the layout runs in the browser's JS engine and `draw` runs against a real `<svg>`.
- **D3Figure**: global component `({key, width, height, draw})` that returns an `<img src="tauler:picture/KEY">` and registers `draw`.
- **Key**: a string naming one Picture; unchanged key means no redraw (ADR 0044). Size is not part of it today (T4).
- **Picture**: the SVG markup the Draw runtime produced for a key, stored by the loop and rasterised at physical size by the Render worker.
- **FigureCall**: `{key, width, height}` read from the evaluated tree per figure (`jsx.rs:60-85`).
- **Pin**: a hash or commit that fixes a dependency: sha256 for the d3/linkedom assets, a commit in `tauler-pkg.lock` for packages.
- **Package**: a GitHub repo imported as `@gh/owner/repo`, entry `index.*` at its root, cached and pinned by commit (ADR 0041).
- **takumi**: tauler's renderer (layout and painting); contains a vendored resvg (0.48.1) for SVG.
- **usvg / resvg**: SVG parser (turns `<text>` into outlines) and rasteriser inside takumi.
- **linkedom**: DOM implementation without layout used by the Draw runtime; `getBBox` and similar measure nothing.
- **flatten / reshape**: the rule that any object with both own keys `type` and `props` becomes a flat layout node `{type, ...props, children}` (`globals.rs:21-28`, `flatten.rs:23-60`).
- **themeColor**: global `(token, alpha) -> CSS colour string`, `#rrggbbaa` with alpha (`resolver.rs:81-124`).
- **cyrb53 / hash53**: the 53-bit non-cryptographic string hash used for our scene keys.
- **golden key**: a stored expected key for a fixed scene, to detect cross-runtime drift.
- **files_only**: font configuration option that restricts fonts to configured files so the font set is the same on every host (`config.rs:66-68`).
- **UMD**: a single-file JavaScript module format that attaches to a global; how d3 and the d3 plugins are distributed.
- **Drift**: a difference between a consumer's copy of runtime behaviour and the real runtime.

---

## Appendix F: probe sources (everything in Part 2 was run from these files)

All files are small and run offline. `$WORK` holds them; paths in the commands above refer to them by name. Sources of the Rust probes depend on the crates already in the local cargo registry (`rquickjs 0.14.0`, `usvg 0.48.1`, `sha2 0.11.1`, `serde_json`) and on `/home/kantord/repos/tauler` by path.

### 9.1 Font and text-width measurement

`fontwidth.py`

```python
"""Error of the library's sans advance table (charts/fonts.jsx, SANS) against other installed sans faces.
Run: python3 -I fontwidth.py /home/kantord/repos/dotfiles-tauler/charts/fonts.jsx
Needs fontTools. Advance sums only (hmtx), no kerning, no shaping: this is exactly what a table can know."""
import re, sys
from fontTools.ttLib import TTFont

FONTS = {
  'Liberation Sans': '/usr/share/fonts/liberation/LiberationSans-Regular.ttf',
  'Noto Sans':       '/usr/share/fonts/noto/NotoSans-Regular.ttf',
  'Roboto':          '/usr/share/fonts/TTF/Roboto-Regular.ttf',
  'Adwaita Sans':    '/usr/share/fonts/Adwaita/AdwaitaSans-Regular.ttf',
  'Atkinson Hyperlegible': '/usr/share/fonts/OTF/AtkinsonHyperlegible-Regular.otf',
}
LABELS = ['CPU', 'Memory 63%', 'Requests per second', '12:45', 'Mon 24 Oct', 'Quarterly revenue (USD)',
          'p99 latency, ms', '1,024 MiB', 'Net in', 'WWW', 'iiilll', 'Temperature -12.5 C',
          'Average request throughput by region', 'Disk /dev/nvme0n1p2']
assert len(LABELS) == 14

def advances(path):
    f = TTFont(path); cmap = f.getBestCmap(); hmtx = f['hmtx']; upm = f['head'].unitsPerEm
    return {chr(c): round(1000 * hmtx[cmap[c]][0] / upm) for c in range(32, 127) if c in cmap}

src = open(sys.argv[1], encoding='utf-8').read()
table = [int(n) for n in re.search(r'const SANS = \[([^\]]*)\]', src).group(1).replace('\n', ' ').split(',')]
ours = {chr(32 + i): w for i, w in enumerate(table)}
assert len(table) == 95

lib = advances(FONTS['Liberation Sans'])
print('table == Liberation Sans hmtx (rounded to 1/1000 em) for ASCII 32..126:', ours == lib,
      '(differences: %s)' % [c for c in ours if ours[c] != lib.get(c)])

width = lambda adv, s: sum(adv[c] for c in s)
print('\n%-22s %8s %8s %8s | per-glyph |err| mean  | 14 labels: mean  min  max  (table vs face, %%)' % ('face', 'glyph>0', 'glyph<0', 'glyphs'))
for name, path in FONTS.items():
    adv = advances(path)
    per_glyph = [(ours[c] - adv[c]) / adv[c] * 100 for c in ours if c in adv and adv[c]]
    errs = [(width(ours, s) - width(adv, s)) / width(adv, s) * 100 for s in LABELS]
    print('%-22s %8d %8d %8d | %8.1f%%          | %+6.1f %+6.1f %+6.1f' % (
        name, sum(e > 0 for e in per_glyph), sum(e < 0 for e in per_glyph), len(per_glyph),
        sum(abs(e) for e in per_glyph) / len(per_glyph), sum(errs) / len(errs), min(errs), max(errs)))
print('\nPer label (table width vs face width, %; positive = table too wide):')
print('%-40s' % 'label' + ''.join('%14s' % n.split()[0] for n in FONTS))
for s in LABELS:
    print('%-40s' % s + ''.join('%+13.1f%%' % ((width(ours, s) - width(advances(p), s)) / width(advances(p), s) * 100) for p in FONTS.values()))
flat = lambda s: len(s) * 600
print('\nOld flat 0.6 em vs Liberation Sans, 14 labels: mean %+.1f%%' % (sum((flat(s) - width(lib, s)) / width(lib, s) * 100 for s in LABELS) / 14))
```

`compare3.py`

```python
"""Noto Sans 11 px: hmtx advance sum (no kerning) vs the three engines' widths (printed by the probes), and our table.
Usage: python3 -I compare3.py labels.json takumi.tsv usvg.tsv chromium.tsv"""
import json, re, sys
from fontTools.ttLib import TTFont
labels = json.load(open(sys.argv[1]))
def load(p, col):  # tsv: label \t value...
    d = {}
    for line in open(p, encoding='utf-8'):
        if '\t' not in line: continue
        parts = line.rstrip('\n').split('\t'); m = re.findall(r'[\d.]+', parts[col]); d[parts[0].replace('done','')] = float(m[0])
    return d
takumi, usvg, chrome_canvas, chrome_dom = load(sys.argv[2], 1), load(sys.argv[3], 1), load(sys.argv[4], 1), load(sys.argv[4], 2)
f = TTFont('/usr/share/fonts/noto/NotoSans-Regular.ttf'); cmap = f.getBestCmap(); hm = f['hmtx']; upm = f['head'].unitsPerEm
hm_sum = lambda s: sum(hm[cmap[ord(c)]][0] for c in s) * 11 / upm
src = open('/home/kantord/repos/dotfiles-tauler/charts/fonts.jsx', encoding='utf-8').read()
tab = [int(n) for n in re.search(r'const SANS = \[([^\]]*)\]', src).group(1).replace('\n', ' ').split(',')]
ours = lambda s: sum(tab[ord(c) - 32] for c in s) * 11 / 1000
print('%-38s %8s %8s %8s %8s %8s %8s' % ('label (Noto Sans 11px)', 'takumi', 'usvg', 'canvas', 'dom', 'hmtx', 'table'))
mx = 0
for l in labels:
    row = (takumi[l], usvg[l], chrome_canvas[l], chrome_dom[l], hm_sum(l), ours(l))
    mx = max(mx, max(row[:4]) - min(row[:4]))
    print('%-38s %8.3f %8.3f %8.3f %8.3f %8.3f %8.3f' % ((l,) + row))
print('largest spread between the four engine widths for one label: %.3f px' % mx)
print('mean |hmtx sum - takumi| / takumi: %.2f%%' % (sum(abs(hm_sum(l) - takumi[l]) / takumi[l] for l in labels) / len(labels) * 100))
print('mean (table - takumi) / takumi: %+.1f%%' % (sum((ours(l) - takumi[l]) / takumi[l] for l in labels) / len(labels) * 100))
```

`measure.html`

```html
<!doctype html><meta charset=utf-8><body><pre id=out></pre><script>
const labels=["CPU", "Memory 63%", "Requests per second", "12:45", "Mon 24 Oct", "Quarterly revenue (USD)", "p99 latency, ms", "1,024 MiB", "Net in", "WWW", "iiilll", "Temperature -12.5 C", "Average request throughput by region", "Disk /dev/nvme0n1p2"]; const rows=[];
const c=document.createElement('canvas').getContext('2d'); c.font='11px "Noto Sans"';
document.fonts.load('11px "Noto Sans"').then(()=>{
 for(const l of labels){ const s=document.createElement('span'); s.style.cssText='font:11px "Noto Sans";white-space:nowrap;position:absolute'; s.textContent=l; document.body.appendChild(s);
   rows.push(l+'\t'+c.measureText(l).width.toFixed(3)+'\t'+s.getBoundingClientRect().width.toFixed(3)); }
 document.getElementById('out').textContent=rows.join('\n'); document.title='done'; });
</script>
```

`labels.json`

```json
["CPU", "Memory 63%", "Requests per second", "12:45", "Mon 24 Oct", "Quarterly revenue (USD)", "p99 latency, ms", "1,024 MiB", "Net in", "WWW", "iiilll", "Temperature -12.5 C", "Average request throughput by region", "Disk /dev/nvme0n1p2"]
```

### 9.2 Vitest scratch tests (run from the repo root; they import the repo by absolute path and write results to the file named by `OUT`)

`vitest.scratch.config.mjs`

```js
import { fileURLToPath } from 'node:url';
const R = '/home/kantord/repos/dotfiles-tauler';
// like the repo's vitest.config.js, but WITHOUT forcing TZ: the TZ comes from the environment
export default {
  root: R,
  server: { fs: { strict: false } },
  resolve: { alias: { '@gh/kantord/dotfiles-tauler': R + '/charts/index.jsx' } },
  oxc: { jsx: { runtime: 'classic', pragma: 'h', pragmaFrag: 'Fragment' } },
  test: { dir: fileURLToPath(new URL('.', import.meta.url)), include: ['**/*.scratch.{js,jsx}'], isolate: false, testTimeout: 60000 },
};
```

`cost.scratch.jsx`

```jsx
import { test } from 'vitest';
import { appendFileSync } from 'node:fs';
const out = s => appendFileSync(process.env.OUT, s + '\n');
import '/home/kantord/repos/dotfiles-tauler/test/tauler.js';
import { compile, hash53 } from '/home/kantord/repos/dotfiles-tauler/charts/core.jsx';
import { Plot } from '/home/kantord/repos/dotfiles-tauler/charts/Plot.jsx';
import { median, referenceProps } from '/home/kantord/repos/dotfiles-tauler/charts/test/bench.js';
import { resetFigures, figureKeys } from '/home/kantord/repos/dotfiles-tauler/test/tauler.js';

test('cost', () => {
  for (const rows of [50, 500, 5000]) {
    const props = referenceProps(rows);
    const tCompile = median(() => compile(props), 21);
    const tHash = median(() => hash53(JSON.stringify(compile(props).scene)), 21);   // compile already hashes; this is the extra JSON+hash cost alone
    const scene = compile(props).scene;
    const tJsonHash = median(() => hash53(JSON.stringify(scene)), 21);
    const noKey = median(() => { resetFigures(); Plot(props); }, 21);                 // layout eval of <Plot> without key: compile + hash + D3Figure
    const keyed = median(() => { resetFigures(); Plot({ ...props, key: 'k1' }); }, 21); // with key: D3Figure only, compile is deferred to draw
    const draw = median(() => { resetFigures(); Plot({ ...props, key: 'k1' }); }, 21);
    out(`rows=${rows}  compile=${tCompile.toFixed(2)} ms  JSON+hash(scene)=${tJsonHash.toFixed(2)} ms  scene bytes=${JSON.stringify(scene).length}  Plot no key (per Tick)=${noKey.toFixed(2)} ms  Plot with key (per Tick)=${keyed.toFixed(3)} ms`);
  }
});
```

`tz.scratch.jsx`

```jsx
import { test } from 'vitest';
import { appendFileSync } from 'node:fs';
import * as d3 from 'd3';
import '/home/kantord/repos/dotfiles-tauler/test/tauler.js';
import { compile } from '/home/kantord/repos/dotfiles-tauler/charts/core.jsx';
import { Text } from '/home/kantord/repos/dotfiles-tauler/charts/marks.jsx';
import { referenceProps } from '/home/kantord/repos/dotfiles-tauler/charts/test/bench.js';

const rows = [{ t: 1792850400, v: 1 }, { t: 1792850460, v: 2 }];   // epoch seconds, as a stream line would carry them (2026-10-24T14:00:00Z)
const label = f => compile({ width: 120, height: 60, data: rows, x: 'v', y: 'v',
  children: [<Text x="v" y="v" text={d => f(new Date(d.t * 1000))} />] });

test('scene key under TZ=' + process.env.TZ, () => {
  const lib = compile(referenceProps(60));                  // the library's own time axis: UTC throughout
  const local = label(d3.timeFormat('%H:%M'));              // a consumer label with d3's LOCAL time format
  const utc = label(d3.utcFormat('%H:%M'));                 // the same with the UTC format
  const text = r => r.scene.front.find(s => s.t === 'text')?.text;
  appendFileSync(process.env.OUT, `TZ=${process.env.TZ}  library axis key=${lib.key}  timeFormat label=${text(local)} key=${local.key}  utcFormat label=${text(utc)} key=${utc.key}\n`);
});
```

`size.scratch.jsx`

```jsx
import { test } from 'vitest';
import { appendFileSync } from 'node:fs';
import { resetFigures, figureKeys, drawFigure } from '/home/kantord/repos/dotfiles-tauler/test/tauler.js';
import { compile } from '/home/kantord/repos/dotfiles-tauler/charts/core.jsx';
import { Plot } from '/home/kantord/repos/dotfiles-tauler/charts/Plot.jsx';
import { referenceProps } from '/home/kantord/repos/dotfiles-tauler/charts/test/bench.js';
const out = s => appendFileSync(process.env.OUT, s + '\n');

test('size and key', () => {
  const p = referenceProps(60);
  out('scene key at 248x110: ' + compile(p).key + '   at 300x110: ' + compile({ ...p, width: 300 }).key + '   at 248x110 again: ' + compile(p).key);
  resetFigures();
  Plot({ ...p, key: 'cpu' }); Plot({ ...p, width: 300, key: 'cpu' });   // the same caller key at two sizes
  out('figure keys registered: ' + JSON.stringify(figureKeys()));
  out('harness drawFigure("cpu") size: ' + drawFigure('cpu').match(/<svg[^>]*>/)[0]);
  resetFigures();
  Plot(p); Plot({ ...p, width: 300 });
  out('no key, two sizes -> figure keys: ' + JSON.stringify(figureKeys()));
});
```

`flatten.scratch.jsx`

```jsx
import { test } from 'vitest';
import { appendFileSync } from 'node:fs';
import '/home/kantord/repos/dotfiles-tauler/test/tauler.js';
const out = (label, v) => appendFileSync(process.env.OUT, label + ' => ' + JSON.stringify(v) + '\n');

test('reshaping', () => {
  const row = { type: 'deploy', props: { env: 'prod', n: 3 }, at: 17 };      // a data row: a stream line that happens to have both keys
  const Row = () => row;                                                     // a component that returns data
  out('A  h(Row) returns the row object', h(Row, {}));
  out('B  same row, extra key `at` survives?', 'at' in h(Row, {}));
  const Plain = () => ({ kind: 'deploy', attrs: row.props });
  out('C  same data under other key names', h(Plain, {}));
  out('D  <div type="wallpaper"> (prop `type` replaces tag)', h('div', { type: 'wallpaper' }));
  out('E  a row as a prop value of a string tag (JS side only)', h('div', { data: row }));
  out('F  array of rows returned from a component', h(() => [row, row], {}));
});
```

### 9.3 The real tauler runtimes (`$WORK/tp`; scenarios `env`, `keys`, `golden`, `cost`, `globals`, `takumi-text`) and the chart library as a layout module

`tp/Cargo.toml`

```toml
[package]
name = "tauler-probe"
version = "0.0.0"
edition = "2021"
[dependencies]
tauler = { path = "/home/kantord/repos/tauler" }
serde_json = "1"
[workspace]
```

`tp/src/main.rs`

```rust
//! Probe of the REAL tauler render and Draw runtimes (tauler lib at the path in Cargo.toml), offline:
//! d3 and linkedom come from TAULER_D3_DIR (a copy of ~/.cache/tauler/d3). Not the bar, no X11, no bare `tauler` binary.
//! usage: tauler-probe <scenario> [lib.js]
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{mpsc, Arc};
use std::time::{Duration, Instant};
use tauler::d3_figure::draw::TIME_LIMIT;
use tauler::d3_figure::fetch::Fetcher;
use tauler::jsx::JsxEvaluator;
use tauler::pkg::{fetch_manager::FetchManager, PackageContext};

fn pkg(base: &Path) -> PackageContext {
    let (tx, _rx) = mpsc::channel();
    let dir = PathBuf::from(std::env::var("TAULER_D3_DIR").expect("TAULER_D3_DIR"));
    let fetcher = Fetcher::offline(dir);
    assert!(fetcher.sources().is_some(), "TAULER_D3_DIR holds no verified d3 + linkedom");
    PackageContext { fetch_manager: Arc::new(FetchManager::new(tx)), lockfile_path: base.join("tauler-pkg.lock"), cache_root: base.join(".data/pkg-cache"), d3: Arc::new(fetcher) }
}
fn ms(t: Instant) -> f64 { t.elapsed().as_secs_f64() * 1000.0 }
fn median(mut v: Vec<f64>) -> f64 { v.sort_by(|a, b| a.partial_cmp(b).unwrap()); v[v.len() / 2] }
fn render(src: &str, base: &Path) -> JsxEvaluator { JsxEvaluator::new_with_packages(src, serde_json::Value::Null, Some(base), pkg(base)).expect("render runtime") }
fn draw(src: &str, base: &Path) -> JsxEvaluator {
    let ev = JsxEvaluator::new_draw(src, serde_json::Value::Null, Some(base), Default::default(), Some(pkg(base))).expect("draw runtime");
    ev.eval(&HashMap::new()).expect("draw eval"); ev
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let scenario = args[1].as_str();
    let base = std::env::temp_dir().join("tauler-probe-base"); std::fs::create_dir_all(&base).unwrap();
    let none = HashMap::new();
    match scenario {
        // T7 / T8: what the real render runtime does to dates, Math, Intl, d3, and to data objects with `type` and `props`.
        "env" => {
            let src = r#"
const row = { type: "deploy", props: { env: "prod" }, at: 17 };
const Row = () => row;
export default function render() {
  const t = new Date(Date.UTC(2026, 9, 24, 12));
  const info = { intl: typeof Intl, d3: typeof d3, window: typeof window, hours: t.getHours(), offset: t.getTimezoneOffset(), cos: Math.cos(0.1), exp: Math.exp(0.7), sinh: Math.sinh(0.3), toFixed: (1.005).toFixed(2), random: typeof Math.random() };
  return <div info={JSON.stringify(info)} data={row}><Row /></div>;
}"#;
            let out = render(src, &base).eval(&none).expect("eval");
            println!("{}", out.layout);
        }
        // T4 / T5: same key at two sizes in one tree; a key the Draw runtime cannot reproduce.
        "keys" => {
            let src = r#"
export default function render() {
  return <div>
    <D3Figure key="same" width={100} height={50} draw={svg => svg.append("circle").attr("r", 1)} />
    <D3Figure key="same" width={200} height={80} draw={svg => svg.append("circle").attr("r", 2)} />
    <D3Figure key={"rand" + Math.random()} width={10} height={10} draw={() => {}} />
    <D3Figure key={"now" + Date.now()} width={10} height={10} draw={() => {}} />
  </div>;
}"#;
            let r = render(src, &base).eval(&none).expect("render eval");
            println!("render runtime figure_calls: {:?}", r.figure_calls);
            let d = draw(src, &base);
            for c in &r.figure_calls {
                match d.draw_figure(&c.key, c.width, c.height, TIME_LIMIT) {
                    Ok(svg) => println!("draw {:?} {}x{} -> Ok {}", c.key, c.width, c.height, svg),
                    Err(e) => println!("draw {:?} {}x{} -> Err({:?}) \"{}\"", c.key, c.width, c.height, e, e),
                }
            }
        }
        // T13-ish / T7: golden keys computed by the library inside the real render runtime and the real Draw runtime.
        "golden" => {
            let lib = std::fs::read_to_string(&args[2]).unwrap();
            let src = format!("{lib}\nexport default function render() {{ return <div>{{JSON.stringify(goldenKeys())}}</div>; }}");
            println!("render runtime: {}", render(&src, &base).eval(&none).expect("eval").layout);
            println!("draw runtime:   {}", draw(&src, &base).eval(&none).expect("eval").layout);
        }
        // T3 / T6: real cost of <Plot> in the render runtime per Tick, with and without `key`, and of draw in the Draw runtime.
        "cost" => {
            let lib = std::fs::read_to_string(&args[2]).unwrap();
            let rows: usize = args[3].parse().unwrap();
            for (name, call) in [("no key", "Plot(props)"), ("with key", "Plot({ ...props, key: 'fixed-' + ROWS })")] {
                let src = format!("{lib}\nconst ROWS = {rows};\nconst props = referenceProps(ROWS);\nexport default function render() {{ return <div>{{{call}}}</div>; }}");
                let t = Instant::now(); let ev = render(&src, &base); let load = ms(t);
                let first = ev.eval(&none).expect("eval");
                let times: Vec<f64> = (0..21).map(|_| { let t = Instant::now(); ev.eval(&none).expect("eval"); ms(t) }).collect();
                let key = first.figure_calls[0].key.clone();
                let d = draw(&src, &base);
                let dt: Vec<f64> = (0..11).map(|_| { let t = Instant::now(); d.draw_figure(&key, 248.0, 110.0, TIME_LIMIT).expect("draw"); ms(t) }).collect();
                let de: Vec<f64> = (0..11).map(|_| { let t = Instant::now(); d.eval(&none).expect("draw eval"); ms(t) }).collect();
                let svg = d.draw_figure(&key, 248.0, 110.0, TIME_LIMIT).unwrap();
                println!("rows={rows:5} {name:8}: module load {load:7.1} ms | render-runtime eval median {:7.2} ms (min {:6.2}) | key {key} | draw_figure median {:7.2} ms | Draw-runtime layout eval per round {:7.2} ms | svg {} bytes",
                    median(times.clone()), times.iter().cloned().fold(f64::MAX, f64::min), median(dt), median(de), svg.len());
            }
        }
        // T1: takumi layout text width of each label (the width the layout engine gives a nowrap block), Noto Sans only.
        "takumi-text" => {
            let font = std::env::var("FONT_FILE").unwrap();
            let labels: Vec<String> = serde_json::from_str(&std::fs::read_to_string(&args[2]).unwrap()).unwrap();
            let size: f64 = args[3].parse().unwrap();
            let cfg = tauler::config::FontConfig { primary_path: Some(font), files_only: true, ..Default::default() };
            tauler::init_global_ctx(cfg.clone()); tauler::reload_font_config(cfg);
            for l in labels {
                let tree = serde_json::json!({"type":"div","style":{"display":"flex","width":2000,"height":100},
                    "children":[{"type":"div","style":{"fontFamily":"sans-serif","fontSize":size,"whiteSpace":"nowrap"},"children":[l]}]});
                let boxes = tauler::hit_test::painted_boxes(&tree, 2000, 100, 1.0);
                let w = boxes.iter().find(|(p, _)| p == &vec![0usize]).map(|(_, r)| r.width);
                println!("{}\t{:?}", l, w);
            }
            // cost of one uncached measurement through the hit_test machinery (new scene per call)
            let tree = serde_json::json!({"type":"div","style":{"display":"flex","width":2000,"height":100},
                "children":[{"type":"div","style":{"fontFamily":"sans-serif","fontSize":size,"whiteSpace":"nowrap"},"children":["Average request throughput by region"]}]});
            let n = 500; let t = Instant::now();
            for _ in 0..n { let _ = tauler::hit_test::painted_boxes(&tree, 2000, 100, 1.0); }
            eprintln!("uncached painted_boxes call: {:.3} ms each (n={n}, release)", ms(t) / n as f64);
        }
        // T3 / T16 / T18: which globals the render and Draw runtimes have today.
        "globals" => {
            let src = r#"export default function render() {
  return <div>{JSON.stringify({ hash: typeof hash, sh: typeof sh, measureText: typeof measureText, tauler: typeof tauler, useNow: typeof useNow, useMemo: typeof useMemo, renderTemplate: typeof renderTemplate, themeColor: typeof themeColor })}</div>;
}"#;
            println!("render runtime: {}", render(src, &base).eval(&none).expect("eval").layout);
            println!("draw runtime:   {}", draw(src, &base).eval(&none).expect("eval").layout);
        }
        _ => panic!("unknown scenario"),
    }
    let _ = Duration::from_secs(0);
}
```

`lib-entry.jsx`

```jsx
// The chart library as one ES module for a tauler layout: Plot (no test shim: tauler provides h and D3Figure),
// the reference plot of charts/test/bench.js, and the three golden scenes.
import * as d3 from 'd3';
import { compile, Scale } from '/home/kantord/repos/dotfiles-tauler/charts/core.jsx';
import { Line, Rect, Arc } from '/home/kantord/repos/dotfiles-tauler/charts/marks.jsx';
import { kde } from '/home/kantord/repos/dotfiles-tauler/charts/stats.jsx';
export { Plot } from '/home/kantord/repos/dotfiles-tauler/charts/Plot.jsx';
export { referenceProps } from '/home/kantord/repos/dotfiles-tauler/charts/test/bench.js';
const scenes = {
  'rounding-boundary': () => ({ width: 100.5, height: 60, data: [{ k: 'a', v: 1.005 }, { k: 'b', v: 2.675 }], x: 'k', y: 'v', margin: { left: 0, right: 0, top: 0, bottom: 0 }, children: [<Rect width={6} />, <Scale channel="y" domain={[0, 3.015]} />] }),
  'trig-arc': () => ({ width: 120, height: 120, data: [{ v: 3 }, { v: 5 }, { v: 2 }], children: [<Arc value="v" color="v" />] }),
  'kde-line': () => ({ width: 200, height: 100, data: kde(d3.range(30).map(i => 10 + 5 * Math.sin(i * 1.3) + (i % 4)), { value: d => d, points: 25 }), x: 'x', y: 'density', children: [<Line />] }),
};
export const goldenKeys = () => Object.fromEntries(Object.entries(scenes).map(([n, make]) => [n, compile(make()).key]));
```

`build-lib.mjs`

```js
import { build } from '/home/kantord/repos/dotfiles-tauler/node_modules/vite/dist/node/index.js';
const R = '/home/kantord/repos/dotfiles-tauler';
await build({ root: R, logLevel: 'warn', configFile: false,
  resolve: { alias: { d3: R + '/node_modules/d3/src/index.js' } },
  oxc: { jsx: { runtime: 'classic', pragma: 'h', pragmaFrag: 'Fragment' } },
  build: { outDir: new URL('./libbundle', import.meta.url).pathname, emptyOutDir: true, minify: false, target: 'es2020',
    lib: { entry: new URL('./lib-entry.jsx', import.meta.url).pathname, formats: ['es'], fileName: () => 'lib.js' } } });
```

### 9.4 usvg 0.48.1 probe (`$WORK/us`; run `cp $WORK/tp/Cargo.lock $WORK/us/` first)

`us/Cargo.toml`

```toml
[package]
name = "usvg-probe"
version = "0.0.0"
edition = "2021"
[dependencies]
usvg = "=0.48.1"
serde_json = "1"
[workspace]
```

`us/src/main.rs`

```rust
// What usvg 0.48.1 does with an SVG <text> for various font-family values, when its fontdb holds exactly what
// tauler registers (build_svg_fontdb: every registered face + generics sans-serif and monospace; NO serif generic).
// usage: usvg-probe sans.ttf mono.ttf labels.json   |   usvg-probe --families sans.ttf mono.ttf
use std::sync::Arc;
fn find_text(g: &usvg::Group) -> Option<f32> {
    for n in g.children() {
        match n {
            usvg::Node::Text(t) => return Some(t.bounding_box().width()),
            usvg::Node::Group(g) => if let Some(w) = find_text(g) { return Some(w) },
            _ => {}
        }
    }
    None
}
fn db(sans: &str, mono: &str) -> Arc<usvg::fontdb::Database> {
    let mut db = usvg::fontdb::Database::new();
    db.load_font_file(sans).unwrap(); db.load_font_file(mono).unwrap();
    db.set_sans_serif_family("Noto Sans"); db.set_monospace_family("Noto Sans Mono");
    // serif, cursive, fantasy are left at fontdb's defaults ("Times New Roman" ...): not installed in this db.
    Arc::new(db)
}
fn width(opt: &usvg::Options, family: &str, text: &str) -> Option<f32> {
    let svg = format!(r#"<svg xmlns="http://www.w3.org/2000/svg" width="400" height="40"><text x="0" y="20" font-family="{family}" font-size="11">{text}</text></svg>"#);
    let tree = usvg::Tree::from_str(&svg, opt).unwrap();
    find_text(tree.root())
}
fn main() {
    let a: Vec<String> = std::env::args().collect();
    let mut opt = usvg::Options::default();
    if a[1] == "--families" {
        opt.fontdb = db(&a[2], &a[3]);
        for fam in ["sans-serif", "monospace", "serif", "'Noto Sans'", "'noto sans'", "DoesNotExist", "DoesNotExist, sans-serif", "DoesNotExist, monospace", "'JetBrains Mono'", "ui-monospace, monospace", "system-ui", "Helvetica, sans-serif", "Helvetica"] {
            println!("{:28} -> {:?}", fam, width(&opt, fam, "Hello"));
        }
        return;
    }
    opt.fontdb = db(&a[1], &a[2]);
    let labels: Vec<String> = serde_json::from_str(&std::fs::read_to_string(&a[3]).unwrap()).unwrap();
    for l in labels { println!("{}\t{:?}", l, width(&opt, "sans-serif", &l.replace('&', "&amp;"))); }
}
```

### 9.5 Bare QuickJS (`$WORK/qjs`) and the golden scenes as an IIFE

`qjs/Cargo.toml`

```toml
[package]
name = "qjs-probe"
version = "0.0.0"
edition = "2021"
[dependencies]
rquickjs = { version = "=0.14.0" }
[workspace]
```

`qjs/src/main.rs`

```rust
// Runs a JS file in the same QuickJS (rquickjs 0.14.0 = quickjs-ng 0.16) that tauler embeds and prints the result.
// Not tauler itself: no host functions, no layout runtime. usage: qjs-probe file.js
use rquickjs::{Context, Runtime};
fn main() {
    let path = std::env::args().nth(1).expect("file.js");
    let src = std::fs::read_to_string(path).unwrap();
    let rt = Runtime::new().unwrap();
    let ctx = Context::full(&rt).unwrap();
    ctx.with(|c| {
        let v: rquickjs::Result<String> = c.eval(src);
        match v { Ok(s) => println!("{s}"), Err(e) => println!("ERR {e:?} {:?}", c.catch()) }
    });
}
```

`probe.js`

```js
(function(){
  const out = [];
  out.push('typeof Intl=' + typeof Intl);
  out.push('typeof Date=' + typeof Date + ' tzoffset(2026-10-24)=' + new Date(Date.UTC(2026,9,24,12)).getTimezoneOffset());
  out.push('local string=' + new Date(Date.UTC(2026,9,24,12)).toString());
  out.push('getHours of 12:00Z=' + new Date(Date.UTC(2026,9,24,12)).getHours());
  out.push('toLocaleString=' + (()=>{try{return new Date(Date.UTC(2026,9,24,12)).toLocaleString()}catch(e){return 'throws '+e}})());
  out.push('typeof window=' + typeof window + ' typeof document=' + typeof document + ' typeof globalThis.d3=' + typeof globalThis.d3);
  // 20 libm-sensitive values, printed with full precision
  const xs = [0.1, 0.5, 1, 1.3, 2.7, 10, 100, 1e5, 1e-5, 0.7853981633974483];
  for (const f of ['sin','cos','tan','exp','log','pow','atan2','sqrt','cbrt','sinh','tanh','expm1','log1p','asin','atan']) {
    let h = 0; const vals = [];
    for (let i = 0; i < 2000; i++) { const x = xs[i % xs.length] * (1 + i * 0.001237); let v;
      if (f==='pow') v = Math.pow(x, 1.7); else if (f==='atan2') v = Math.atan2(x, 3.1); else if (f==='asin') v = Math.asin(((x % 2) - 1)); else v = Math[f](x); vals.push(v); }
    out.push(f + ' ' + vals.slice(0,3).map(v=>v.toString()).join(',') + ' sum=' + vals.reduce((a,b)=>a+b,0).toString());
  }
  out.push('toFixed ' + [1.005.toFixed(2), 2.675.toFixed(2), (1e21).toFixed(2), (0.000001234).toFixed(8), 1.45.toFixed(1)].join(' '));
  out.push('round ' + [Math.round(1.005*100)/100, Math.round(-0.5), Math.round(2.5), Math.round(1.255*100)/100].join(' '));
  out.push('str ' + [0.1+0.2, 1/3, 1e21, 123456789012345680000, 5e-324, (123.456).toString(2).slice(0,20)].join(' '));
  return out.join('\n');
})()
```

`keycost.js`

```js
(function(){
  function hash53(str){let h1=0xdeadbeef,h2=0x41c6ce57;for(let i=0;i<str.length;i++){const c=str.charCodeAt(i);h1=Math.imul(h1^c,2654435761);h2=Math.imul(h2^c,1597334677);}
    h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);return 4294967296*(2097151&h2)+(h1>>>0);}
  const out=[];
  for (const n of [50,500,5000]) {
    const data = Array.from({length:n},(_,i)=>({t:1792850400+60*i,cpu:30+20*Math.sin(i/6),mem:55+5*Math.sin(i/20)}));
    const N = n>=5000?20:200; let s='', t=Date.now();
    for(let k=0;k<N;k++) s=JSON.stringify(data);
    const tj=(Date.now()-t)/N; t=Date.now(); let h;
    for(let k=0;k<N;k++) h=hash53(s);
    const th=(Date.now()-t)/N;
    out.push(`rows=${n} JSON.stringify(data) ${tj.toFixed(3)} ms  hash53(${s.length} chars) ${th.toFixed(3)} ms`);
  }
  return out.join('\n');
})()
```

`golden-entry.jsx`

```jsx
// The three golden scenes of charts/test/gaps/state-determinism.test.jsx (copied), run as one bundle in any JS engine.
import * as d3 from 'd3';
import '/home/kantord/repos/dotfiles-tauler/test/tauler.js';
import { compile, Scale } from '/home/kantord/repos/dotfiles-tauler/charts/core.jsx';
import { Line, Rect, Arc } from '/home/kantord/repos/dotfiles-tauler/charts/marks.jsx';
import { kde } from '/home/kantord/repos/dotfiles-tauler/charts/stats.jsx';
const scenes = {
  'rounding-boundary': () => ({ width: 100.5, height: 60, data: [{ k: 'a', v: 1.005 }, { k: 'b', v: 2.675 }], x: 'k', y: 'v', margin: { left: 0, right: 0, top: 0, bottom: 0 }, children: [<Rect width={6} />, <Scale channel="y" domain={[0, 3.015]} />] }),
  'trig-arc': () => ({ width: 120, height: 120, data: [{ v: 3 }, { v: 5 }, { v: 2 }], children: [<Arc value="v" color="v" />] }),
  'kde-line': () => ({ width: 200, height: 100, data: kde(d3.range(30).map(i => 10 + 5 * Math.sin(i * 1.3) + (i % 4)), { value: d => d, points: 25 }), x: 'x', y: 'density', children: [<Line />] }),
};
const keys = {}; for (const [n, make] of Object.entries(scenes)) keys[n] = compile(make()).key;
globalThis.__result = JSON.stringify(keys);
```

`build.mjs`

```js
import { build } from '/home/kantord/repos/dotfiles-tauler/node_modules/vite/dist/node/index.js';
const R = '/home/kantord/repos/dotfiles-tauler';
await build({ root: R, logLevel: 'warn', configFile: false,
  resolve: { alias: { d3: R + '/node_modules/d3/src/index.js', linkedom: new URL('./linkedom-stub.js', import.meta.url).pathname } },
  oxc: { jsx: { runtime: 'classic', pragma: 'h', pragmaFrag: 'Fragment' } },
  build: { outDir: new URL('./bundle', import.meta.url).pathname, emptyOutDir: true, minify: false, target: 'es2020',
    lib: { entry: new URL('./golden-entry.jsx', import.meta.url).pathname, formats: ['iife'], name: 'G', fileName: () => 'golden.js' } } });
```

`linkedom-stub.js`

```js
export const parseHTML = () => { throw new Error('stub'); };
```

### 9.6 SHA-256 timing (`$WORK/sha`; `cp $WORK/tp/Cargo.lock $WORK/sha/` first)

`sha/Cargo.toml`

```toml
[package]
name = "sha-probe"
version = "0.0.0"
edition = "2021"
[dependencies]
sha2 = "=0.11.1"
[workspace]
```

`sha/src/main.rs`

```rust
use sha2::{Digest, Sha256};
use std::time::Instant;
fn main() {
    for n in [3236usize, 32805, 328372] {
        let s: String = (0..n).map(|i| (b'a' + (i % 26) as u8) as char).collect();
        let iters = 2000;
        let t = Instant::now();
        let mut x = 0u8;
        for _ in 0..iters { let d = Sha256::digest(s.as_bytes()); x ^= d[0]; }
        println!("sha256 of {n} bytes: {:.4} ms ({x})", t.elapsed().as_secs_f64() * 1000.0 / iters as f64);
    }
}
```

### 9.7 The real `flatten_passthrough` (`$WORK/fl`)

`fl/Cargo.toml`

```toml
[package]
name = "flatten-probe"
version = "0.0.0"
edition = "2021"
[dependencies]
tauler-core = { path = "/home/kantord/repos/tauler/tauler-core", default-features = false }
serde_json = "1"
[workspace]
```

`fl/src/main.rs`

```rust
// Calls the real tauler_core::flatten::flatten_passthrough (the whole-tree pass jsx.rs:1358 runs on every eval).
use serde_json::json;
fn main() {
    let row = json!({"type":"deploy","props":{"env":"prod","n":3},"at":17});
    // case E: a data row nested as a prop value; case F: an array of rows; case G: a row inside a deeper object
    let tree = json!({"type":"div","data":row,"rows":[row, row],"deep":{"inner":{"x":row}},"children":[]});
    println!("{}", tauler_core::flatten::flatten_passthrough(tree));
}
```

---

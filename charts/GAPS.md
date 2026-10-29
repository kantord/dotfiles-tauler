# charts: gaps and work list

Every planned item is built, and the usability findings below are implemented. The stress-test findings (SPEC 7.1, 7.2) each have a green example in
`charts/test/gaps/` (specified in `charts/GAP-EXAMPLES.md`), and the design of each is in the SPEC
(sections 5 and 6). A new gap gets a red example first (`test.fails`), then a fix, as before; add an
item here only while one is open.

## Usability findings (implemented)

The findings collected while writing the user-facing examples (`charts/examples/`) are implemented and
specified in the SPEC (5.1, 5.2, 5.7, 5.12, 6); their tests are in `charts/test/usability.test.jsx`. Principle
adopted: **loud on programmer mistakes** (unknown channel, missing scale, impossible size, a mark that can
never draw), **quiet on data-dependent conditions** (six categories, long labels, bad rows): an unattended
status bar is never blanked by data.

**Decided, no change** (recorded in the SPEC): years print as `2,020` (use `format=".0f"`); the palette repeats
past five colours and the legend shows it; `Text text="field"` is literal; `Scale nice` stays the default (a default change
moves every snapshot; `nice={false}` is the opt-out); no automatic dot inset (marks clip with a 4 px bleed; use
`rangePad`); the `key` channel keeps its name; `charts/index.jsx` keeps its tested duplicate of the root list; no runtime
logging of defaults. **Still open, deferred until a failing example forces it:** thinning versus rotating band labels,
the `width/3` cap on y tick labels, wrapping legend labels, default axes for radar and rose, a `labelRoom` option for
`tree()`.

## Non-goals (host constraints only)

- In-figure interactivity, and animation: a figure is a static Picture (ADR 0044).
- A dataframe: data is plain JSON (ADR 0013).

## Housekeeping

- Agents do not commit; they stage and print the commit command.
- The README's chart sections link to the SPEC for the pipeline and must not restate it.

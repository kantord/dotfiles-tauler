# charts: gaps and work list

Every planned item is built. The stress-test findings (SPEC 7.1, 7.2) each have a green example in
`charts/test/gaps/` (specified in `charts/GAP-EXAMPLES.md`), and the design of each is in the SPEC
(sections 5 and 6). A new gap gets a red example first (`test.fails`), then a fix, as before; add an
item here only while one is open.

## Non-goals (host constraints only)

- In-figure interactivity, and animation: a figure is a static Picture (ADR 0044).
- A dataframe: data is plain JSON (ADR 0013).

## Housekeeping

- Agents do not commit; they stage and print the commit command.
- The README's chart sections link to the SPEC for the pipeline and must not restate it.

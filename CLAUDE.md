# CLAUDE.md

A public tauler package: `import { ... } from "@gh/kantord/dotfiles-tauler"`.
See `README.md` for what each folder holds.

## What belongs here

Only generic building blocks: config schemas, base components, and components
that take props. Nothing personal: no keybinds, fonts, monitor names, script
paths or other values from one person's setup. Those belong in the layout
that uses the package, passed in as props or children.

For a config file, the pattern is `units/I3Config.jsx`: a component made with
`lib/schemaFile.jsx` that takes a `path` prop and the file's content as
children. The schema's components are exported from `index.jsx`, so a layout
never imports a schema by path and never copies a schema file.

```jsx
<I3Config path="~/.config/i3/config">
  <Set name="$mod" value="Mod4" />
</I3Config>
```

`units/KittyConfig.jsx` and `units/RofiConfig.jsx` hold fixed values and take
no props. They are legacy. Do not copy them for a new unit.

## Facts that are easy to get wrong

- A tauler unit takes no props (tauler ADR 0040), but a plain component can
  take props, functions included (`apply`), and call `ConfigFile()` during
  render. `schemaFile` does this.
  A new unit on every render is fine: tauler collects units from the rendered
  tree on every Sweep, and a file is written only when its content differs.
- A layout can import only from `index.jsx`. Anything a layout needs must be
  exported there. `index.jsx` can re-export from a `.schema.yaml` file.
- `index.jsx` is one flat namespace. Check for a name clash before exporting
  a schema's components (the i3 `Bar` is exported as `I3Bar`).

## Checks

`pnpm test` (Vitest). It does not load schemas or run units; those are
verified against tauler itself.

# dotfiles-tauler

Status bar and desktop-config components for [tauler](https://github.com/kantord/tauler),
split out of my dotfiles so they can be used on their own.

These are not React components. They render inside tauler's own JSX runtime,
which renders HTML elements — `<div>`, `<span>` — and reads data through
`useJSONStream`, so they only work under tauler.

## Installing

On a tauler build that supports git-based Packages (`@gh/owner/repo` imports —
see [tauler issue #554](https://github.com/kantord/tauler/issues/554)):

```jsx
import { WeatherCard, KittyConfig, RofiConfig, RofiTheme, RecentFilesTheme } from "@gh/kantord/dotfiles-tauler";
```

tauler clones this repo, pins it to a commit in a `tauler-pkg.lock` file next
to your layout file, and re-fetches only when you run `tauler pkg update`.
No copying files around.

On an older tauler without Packages, copy the file(s) you want into
`~/.config/tauler/components/` and import them from there instead — every
component in this repo has no dependency on the others except where noted
below.

## Components

### WeatherCard

Current conditions from [wttr.in](https://wttr.in): temperature, feels-like, a
condition icon, relative humidity and the UV index.

```jsx
<WeatherCard />                                   // geolocates by IP
<WeatherCard location="Barcelona" />
<WeatherCard location="BCN" refreshSeconds={600} />
```

`location` is whatever wttr.in accepts, so a city name, an airport code or a
`~Landmark Name` all work. Leave it out and wttr.in picks a location from your
IP, which is usually what you want on a laptop.

Set both props once in your layout. They are part of the command tauler runs,
and that command is how tauler identifies the stream, so changing them at
runtime kills the subprocess and starts a new one.

While the first reading is still loading, or if a fetch fails, the card shows
`…` and `—` instead of empty fields.

Requires `curl`, and bash at `/usr/bin/bash` (the path is hardcoded in the
stream command).

### KittyConfig

Writes `~/.config/kitty/tauler-kitty-settings.conf` — a fixed set of kitty
settings (font, scrollback, remote control, and so on). Takes no props; this
is an opinionated starting point, not a configurable component. Fork the file
and change the values directly if you want different settings.

```jsx
<KittyConfig />
```

Deliberately writes a *fragment*, not the whole of `kitty.conf`: your own
`kitty.conf` should `include ~/.config/kitty/tauler-kitty-settings.conf`
rather than being replaced by it, so anything else that also manages part of
your kitty config (most commonly `kitten themes`, which rewrites the color
block on every theme switch) is never fought over.

Requires kitty.

### RofiConfig

Writes `~/.config/rofi/config.rasi` — rofi's *behavior* (modes, matching,
terminal, display formats), not its colors or layout. Takes no props, same
"fork it to change the values" deal as `KittyConfig`.

```jsx
<RofiConfig />
```

Requires rofi.

### RofiTheme / RecentFilesTheme

Two rofi *appearance* files — `RofiTheme` writes
`~/.config/rofi/tauler-theme.rasi` (the main launcher theme), `RecentFilesTheme`
writes `~/.config/rofi/recent-files.rasi` (a fullscreen grid theme, e.g. for a
recent-files picker). Both take no props.

```jsx
<RofiTheme />
<RecentFilesTheme />
```

Both read colors from `~/.config/tauler/rofi-colors.json` (seven keys: `bg`,
`fg`, `panel`, `bg-alt`, `bg-alt-fg`, `accent`, `urgent` — hex strings) if that
file exists, falling back to a fixed built-in palette otherwise — so they
render correctly with zero extra setup, and pick up your own colors
automatically if you write that file yourself (from a terminal theme sync
script, say). The file is read fresh every render, no restart needed to see a
color change take effect.

Requires rofi.

## Schemas

Schema files (`components/*.schema.yaml`) are importable straight from a
layout on tauler builds with `tauler-configgen`: each one declares JSX
components for one config format plus the template that renders them. The
kitty and rofi schemas above back their components; the i3 schema below
ships on its own, without a deployed component, because an i3 config is too
personal to be shipped as one.

### i3-config.schema.yaml

The whole of i3's config language (checked against i3 4.25.1's own parser
grammar): every top-level directive, `bindsym`/`bindcode` with all four
flags, `mode { }` blocks, the complete `bar { colors { } }` block, criteria
for `for_window`/`assign`/`no_focus`, gaps, client colors, variables,
`include`, comments. One component per directive shape, named after the
keyword in CamelCase (`FocusFollowsMouse`, `Bindsym`, `BarStatusCommand`;
the bar's `i3bar_command` is `BarCommand`); single-value directives take
`value`, multi-argument ones take named props, and the few that fan out by
class (`ClientColor`, `BarColor`) take `class`. `exec_always` is
`<Exec always />`, `assign` is three nodes by target (`AssignWorkspace`,
`AssignWorkspaceNumber`, `AssignOutput`). Output and workspace names are
written bare everywhere (`outputs={["Dell UP2414Q"]}`); the template adds
the quotes i3 needs.

Copy `components/i3-config.schema.yaml` next to your layout (git-package
imports resolve to `index.jsx` only, and a schema has to be imported by
its own path):

```jsx
import {
  I3Config, Set, Font, Exec, Bindsym, Mode, FloatingModifier, ForWindow,
  ClientColor, Bar, BarStatusCommand, BarColors, BarWorkspaceColor,
} from "./i3-config.schema.yaml";

const mod = "$mod";
const workspaces = ["1", "2", "3"];

const I3 = ConfigFile({
  path: "~/.config/i3/config",
  render: () => (
    <I3Config>
      <Set name={mod} value="Mod4" />
      <Font value="pango:DejaVu Sans Mono 8" />
      <Exec noStartupId command="dex --autostart --environment i3" />
      <Exec always noStartupId command="xrandr --auto" />
      <FloatingModifier value={mod} />
      <Bindsym keys={`${mod}+Return`} command="exec kitty" />
      <Bindsym release keys={`${mod}+Print`} command="exec scrot" />
      {workspaces.map((w) => (
        <Bindsym keys={`${mod}+${w}`} command={`workspace number ${w}`} />
      ))}
      <Mode name="resize">
        <Bindsym keys="h" command="resize shrink width 10 px or 10 ppt" />
        <Bindsym keys="Escape" command='mode "default"' />
      </Mode>
      <ForWindow criteria='class="^i3scratchpad$"' command="move scratchpad, sticky enable" />
      <ClientColor class="focused" border="#F6A100" background="#F6A100" text="#000000" indicator="#2e9ef4" childBorder="#F6A100" />
      <Bar>
        <BarStatusCommand value="i3status" />
        <BarColors>
          <BarWorkspaceColor class="focused_workspace" border="#F6A100" background="#F6A100" text="#000000" />
        </BarColors>
      </Bar>
    </I3Config>
  ),
});
```

Every scalar prop is a string (write `size="5"`, not `size={5}`) validated
against i3's grammar when the layout renders, with an error naming the
shape it wanted, so a typo fails in tauler's log instead of in `i3 -C`. What comes after a binding, a `for_window` rule or
an `exec` is i3's *command* language, a separate grammar, and is passed
through as an opaque single line. The header comment in the schema lists
the other deliberate boundaries (normalised `yes`/`no` spellings, which
deprecated directives are kept).

Optional flags (`release`, `always`, `noStartupId`, `pangoMarkup`, ...) are bare JSX
attributes or booleans; a string there (`release="no"`) renders an error
line rather than counting as true. Everything else is a required, validated
prop: the patterns are
the only thing standing between a prop value and i3's parser, so there are
no optional free-text props (a `ClientColor` takes all five colors, for
instance). Children are in file order, which i3 cares about, and a `.map()`
or a `{cond && <X />}` works anywhere a child does. A node placed in a
block that does not take it (a `Bindsym` inside `Bar`, a `BarMode` at top
level) renders a `tauler_schema_error` line, which is not an i3 directive,
so `i3 -C` reports it instead of dropping or reinterpreting it.

Every directive exists in i3 4.24 or newer. On older i3, leave out the
ones added since: `include` (4.20), `tiling_drag` (4.21),
`gaps`/`smart_gaps`/`smart_borders` and per-workspace gaps (4.22), the
bar's `workspace_command` (4.23), `tiling_drag swap_modifier` and
`popup_during_fullscreen all` (4.24).

## License

Apache 2.0. See [LICENSE](LICENSE).

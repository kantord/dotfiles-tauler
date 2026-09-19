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
import { OutputVolume, Weather, SidebarSection, WeatherSummary, KittyConfig, RofiConfig, RofiTheme, RecentFilesTheme } from "@gh/kantord/dotfiles-tauler";
```

tauler clones this repo, pins it to a commit in a `tauler-pkg.lock` file next
to your layout file, and re-fetches only when you run `tauler pkg update`.
No copying files around.

On an older tauler without Packages, copy the file(s) you want into
`~/.config/tauler/` (keeping the same subfolder — `data/`, `display/`, ...)
and import them from there instead. Every file has no dependency on another
outside its own folder, except where noted below.

## Repo layout

One folder per shape a component can have — [tauler's own three
kinds](https://github.com/kantord/tauler/blob/main/docs/src/content/docs/docs/components.md),
plus the two things it says have no kind at all:

| Folder     | Kind    | Draws               | Ships here                                      |
|------------|---------|----------------------|--------------------------------------------------|
| `data/`    | Data    | nothing — calls a child with data | `Volume.jsx`, `Weather.jsx`         |
| `display/` | Display | props, as pixels     | `SidebarSection.jsx`, `WeatherSummary.jsx`        |
| `units/`   | —       | nothing — declares a file that should exist | `KittyConfig.jsx`, `RofiConfig.jsx`, `RofiTheme.jsx`, `RecentFilesTheme.jsx`, `rofiColors.jsx` |
| `schemas/` | —       | nothing — a config-format template | `*.schema.yaml`                           |
| `bin/`     | —       | module scripts behind `data/`      | `tauler-volume`                           |

There is no `controls/` folder and no premade "card" that wires a Data
component to a Display one — see [Recipes](#recipes) for why. `<Slider>` and
`<Knob>`, tauler's Control components, are used directly; nothing here wraps
them.

## Data components

### Volume: `OutputVolume`, `InputVolume`, `AudioChannels`

Three views of the same `tauler-volume` module, over PipeWire. All three read
the same bin, and tauler identifies a subprocess by its bin, so a layout
using any mix of them costs one process.

`OutputVolume` and `InputVolume` are the default sink and the default source.
Each calls its child with `state` and `actions`:

```jsx
<OutputVolume>
  {(state, actions) => /* state: { volume, muted } or null; actions: setVolume(n), toggleMute() */ null}
</OutputVolume>
```

- `state` is `{ volume, muted }`, or `null` until the module answers and on a
  machine where that device does not exist (no microphone, say).
- `actions.setVolume(n)` and `actions.toggleMute()` return intents, so they
  drop straight into a Control's `on_change` or an `on_click`.

`AudioChannels` is the whole mixer: every PipeWire sink, source, playback
stream and recording stream, so a layout can filter to whatever it cares
about and put a control on each.

```jsx
<AudioChannels>
  {(channels, actions) => /* channels: [...]; actions: setVolume(id, n), toggleMute(id) */ null}
</AudioChannels>
```

Each channel is plain JSON:

| Field             |                                                                          |
|-------------------|--------------------------------------------------------------------------|
| `id`              | PipeWire node id. What the actions take.                                 |
| `kind`             | `"output"` (sinks and playback streams) or `"input"` (sources and recording streams). |
| `type`             | `"device"` or `"stream"` (an application's playback or capture).         |
| `name`             | PipeWire node name, e.g. `alsa_output.pci-…`.                            |
| `description`      | Human name: the device's description, or the stream's media title.       |
| `app`, `media`     | Streams only: application name and what it is playing. `null` on devices. |
| `state`            | PipeWire's: `"running"` when audio is flowing, `"suspended"` or `"idle"` when not. |
| `default`          | `true` on the default sink and the default source.                       |
| `volume`, `muted`  | 0–100 on wpctl's cubic scale, so it matches what `wpctl` prints.          |

Some filters that come up: output devices only, `ch.type === "device" &&
ch.kind === "output"`; apps currently playing, `ch.type === "stream" &&
ch.kind === "output" && ch.state === "running"`; the default mic, `ch.default
&& ch.kind === "input"`. Internal PipeWire plumbing nodes are left out, but
monitoring tools that open a capture stream (pavucontrol's peak meters, say)
do show up as recording streams, so filter on `app` if that bothers you.

All three take `bin` (default `~/.local/bin/tauler-volume`), where you put
the module script (below). The list in `AudioChannels` is re-read every two
seconds via `pw-dump`, which costs a few tens of milliseconds.

The round trip is the whole design: a drag sends an intent, `wpctl` changes
the device, the module emits the new state, and the next tick redraws
whatever control you put on it. Changes made elsewhere (media keys,
pavucontrol) show up within two seconds the same way.

The module script needs to be on disk. Git-package imports resolve to
`index.jsx` only and the package cache path includes the commit sha, so the
component cannot point at its own copy; put it somewhere stable:

```sh
cp ~/.cache/tauler/pkg/gh/kantord/dotfiles-tauler/*/bin/tauler-volume ~/.local/bin/
chmod +x ~/.local/bin/tauler-volume
```

or pass `bin="/wherever/you/put/it"`. Requires `pw-dump`, `wpctl` (PipeWire
and WirePlumber) and `jq`.

### Weather: `Weather`

Current conditions from [wttr.in](https://wttr.in), as a plain object — pair
it with `WeatherSummary` (below) or your own display.

```jsx
<Weather location="Barcelona">
  {w => /* w: { cond, temp, feels, humidity, uv } or null */ null}
</Weather>
```

`location` is whatever wttr.in accepts: a city name, an airport code, a
`~Landmark Name`. Leave it out and wttr.in picks a location from your IP,
which is usually what you want on a laptop. `refreshSeconds` defaults to
180.

Both props are part of the command tauler runs, and that command is how
tauler identifies the stream, so changing either one at runtime kills the
subprocess and starts a new one — set them once in your layout.

`w` is `null` before the first reading lands. A failed curl still prints a
complete record, only with every field blank — `WeatherSummary` treats those
the same way. Requires `curl`, and bash at `/usr/bin/bash` (the path is
hardcoded in the stream command).

## Display components

### SidebarSection

The shell every card in this repo draws: a hairline divider, then a padded
column. Wrap your own cards in it so a sidebar of mixed cards lines up.

```jsx
<SidebarSection>
  <span class="text-[10px] text-muted-foreground">DISK</span>
  <Progress value={used} />
</SidebarSection>
<SidebarSection gap={10}>…</SidebarSection>          // wider row gap, in px
<SidebarSection class="flex-row">…</SidebarSection>  // a row instead of a column
```

A card with nothing to show should return `null` before rendering one, so
its divider disappears along with it. The divider is a neutral grey at low
alpha rather than a theme token, so it reads the same on light and dark
themes.

### WeatherSummary

Renders one `Weather` reading: temperature, feels-like, a condition icon,
humidity and the UV index. Takes `cond`, `temp`, `feels`, `humidity`, `uv` —
spread a `Weather` reading straight in.

```jsx
<Weather location="Barcelona">{w => <WeatherSummary {...w} />}</Weather>
```

While the first reading is still loading, or if a fetch fails, shows `…` and
`—` instead of empty fields.

## Recipes

There is no `VolumeSlider`, no `VolumeKnob`, no `WeatherCard`. A Data
component and a Control already compose in one line, and the line says
everything a wrapper would otherwise hide — the label text, that a muted
channel draws as 0, the step size. So the "card" layer is a few lines you
write in your own layout, not an export from this package:

```jsx
import { Slider } from "@ui/slider";
import { OutputVolume, AudioChannels } from "@gh/kantord/dotfiles-tauler";

// Main output, with a label row.
<OutputVolume>
  {(v, a) => (
    <div class="flex flex-col gap-[6px] w-full">
      <div class="flex flex-row items-baseline justify-between w-full">
        <div on_click={[a.toggleMute()]}>
          <span class="text-[10px] text-muted-foreground">{v?.muted ? "Volume · muted" : "Volume"}</span>
        </div>
        <span class="text-[10px] text-muted-foreground">{v?.volume ?? 0}%</span>
      </div>
      <Slider value={v?.muted ? 0 : v?.volume ?? 0} min={0} max={100} step={5} on_change={a.setVolume} />
    </div>
  )}
</OutputVolume>

// One slider per app that is playing right now, no label row.
<AudioChannels>
  {(channels, a) => channels
    .filter(ch => ch.type === "stream" && ch.kind === "output" && ch.state === "running")
    .map(ch => (
      <Slider value={ch.muted ? 0 : ch.volume} min={0} max={100} step={5}
              on_change={v => a.setVolume(ch.id, v)} />
    ))}
</AudioChannels>
```

Swap `<Slider>` for `<Knob>` and it is a dial instead — both are tauler's own
Control components, imported from `@ui/slider` / `@ui/knob`, not from this
package.

## Units

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

Schema files (`schemas/*.schema.yaml`) are importable straight from a
layout on tauler builds with `tauler-configgen`: each one declares JSX
components for one config format plus the template that renders them. The
kitty and rofi schemas above back the Units above; the i3 schema below
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

Copy `schemas/i3-config.schema.yaml` next to your layout (git-package
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

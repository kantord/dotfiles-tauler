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
import { OutputVolume, Weather, Clock, Battery, Notifications, ClaudeUsage, Agenda, EnwiroEnvs, GitHubSearch, OpenUrl, ClaudeRecaps, hueFor, SidebarSection, WeatherSummary, Plot, Line, Area, Rect, Bar, Dot, Link, Vector, Text, Arc, Polygon, RuleX, RuleY, TickX, TickY, Swarm, Image, Group, Layer, Scale, Axis, Grid, Legend, stack, dodge, jitter, jitterPx, geo, polar, defineMark, defineScale, defineGuide, colorScale, sizeScale, shapeScale, opacityScale, linearGradient, radialGradient, pattern, hatch, blur, dropShadow, marker, arrowhead, mask, clipRect, clipPath, chartTheme, bin, bin2d, group, rolling, cumsum, normalize, last, fold, groupBy, rank, kde, ecdf, boxStats, treemap, tree, pack, partition, flow, hexbin, delaunay, contours, densityContours, regress, difference, waterfall, orderBy, dateRange, Treemap, Tree, Pack, Partition, Geo, GeoDot, KittyConfig, KittyTheme, I3Theme, GtkTheme, ColorScheme, Gtk3Css, RofiConfig, RofiTheme, RecentFilesTheme } from "@gh/kantord/dotfiles-tauler";
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
| `data/`    | Data    | nothing — calls a child with data | `Volume.jsx`, `Weather.jsx`, `Clock.jsx`, `Battery.jsx`, `Notifications.jsx`, `ClaudeUsage.jsx`, `Agenda.jsx`, `EnwiroEnvs.jsx`, `GitHubSearch.jsx`, `OpenUrl.jsx`, `ClaudeRecaps.jsx` |
| `display/` | Display | props, as pixels     | `SidebarSection.jsx`, `WeatherSummary.jsx`        |
| `charts/`  | Display | marks and a spec, as pixels | `Plot.jsx`, `core.jsx`, `marks.jsx`, `hierarchy.jsx`, `geo.jsx`, `theme.jsx`, `stats.jsx`, and the stages and marks they use |
| `units/`   | —       | nothing — declares a file that should exist | `KittyConfig.jsx`, `KittyTheme.jsx`, `I3Theme.jsx`, `GtkTheme.jsx`, `ColorScheme.jsx`, `Gtk3Css.jsx`, `RofiConfig.jsx`, `RofiTheme.jsx`, `RecentFilesTheme.jsx` |
| `lib/`     | —       | plain functions, no component | `hueFor.jsx` |
| `schemas/` | —       | nothing — a config-format template | `*.schema.yaml`                           |
| `bin/`     | —       | module scripts behind `data/`      | `tauler-volume`, `tauler-claude-usage`, `tauler-claude-statusline`, `tauler-agenda-gcalcli`, `tauler-enwiro-envs`, `tauler-open`, `tauler-claude-recaps` |

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

All three take `bin`, defaulting to this package's own `bin/tauler-volume`
(below). The list in `AudioChannels` is re-read every two
seconds via `pw-dump`, which costs a few tens of milliseconds.

The round trip is the whole design: a drag sends an intent, `wpctl` changes
the device, the module emits the new state, and the next tick redraws
whatever control you put on it. Changes made elsewhere (media keys,
pavucontrol) show up within two seconds the same way.

Every Data component here runs its script straight from the package checkout
(`import.meta.dirname`, a tauler newer than 0.6.3), so the script always matches
the pinned commit and there is nothing to install. Pass `bin` to run your own
program instead. Requires `pw-dump`, `wpctl` (PipeWire
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
180, with a floor of 10.

Both props are part of the command tauler runs, and that command is how
tauler identifies the stream, so changing either one at runtime kills the
subprocess and starts a new one — set them once in your layout.

`w` is `null` before the first reading lands. A failed curl still prints a
complete record, only with every field blank — `WeatherSummary` treats those
the same way. Requires `curl`, `jq`, and bash at `/usr/bin/bash` (the path is
hardcoded in the stream command).

### Clock: `Clock`

The current time as a string, from `date`.

```jsx
<Clock>{t => <span>{t}</span>}</Clock>
<Clock format="%a %d %b" refreshSeconds={60}>{d => <span>{d}</span>}</Clock>
```

`format` is a `date +FORMAT` string (default `%H:%M`); `refreshSeconds`
defaults to 1. The child gets `null` before the first line. Like `Weather`'s
props, both are part of the stream's command, so set them once.

### Battery: `Battery`

A laptop battery's charge, from `/sys/class/power_supply`.

```jsx
<Battery>{b => b && <span>{b.percent}%{b.charging ? " ⚡" : ""}</span>}</Battery>
```

The child gets `{ percent, charging }`, or `null` before the first reading
and on a machine without that battery, so a desktop simply draws nothing.
`device` picks the battery (default `BAT0`), `refreshSeconds` defaults to 10.

### Notifications: `Notifications`

The desktop notifications held by `tauler-notify`, tauler's own notification
daemon (installed with tauler, `bin` defaults to `~/.cargo/bin/tauler-notify`).

```jsx
<Notifications>
  {(list, actions) => list.slice(0, 3).map(n => (
    <div on_click={[actions.dismiss(n.id)]}>{n.summary}</div>
  ))}
</Notifications>
```

Each notification has at least `id`, `summary` and `body`.
`actions.dismiss(id)` returns an intent for an `on_click`.

### ClaudeUsage: `ClaudeUsage`

Claude Code's five-hour rate-limit usage, per account.

```jsx
<ClaudeUsage>
  {accounts => accounts.map(a => <span>{a.label}: {a.percent}%</span>)}
</ClaudeUsage>
```

The child gets `[{ label, percent, resetsIn }]`, `resetsIn` in seconds, and an
empty list while no Claude Code session has reported in the last 15 minutes.

Only Claude Code's status line sees the rate limits, so Claude Code's status
line has to run `bin/tauler-claude-statusline`. Its settings need a stable
path, so copy that one script to `~/.local/bin`:

```json
"statusLine": { "type": "command", "command": "bash ~/.local/bin/tauler-claude-statusline" }
```

`tauler-claude-statusline` records each session's numbers in
`/tmp/claude-usage` and prints a short `5h:NN%` status line;
`tauler-claude-usage` (the `bin` prop) reads them back. Requires `jq`.

### Agenda: `Agenda`

One day of calendar events, for a list or a timeline (a `Plot` with `Rect`s
or `Link`s).

```jsx
<Agenda day={0}>
  {(events, info) => events.map(e => <span>{e.start}–{e.end} {e.title}</span>)}
</Agenda>
```

`events` is `[{ title, start, end, color }]` with `"HH:MM"` times, sorted by
start, and empty until the first fetch. `info` is `{ day, date, month,
dayOfMonth, isToday }` for the day shown.

`day` is an offset from today: 0 today, 1 tomorrow, -1 yesterday. It is part
of the command, so changing it restarts the source with one fresh fetch,
which is what you want for stepping through days.

`bin` is the source, defaulting to this package's `bin/tauler-agenda-gcalcli`.
It reads Google Calendar through
[gcalcli](https://github.com/insanum/gcalcli), refreshing every 5 minutes.
Any program that takes the day offset as its first argument and prints those
JSON lines works as a source. Requires gcalcli, logged in with `gcalcli init`,
and `jq`. If the login expires, the events go empty and gcalcli's
`invalid_grant` error shows up in tauler's log.

### GitHubSearch: `GitHubSearch`

The issues and pull requests a GitHub search finds, through `gh`.

```jsx
<GitHubSearch query="is:pr is:open review-requested:@me">
  {items => items.map(i => <span>{i.repo} #{i.number} {i.title}</span>)}
</GitHubSearch>
```

`query` is GitHub's own [search syntax](https://docs.github.com/search-github),
`@me` included, so the layout names no account. `items` is
`[{ kind, repo, number, title, url, updatedAt }]` (`kind` is `"pr"` or
`"issue"`), the first 100 matches, empty until the first answer or while `gh`
fails. `refreshSeconds` defaults to 300, floor 60. Searches with the same
query share a subprocess. Counting per repo, or anything else, is the
layout's job. Requires `gh` (logged in) and `jq`.

### OpenUrl: `OpenUrl`

An action that opens a URL with `xdg-open`; its child gets the action.

```jsx
<OpenUrl>{open => <span on_click={[open("https://github.com")]}>GitHub</span>}</OpenUrl>
```

`open(url)` returns an intent for an `on_click`. Needs `jq` and
`xdg-open`.

### EnwiroEnvs: `EnwiroEnvs`

Every [enwiro](https://github.com/kantord/enwiro) environment.

```jsx
<EnwiroEnvs>
  {envs => envs.filter(e => e.status?.type === "done").map(e => <span>{e.name}</span>)}
</EnwiroEnvs>
```

`envs` is `[{ name, cookbook, description, status, statusSince, workspace,
scores }]`: `status` is enwiro's own (`{ type: "cooked", phase: "active" }`),
`statusSince` the epoch second it last changed, `workspace` the directory the
environment opens, `scores.launcher` what enwiro's launcher sorts by. Lists
like "ready" or "done today" are filters in the layout. Needs
`enw` and `jq`.

### ClaudeRecaps: `ClaudeRecaps`

The newest Claude Code recap (the summary it writes when you step away) for
each of a set of directories.

```jsx
<ClaudeRecaps dirs={["/home/you/repos/tauler"]}>
  {recaps => <span>{recaps["/home/you/repos/tauler"]}</span>}
</ClaudeRecaps>
```

`recaps` maps each directory with a recap to its newest one, shortened to a
line of at most 110 characters. `dirs` is part of the command, so changing
the set restarts the subprocess. Needs `jq`.

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

## Charts

A grammar of graphics on d3, drawn as tauler `<D3Figure>`s. A `Plot` takes
marks (`Line`, `Area`, `Rect`, `Bar`, `Dot`, `Link`, `Vector`, `Text`, `Arc`, `Polygon`,
`RuleX`, `RuleY`, `TickX`, `TickY`, `Swarm`, `Image`, `Group`; trees and maps below) and
pieces (`Layer`, `Scale`, `Axis`, `Grid`, `Legend`) as JSX children. Needs tauler 0.7.0 or later
(`D3Figure`); tauler downloads d3 itself. The design and its decisions are in
[`charts/SPEC.md`](charts/SPEC.md).

```jsx
import { Plot, Line, Area, Link, Layer, Axis, Grid, chartTheme } from "@gh/kantord/dotfiles-tauler";

const theme = chartTheme(themeColor, "JetBrains Mono");   // the layout's own font

<Plot width={248} height={110} theme={theme} data={samples} x="t" y="cpu">
  <Grid channel="y" tone="soft" />
  <Area fillOpacity={0.2} />
  <Line />
  <Layer data={[{ t: now }]} x="t">
    <Link y1={-Infinity} y2={Infinity} stroke={theme.muted} strokeDasharray="3 3" />
  </Layer>
  <Axis channel="x" ticks={3} format="%H:%M" />
  <Axis channel="y" ticks={3} />
</Plot>
```

Stacked bars per day (`dodge()` puts them side by side), and a histogram:

```jsx
import { Plot, Bar, Scale, Axis, stack, bin } from "@gh/kantord/dotfiles-tauler";

<Plot width={248} height={90} theme={theme} data={hours} x="day" y="hours" color="project">
  <Scale channel="x" type="band" />
  <Bar position={stack()} />
  <Axis channel="x" />
</Plot>

<Plot width={248} height={80} theme={theme} data={bin(latencies, { value: "ms", thresholds: 8 })}>
  <Bar x1="x0" x2="x1" y="count" />
</Plot>
```

- **Channels** are `x x1 x2 y y1 y2 color group`: a field name, a function of
  the datum, an array with one value per row (columnar data), or a constant
  (`±Infinity` is the plot's edge). A mark inherits
  the Plot's (or its `Layer`'s) channels, except that setting any channel of
  an axis drops the inherited ones of that axis; `color={null}` drops one.
- **Marks.** `Rect` takes an interval (`x1 x2`) or a point per axis: on a band
  scale a point fills the band (`inset` px less each side), elsewhere it is
  `width` px wide. `Bar` is a `Rect` from 0 on its value axis (y, or x when y
  is a band). `Link` is a segment; `Arc` a pie, donut (`inner`) or gauge
  (`startAngle`, `endAngle`) with `value` a field name; `Vector` is a pixel-length arrow,
  `Swarm` a beeswarm, `Polygon` rings from data, `Text` wraps (`width`) and turns (`angle`). Style props (`fill`,
  `stroke`, `r`, `text`, `dy`, ...) are constants or functions of the datum.
- **Positions:** `position={stack()}` piles rows sharing x (`offset:
  "expand"` for shares, `along: "x"` for horizontal); `dodge()` gives each
  series a slot of its band; `jitter()` (band axes) and `jitterPx()` (pixels) spread
  overlapping points.
- **Scales** are inferred from all values: Dates → `time`, numbers →
  `linear`, anything else → `band`; numeric `color` → sequential. JSON has no
  Dates, so ISO strings need `<Scale channel="x" type="time" />`, and integer
  categories (hours, weeks) need `type="band"`. `Scale` also takes `domain`,
  `range` (colours for `color`, any number of stops; three around a pivot make
  it diverging), `padding`, and `type="log"` (also `sqrt`, `pow`, `time`, `ordinal`, `point`, `threshold`, `quantize`, `quantile`); named scales
  (`name`, then `scale` on a mark, `Layer`, `Axis` or `Grid`) give a second axis. `colorScale`,
  `sizeScale`, `shapeScale` and `opacityScale` read a trained scale; `defineScale` and
  `defineGuide` add your own. `curve` takes any d3 curve name
  (`"monotone"`, `"step-before"`, `"basis"`...).
- **Statistics** are plain `data -> data` functions, called before the `Plot`: `bin`, `bin2d`,
  `group`, `groupBy`, `rolling`, `cumsum`, `normalize`, `last`, `fold`, `rank`, `kde`, `ecdf`,
  `boxStats`, `regress`, `difference`, `waterfall`, `orderBy`, `dateRange`, `flow` (Sankey
  rows), and `hexbin`, `delaunay`, `contours`, `densityContours` (rows for `Polygon`); details
  in `charts/SPEC.md`.
- **Guides:** `Axis`, `Grid` and `Legend` (`channel="color"`, keys or a sequential ramp).
- **Coordinates:** `coord={polar()}` turns the same marks into pies, roses, radar charts
  and sunbursts (`Grid` and `Axis` follow); `projection` and `fit` draw maps.
- **Effects:** `fill` and `stroke` take `linearGradient`, `radialGradient`, `pattern` and
  `hatch`; marks take `filter` (`blur`, `dropShadow`), `mask`, `clip` and `blend`; lines take
  `markerStart` and `markerEnd` (`marker`, `arrowhead`); `clipRect` and `clipPath` make clips.
- **Your own marks:** `defineMark(name, { render(rows, ctx) { return shapes } })`.
  `ctx` has `x`, `y` (value → pixel), `color`, `area`, `bandwidth`, `theme`,
  `props`, `resolve` (a style prop), `field` (a value prop) and `measure`; a
  shape is `{ t: "rect" | "circle" | "line" | "path" | "text", ...SVG attributes in camelCase }`.
  `Arc` in `charts/marks.jsx` is a complete example.
- **Trees:** `Treemap`, `Tree`, `Pack` and `Partition` read a hierarchy from flat rows:
  `path` (`"home/media/photos"`, parents filled in) or `id` + `parent`, sized by `value`,
  named by `label`. `<Plot width={248} height={100} data={du}><Treemap path="dir"
  value="mb" label={d => d.dir.split("/").at(-1)} /></Plot>` is a disk-usage map.
- **Maps:** give the Plot a `projection` (`"equal-earth"`, `"mercator"`, a d3-geo
  projection) and optionally `fit` (GeoJSON to frame). `Geo` draws GeoJSON rows (a
  `color` channel makes a choropleth); `GeoDot` draws `lon`/`lat` points. Detailed
  shapes are expensive to hash every Tick (a 3000-point coastline: 29 ms), so give a map
  Plot a `key` (0.4 ms), changed when the data does.
- `width` and `height` are required numbers; `margin={{ left: 4 }}` fixes a
  side (for aligned small multiples). Text is measured as `characters × size ×
  0.6`, which is exact for a monospace font such as JetBrains Mono; pass
  `measure` for anything else.
- **Keys and cost.** The figure's key is a hash of the compiled scene, so it
  redraws exactly when its picture changes. Compiling runs every Tick: about
  1.6 ms at 50 rows and 8 ms at 500. For thousands of rows, pass `key` and
  change it whenever the data does; the Plot is then compiled only when tauler
  draws it.
- Everything a `Plot` is given must come from its props: tauler evaluates the
  layout in three runtimes and matches figures by key, so never call
  `new Date()` inside the layout; take the time from a stream (`Clock`).

## Helpers

### hueFor

A stable hue (0–359) for a name, for colour-coding things like repositories.

```jsx
import { hueFor } from "@gh/kantord/dotfiles-tauler";

<div style={{ backgroundColor: `hsla(${hueFor("tauler")}, 60%, 60%, 0.1)` }} />
```

A hash of the name, so the same name gets the same hue on every machine with
nothing stored.

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

It sets no `shell`: a missing shell program stops kitty from opening a
window at all, so that line belongs in your own `kitty.conf`, after the
`include` (a later value wins).

Requires kitty.

### KittyTheme, I3Theme, GtkTheme, ColorScheme, Gtk3Css

Four Units that hand tauler's active theme to other programs. Each renders from `ctx.theme` (the
theme chosen by `theme:` in the layout's frontmatter), so changing the theme rewrites all four
and the programs follow — no sync script, no second palette to keep.

```jsx
<KittyTheme />
<I3Theme />
<GtkTheme />
<ColorScheme />
<Gtk3Css />
```

| Unit         | Writes                                  | Notes |
| ------------ | --------------------------------------- | ----- |
| `KittyTheme` | `~/.config/kitty/tauler-kitty-theme.conf` | Foreground, background, selection, cursor, borders, tabs and the 16 ANSI colours. `include` it from `kitty.conf` instead of a `kitten themes` block; running windows reload it with `auto_reload_config`. |
| `I3Theme`    | `~/.config/i3/tauler-theme.conf`        | Window borders and title bars (`client.*`). `include` it from the i3 config. Each write runs `i3-msg reload`. |
| `GtkTheme`   | `~/.config/gtk-4.0/gtk.css`             | libadwaita's named colours: GTK4 apps (Nautilus and so on) recolour; running ones on their next launch. Also switches off shadows and the room they reserve around menus and popovers, which without a compositor paint as dark strips. After a write it quits Nautilus's background service once no Nautilus window is open, so the next window starts with the new colours. The unit owns the whole file. |
| `ColorScheme` | `~/.config/gtk-3.0/settings.ini`       | Light or dark, from the theme's `mode`: GTK3 gets `Adwaita` or `Adwaita-dark`, and each write sets `gsettings` `color-scheme` (followed live by browsers and GTK4 apps). The unit owns the whole file. Requires `gsettings`. |
| `Gtk3Css`   | `~/.config/gtk-3.0/gtk.css`             | Switches off GTK3's window-decoration shadow, the dark band it paints without a compositor. Not theme-driven; listed here because it completes the GTK setup. The unit owns the whole file. |

Which token paints which surface follows the names a UI uses — `primary` for the focused window and
the accent, `card` for content, `sidebar` for header bars, `popover` for dialogs.

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

Both render from `ctx.theme`, like `KittyTheme` and `I3Theme`: the window is
`popover`, the input bar and rows sit on `background`, the selection and accent
are `primary`, errors are `destructive`. Changing the layout's theme rewrites
both files; rofi picks them up on its next launch.

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

## Development

Tests run with Vitest: `pnpm install`, then `pnpm test`. `test/tauler.js`
stands in for tauler: its JSX factory, `D3Figure`, and a Draw step that runs a
figure's `draw` against linkedom the way tauler's Draw runtime does.

The charts have three kinds of test: unit tests; a grammar stress test
(`charts/test/grammar/`, the scenarios of a minimal ggplot2 suite on synthetic
data, each drawing kept as an SVG file; `pnpm test -u` accepts a change, `pnpm
gallery` writes a page showing them all); and fast-check properties
(`charts/test/properties.test.js`) for invariants on generated data.

## License

Copyright 2026 Dániel Kántor. Apache 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).

ggplot2, Observable Plot and other libraries are named only for comparison; this project is not affiliated with them.
Mark and option names follow d3 and the SVG and CSS names where they fit, Observable Plot for several
marks (`RuleX`, `TickY`, `Vector`, `Image`) and ggplot2 for the grammar terms (layers, stats, positions, facets).

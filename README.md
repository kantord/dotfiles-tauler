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

## License

Apache 2.0. See [LICENSE](LICENSE).

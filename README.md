# dotfiles-tauler

Status bar components for [tauler](https://github.com/kantord/tauler), split out
of my dotfiles so they can be used on their own.

These are not React components. They render inside tauler's own JSX runtime,
which renders HTML elements — `<div>`, `<span>` — and reads data through
`useJSONStream`, so they only work under tauler.

## Components

### WeatherCard

Current conditions from [wttr.in](https://wttr.in): temperature, feels-like, a
condition icon, relative humidity and the UV index.

```jsx
import WeatherCard from './components/WeatherCard.jsx';

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

## Installing

Copy the file into `~/.config/tauler/components/` and import it from your
`layout.jsx`.

With chezmoi you can pull it in as an external instead, so `chezmoi apply`
picks up new versions:

```toml
['.config/tauler/components/WeatherCard.jsx']
    type = "file"
    url = "https://raw.githubusercontent.com/kantord/dotfiles-tauler/main/components/WeatherCard.jsx"
    refreshPeriod = "168h"
```

Use one entry per file rather than a directory external. A directory external
with `exact = true` deletes everything else in that folder, which is where your
own components live.

## Requirements

- tauler, for the `@ui/icon` module and the `text-foreground` /
  `text-muted-foreground` theme tokens
- `curl`, and bash at `/usr/bin/bash` (the path is hardcoded in the stream
  command)

## License

Apache 2.0. See [LICENSE](LICENSE).

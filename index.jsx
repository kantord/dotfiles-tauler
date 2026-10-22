// Entry point for `import { ... } from "@gh/kantord/dotfiles-tauler"` — tauler's
// git-package imports resolve to `index.{js,jsx,ts,tsx}` at the repo root, no
// subpath support (see tauler issue #554 / ADR 0041). Every component is a
// named export from this one file, grouped by tauler's own component kinds
// (see components.md in the tauler repo): Data first, Display next, then
// Units — the config-file writers that draw nothing at all.
export { OutputVolume, InputVolume, AudioChannels } from './data/Volume.jsx';
export { default as Weather } from './data/Weather.jsx';

export { default as SidebarSection } from './display/SidebarSection.jsx';
export { default as WeatherSummary } from './display/WeatherSummary.jsx';

export { default as Chart } from './charts/Chart.jsx';
export { rect, rule } from './charts/marks.jsx';

export { default as KittyConfig } from './units/KittyConfig.jsx';
export { default as KittyTheme } from './units/KittyTheme.jsx';
export { default as I3Theme } from './units/I3Theme.jsx';
export { default as GtkTheme } from './units/GtkTheme.jsx';
export { default as ColorScheme } from './units/ColorScheme.jsx';
export { default as Gtk3Css } from './units/Gtk3Css.jsx';
export { default as RofiConfig } from './units/RofiConfig.jsx';
export { default as RofiTheme } from './units/RofiTheme.jsx';
export { default as RecentFilesTheme } from './units/RecentFilesTheme.jsx';

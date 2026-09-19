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

export { default as KittyConfig } from './units/KittyConfig.jsx';
export { default as RofiConfig } from './units/RofiConfig.jsx';
export { default as RofiTheme } from './units/RofiTheme.jsx';
export { default as RecentFilesTheme } from './units/RecentFilesTheme.jsx';

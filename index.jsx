// Entry point for `import WeatherCard from "@gh/kantord/dotfiles-tauler"` —
// tauler's git-package imports resolve to `index.{js,jsx,ts,tsx}` at the repo
// root, no subpath support (see tauler issue #554 / ADR 0041). Re-exported
// under both names so `import WeatherCard from "..."` and
// `import { WeatherCard } from "..."` both work as the package grows.
export { default } from './components/WeatherCard.jsx';
export { default as WeatherCard } from './components/WeatherCard.jsx';

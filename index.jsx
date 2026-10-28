// Entry point for `import { ... } from "@gh/kantord/dotfiles-tauler"` — tauler's
// git-package imports resolve to `index.{js,jsx,ts,tsx}` at the repo root, no
// subpath support (see tauler issue #554 / ADR 0041). Every component is a
// named export from this one file, grouped by tauler's own component kinds
// (see components.md in the tauler repo): Data first, Display next, then
// Units — the config-file writers that draw nothing at all.
export { OutputVolume, InputVolume, AudioChannels } from './data/Volume.jsx';
export { default as Weather } from './data/Weather.jsx';
export { default as Clock } from './data/Clock.jsx';
export { default as Battery } from './data/Battery.jsx';
export { default as Notifications } from './data/Notifications.jsx';
export { default as ClaudeUsage } from './data/ClaudeUsage.jsx';
export { default as Agenda } from './data/Agenda.jsx';
export { default as EnwiroEnvs } from './data/EnwiroEnvs.jsx';
export { default as GitHubSearch } from './data/GitHubSearch.jsx';
export { default as OpenUrl } from './data/OpenUrl.jsx';
export { default as ClaudeRecaps } from './data/ClaudeRecaps.jsx';

export { default as SidebarSection } from './display/SidebarSection.jsx';
export { default as WeatherSummary } from './display/WeatherSummary.jsx';

export { Plot } from './charts/Plot.jsx';
export { chartTheme } from './charts/theme.jsx';
export { Layer, Scale, Axis, Grid, Legend, defineMark, stack, dodge, jitter, jitterPx, geo, polar, colorScale, sizeScale, shapeScale, opacityScale, defineScale, defineGuide, linearGradient, radialGradient, pattern, hatch, blur, dropShadow, marker, arrowhead, mask, clipRect, clipPath } from './charts/core.jsx';
export { Line, Area, Rect, Bar, Dot, Link, Vector, Text, Arc, Polygon, RuleX, RuleY, TickX, TickY, Swarm, Image, Group } from './charts/marks.jsx';
export { bin, bin2d, group, rolling, cumsum, normalize, last, fold, groupBy, rank, kde, ecdf, boxStats, treemap, tree, pack, partition, flow, hexbin, delaunay, contours, densityContours, regress, difference, waterfall, orderBy, dateRange } from './charts/stats.jsx';
export { Treemap, Tree, Pack, Partition } from './charts/hierarchy.jsx';
export { Geo, GeoDot } from './charts/geo.jsx';

export { default as hueFor } from './lib/hueFor.jsx';

export { default as KittyConfig } from './units/KittyConfig.jsx';
export { default as KittyTheme } from './units/KittyTheme.jsx';
export { default as I3Theme } from './units/I3Theme.jsx';
export { default as GtkTheme } from './units/GtkTheme.jsx';
export { default as ColorScheme } from './units/ColorScheme.jsx';
export { default as Gtk3Css } from './units/Gtk3Css.jsx';
export { default as RofiConfig } from './units/RofiConfig.jsx';
export { default as RofiTheme } from './units/RofiTheme.jsx';
export { default as RecentFilesTheme } from './units/RecentFilesTheme.jsx';

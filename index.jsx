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
export { default as schemaFile } from './lib/schemaFile.jsx';

export { default as KittyConfig } from './units/KittyConfig.jsx';
export { default as KittyTheme } from './units/KittyTheme.jsx';
export { default as I3Theme } from './units/I3Theme.jsx';
export { default as I3Config } from './units/I3Config.jsx';
export { default as GtkTheme } from './units/GtkTheme.jsx';
export { default as ColorScheme } from './units/ColorScheme.jsx';
export { default as Gtk3Css } from './units/Gtk3Css.jsx';
export { default as RofiConfig } from './units/RofiConfig.jsx';
export { default as RofiTheme } from './units/RofiTheme.jsx';

// The i3 schema's components: the children of `<I3Config>`. The schema's own
// root is not exported, `I3Config` above wraps it. `Bar` is `I3Bar` here,
// because the charts already export a `Bar`.
export {
  Comment, Blank, Set, SetFromResource, Include, Exec, Font, Bindsym, Bindcode, Mode,
  FloatingModifier, TilingDrag, TilingDragSwapModifier, FloatingMinimumSize, FloatingMaximumSize,
  DefaultOrientation, WorkspaceLayout, DefaultBorder, DefaultFloatingBorder, HideEdgeBorders,
  TitleAlign, ShowMarks, ForWindow, AssignWorkspace, AssignWorkspaceNumber, AssignOutput, NoFocus,
  FocusFollowsMouse, MouseWarping, FocusWrapping, ForceFocusWrapping, WorkspaceAutoBackAndForth,
  ForceDisplayUrgencyHint, FocusOnWindowActivation, PopupDuringFullscreen, WorkspaceOutput,
  WorkspaceGaps, ForceXinerama, DisableRandr15, FakeOutputs, Gaps, SmartGaps, SmartBorders,
  ClientColor, ClientFocusedTabTitle, ClientBackground, IpcSocket, IpcKillTimeout, RestartState,
  Bar as I3Bar, BarCommand, BarStatusCommand, BarWorkspaceCommand, BarSocketPath, BarMode,
  BarHiddenState, BarId, BarModifier, BarBindsym, BarWheelUpCmd, BarWheelDownCmd, BarPosition,
  BarOutput, BarTrayOutput, BarTrayPadding, BarSeparatorSymbol, BarBindingModeIndicator,
  BarWorkspaceButtons, BarWorkspaceMinWidth, BarStripWorkspaceNumbers, BarStripWorkspaceName,
  BarVerbose, BarHeight, BarPadding, BarColors, BarColor, BarWorkspaceColor,
} from './schemas/i3-config.schema.yaml';

// The kitty schema's components: the children of `<KittyConfig>`.
export {
  FontFamily, BoldFont, ItalicFont, BoldItalicFont, AdjustLineHeight, FontSize, AutoReloadConfig,
  ProgressBar, ScrollbackLines, EnableAudioBell, ShellIntegration, Shell, RememberWindowSize,
  InitialWindowWidth, InitialWindowHeight, InactiveTextAlpha, RepaintDelay, InputDelay,
  AllowRemoteControl, Foreground, Background, SelectionForeground, SelectionBackground,
  CursorColor, CursorTextColor, UrlColor, ActiveBorderColor, InactiveBorderColor,
  ActiveTabForeground, ActiveTabBackground, InactiveTabForeground, InactiveTabBackground,
  TabBarBackground, Color0, Color1, Color2, Color3, Color4, Color5, Color6, Color7, Color8, Color9,
  Color10, Color11, Color12, Color13, Color14, Color15,
} from './schemas/kitty-config.schema.yaml';

// The rofi-config schema's components: the children of `<RofiConfig>`.
export {
  Modes, CombiModes, Matching, Sort, ShowIcons, Terminal, WindowFormat, DrunDisplayFormat,
  DrunShowActions, DrunMatchFields, DrunExcludeCategories, DisplayDrun, DisplayRun, DisplayWindow,
  DisplayCombi, ClickToExit,
} from './schemas/rofi-config.schema.yaml';

// The rofi-full-theme schema's components: the children of `<RofiTheme>`. `Font` is
// `RofiFont` here, because the i3 schema already exports a `Font`.
export {
  Selector, BackgroundColor, TextColor, BorderColor, PlaceholderColor, Font as RofiFont, Location,
  Anchor, YOffset, Width, Height, Spacing, Size, VerticalAlign, Padding, Border, Cycle, Dynamic,
  Scrollbar, Lines, Columns, Placeholder, Children,
} from './schemas/rofi-full-theme.schema.yaml';

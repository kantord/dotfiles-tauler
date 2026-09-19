import {
  RofiConfiguration,
  Modes,
  CombiModes,
  Matching,
  Sort,
  ShowIcons,
  Terminal,
  WindowFormat,
  DrunDisplayFormat,
  DrunShowActions,
  DrunMatchFields,
  DrunExcludeCategories,
  DisplayDrun,
  DisplayRun,
  DisplayWindow,
  DisplayCombi,
  ClickToExit,
} from '../schemas/rofi-config.schema.yaml';

// Ported from the hand-written ~/.config/rofi/config.rasi — rofi's behavior
// (modes, matching, terminal, display formats), not styling, so no colors
// are involved and this is unrelated to RofiTheme.jsx/RecentFilesTheme.jsx.
const RofiConfig = ConfigFile({
  path: '~/.config/rofi/config.rasi',
  render: () => (
    <RofiConfiguration>
      <Modes value="combi,drun,run,window" />
      <CombiModes value="window,drun" />
      <Matching value="fuzzy" />
      {/* Sort disabled so combi falls back to combi-modes order (window
          before drun) — running apps surface above their launcher entries.
          fzf-style smart sort can be re-enabled per-invocation with
          Alt+grave. */}
      <Sort value="false" />
      <ShowIcons value="true" />
      <Terminal value="kitty" />
      {/* Window entries match against just the app class so they tie with
          the drun "Name" field on score, letting combi-modes order (window
          first) surface the running window above its drun launcher
          entry. */}
      <WindowFormat value="{c}" />
      <DrunDisplayFormat value="{name}" />
      <DrunShowActions value="false" />
      <DrunMatchFields value="name,generic,keywords" />
      <DrunExcludeCategories value="Settings;System;Building;Debugger;IDE;Profiling;RevisionControl;Translation" />
      {/* Single glyph for every mode — the prompt is just a visual cue, not
          a status indicator. See the prompt {} block in theme.rasi. */}
      <DisplayDrun value="❯" />
      <DisplayRun value="❯" />
      <DisplayWindow value="❯" />
      <DisplayCombi value="❯" />
      <ClickToExit value="true" />
    </RofiConfiguration>
  ),
});

export default RofiConfig;

// Shared by every tauler-generated rofi theme file (RofiTheme.jsx,
// RecentFilesTheme.jsx, ...). Read fresh on every call, not cached at
// module scope, so each reconciler Sweep picks up the latest kitty palette
// without needing a file watch or a tauler restart — the same
// DEFAULT_REFRESH_INTERVAL that already drives every ConfigFile just does
// the work. Written by ~/.config/i3/sync_rofi_with_kitty_theme.sh on every
// chtheme(), via a plain truncate-and-write (not write-temp-then-rename) —
// so a Sweep can, rarely, observe a half-written file mid-update.
//
// On any read/parse failure (a mid-write race, or a real problem with the
// writer script) this returns the last successfully parsed palette rather
// than a fixed generic one — same "keep what's already in use" choice
// `theme_after_reload` makes for tauler's own theme file (src/app.rs). A
// hardcoded fallback would repaint every rofi file with colors matching no
// real kitty theme on every transient race; caching the last good read
// degrades to "stale but correct" instead of "fresh but wrong". Only used
// before the very first successful read (e.g. first boot, before
// sync_rofi_with_kitty_theme.sh has ever run).
const ROFI_COLORS_PATH = `${HOME}/.config/tauler/rofi-colors.json`;
const DEFAULT_ROFI_COLORS = {
  bg: '#1b1918',
  fg: '#a8a19f',
  panel: '#242019',
  'bg-alt': '#2c2421',
  'bg-alt-fg': '#a8a19f',
  accent: '#F6A100',
  urgent: '#df5320',
};

let lastGoodColors = DEFAULT_ROFI_COLORS;

export function readRofiColors() {
  if (!exists(ROFI_COLORS_PATH)) {
    return lastGoodColors;
  }
  try {
    const colors = JSON.parse(read(ROFI_COLORS_PATH));
    lastGoodColors = colors;
    return colors;
  } catch (e) {
    return lastGoodColors;
  }
}

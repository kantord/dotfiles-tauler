import {
  KittySettings,
  FontFamily,
  BoldFont,
  ItalicFont,
  BoldItalicFont,
  AdjustLineHeight,
  FontSize,
  AutoReloadConfig,
  ProgressBar,
  ScrollbackLines,
  EnableAudioBell,
  ShellIntegration,
  Shell,
  RememberWindowSize,
  InitialWindowWidth,
  InitialWindowHeight,
  InactiveTextAlpha,
  RepaintDelay,
  InputDelay,
  AllowRemoteControl,
} from './kitty-config.schema.yaml';

// Ported from the hand-written ~/.config/kitty/kitty.conf's static settings
// (everything except the `kitten themes`-managed BEGIN_KITTY_THEME block).
//
// kitty.conf itself stays a thin, chezmoi-managed stub that `include`s the
// file this ConfigFile writes — the same "generated file + thin stub" split
// used for ~/.config/rofi/theme.rasi — because `kitten themes` rewrites the
// BEGIN_KITTY_THEME block on disk every time the user runs `chtheme()`
// (~/.zshrc). tauler's Sweep runs every ~5s (DEFAULT_REFRESH_INTERVAL): if
// this ConfigFile owned kitty.conf whole, it would clobber that live edit
// on the very next Sweep after any theme switch. Splitting the file means
// tauler fully owns this one (`tauler-kitty-settings.conf`, sole owner,
// safe to regenerate unconditionally) and never touches the one `kitten
// themes` also writes to.
const KittyConfig = ConfigFile({
  path: '~/.config/kitty/tauler-kitty-settings.conf',
  render: () => (
    <KittySettings>
      <FontFamily value="JetBrains Mono" />
      <BoldFont value="auto" />
      <ItalicFont value="auto" />
      <BoldItalicFont value="auto" />
      {/* Deprecated in kitty 0.48.2 (favor of modify_font), kept as a
          faithful port of the real settings — migrating is a separate
          decision. */}
      <AdjustLineHeight value="100%" />
      <FontSize value="14" />
      <AutoReloadConfig value="0.5" />
      <ProgressBar value="top" />
      <ScrollbackLines value="10000" />
      <EnableAudioBell value="no" />
      <ShellIntegration value="enabled" />
      {/* Open every window inside the active enwiro environment; waits with
          a spinner while the environment is cooking, plain zsh when there
          is none. */}
      <Shell value="~/.cargo/bin/enw shell" />
      <RememberWindowSize value="no" />
      <InitialWindowWidth value="830" />
      <InitialWindowHeight value="700" />
      <InactiveTextAlpha value="0.6" />
      <RepaintDelay value="8" />
      <InputDelay value="2" />
      <AllowRemoteControl value="yes" />
    </KittySettings>
  ),
});

export default KittyConfig;

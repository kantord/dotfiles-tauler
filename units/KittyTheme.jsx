import {
  KittySettings,
  Foreground,
  Background,
  SelectionForeground,
  SelectionBackground,
  CursorColor,
  CursorTextColor,
  UrlColor,
  ActiveBorderColor,
  InactiveBorderColor,
  ActiveTabForeground,
  ActiveTabBackground,
  InactiveTabForeground,
  InactiveTabBackground,
  TabBarBackground,
  Color0, Color1, Color2, Color3, Color4, Color5, Color6, Color7,
  Color8, Color9, Color10, Color11, Color12, Color13, Color14, Color15,
} from '../schemas/kitty-config.schema.yaml';

// kitty's colours, written from the active tauler theme (`ctx.theme`, set by
// `theme:` in the layout's frontmatter) — so the terminal follows the bar
// instead of keeping a palette of its own, and `kitten themes` / `chtheme`
// are no longer involved.
//
// kitty.conf `include`s this file *instead of* the `kitten themes` block, and
// `auto_reload_config` (KittyConfig.jsx) makes running kitty windows pick up a
// rewrite — a theme change repaints the terminals without a command.
//
// The ANSI colours are the theme's own 16 `ansi-*` tokens, in kitty's order.
const ANSI = [
  'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
  'bright-black', 'bright-red', 'bright-green', 'bright-yellow',
  'bright-blue', 'bright-magenta', 'bright-cyan', 'bright-white',
];
const PALETTE = [
  Color0, Color1, Color2, Color3, Color4, Color5, Color6, Color7,
  Color8, Color9, Color10, Color11, Color12, Color13, Color14, Color15,
];

const KittyTheme = ConfigFile({
  path: '~/.config/kitty/tauler-kitty-theme.conf',
  render: () => {
    const c = ctx.theme.colors;
    return (
      <KittySettings>
        <Foreground value={c.foreground} />
        <Background value={c.background} />
        <SelectionForeground value={c['accent-foreground']} />
        <SelectionBackground value={c.accent} />
        <CursorColor value={c.primary} />
        <CursorTextColor value={c['primary-foreground']} />
        <UrlColor value={c.primary} />
        <ActiveBorderColor value={c.primary} />
        <InactiveBorderColor value={c.border} />
        <ActiveTabForeground value={c.foreground} />
        <ActiveTabBackground value={c.background} />
        <InactiveTabForeground value={c['muted-foreground']} />
        <InactiveTabBackground value={c.card} />
        <TabBarBackground value={c.sidebar} />
        {PALETTE.map((Color, i) => (
          <Color value={c[`ansi-${ANSI[i]}`]} />
        ))}
      </KittySettings>
    );
  },
});

export default KittyTheme;

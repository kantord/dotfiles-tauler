import { GtkCss, DefineColor } from '../schemas/gtk-css.schema.yaml';

// GTK4 / libadwaita applications in the active tauler theme (`ctx.theme`): the named colours
// libadwaita reads from `~/.config/gtk-4.0/gtk.css`. Nautilus, Calculator, Text Editor and the
// rest recolour at once; apps that already run pick the file up on their next launch.
//
// The names are libadwaita's public API; which token fills which is this file's choice, following
// how a UI surface is named: the window and its content are `background` and `card`, the header
// bar and sidebar are `sidebar`, dialogs and popovers are `popover`, the accent is `primary`.
//
// Whether libadwaita draws light or dark chrome around those colours is not set here: it comes from
// the desktop's colour-scheme setting, so a light theme wants a light preference.
//
// This is the whole of `gtk.css` — the unit owns the file.
const SHADE = 'rgba(0, 0, 0, 0.25)';

const GtkTheme = ConfigFile({
  path: '~/.config/gtk-4.0/gtk.css',
  render: () => {
    const c = ctx.theme.colors;
    const colors = {
      window_bg_color: c.background,
      window_fg_color: c.foreground,
      view_bg_color: c.card,
      view_fg_color: c['card-foreground'],
      headerbar_bg_color: c.sidebar,
      headerbar_fg_color: c['sidebar-foreground'],
      headerbar_border_color: c.border,
      headerbar_backdrop_color: c.background,
      headerbar_shade_color: SHADE,
      card_bg_color: c.card,
      card_fg_color: c['card-foreground'],
      card_shade_color: SHADE,
      dialog_bg_color: c.popover,
      dialog_fg_color: c['popover-foreground'],
      popover_bg_color: c.popover,
      popover_fg_color: c['popover-foreground'],
      popover_shade_color: SHADE,
      sidebar_bg_color: c.sidebar,
      sidebar_fg_color: c['sidebar-foreground'],
      sidebar_backdrop_color: c.sidebar,
      sidebar_shade_color: SHADE,
      accent_bg_color: c.primary,
      accent_fg_color: c['primary-foreground'],
      accent_color: c.primary,
      destructive_bg_color: c.destructive,
      destructive_fg_color: c['destructive-foreground'],
      destructive_color: c.destructive,
      success_bg_color: c['ansi-green'],
      success_fg_color: c.background,
      success_color: c['ansi-green'],
      warning_bg_color: c['ansi-yellow'],
      warning_fg_color: c.background,
      warning_color: c['ansi-yellow'],
      error_bg_color: c.destructive,
      error_fg_color: c['destructive-foreground'],
      error_color: c.destructive,
      shade_color: SHADE,
      scrollbar_outline_color: c.border,
    };
    return (
      <GtkCss>
        {Object.entries(colors).map(([name, value]) => (
          <DefineColor name={name} value={value} />
        ))}
      </GtkCss>
    );
  },
});

export default GtkTheme;

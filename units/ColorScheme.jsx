// The desktop's light/dark preference, from the active tauler theme's mode (`ctx.theme.mode`), so
// apps that draw their own chrome follow the bar.
//
// Two channels, because GTK3 and everything else read different sources:
//  - `gsettings`: xdg-desktop-portal serves `color-scheme` from it, which Firefox, Chromium and
//    GTK4/libadwaita apps follow live. `apply` sets it after each write.
//  - `~/.config/gtk-3.0/settings.ini`: under a bare window manager there is no xsettings daemon, so
//    GTK3 apps read this file at startup instead. The unit owns the whole file.
//
// GTK3 gets Adwaita, which ships with GTK3 and matches the libadwaita look of GTK4 apps.
const ColorScheme = ConfigFile({
  path: '~/.config/gtk-3.0/settings.ini',
  render: () => {
    const dark = ctx.theme.mode === 'dark';
    return `[Settings]
gtk-theme-name=${dark ? 'Adwaita-dark' : 'Adwaita'}
gtk-application-prefer-dark-theme=${dark ? 1 : 0}
`;
  },
  apply: () => {
    const dark = ctx.theme.mode === 'dark';
    sh`gsettings set org.gnome.desktop.interface color-scheme ${dark ? 'prefer-dark' : 'prefer-light'}`;
    sh`gsettings set org.gnome.desktop.interface gtk-theme ${dark ? 'Adwaita-dark' : 'Adwaita'}`;
  },
});

export default ColorScheme;

// Turns a schema's root component into a component that writes a config file:
//
//   const I3Config = schemaFile(I3Root, '~/.config/i3/config');
//
//   <I3Config path="~/.config/i3/config" apply={() => sh`i3-msg reload`}>
//     <Set name="$mod" value="Mod4" />
//   </I3Config>
//
// The children are the file's content and `path` is where it goes, so the same
// component can be rendered more than once, each time for a different file.
//
// `apply` and `mode` are `ConfigFile`'s own options: `apply(path, text)` runs
// after each write, for a program that has to be told to reload, and `mode` is
// the file's permissions. Each is a prop, with the value given to `schemaFile`
// as its default. `apply` can be a prop here although a unit takes none: this
// is a plain component, and the unit it makes closes over the function.
//
// `ConfigFile()` is called on every render, so each render makes a new unit.
// That is fine: tauler collects units from the rendered tree on every Sweep and
// keeps nothing about a unit between Sweeps, and a file is only written when
// its content differs from what `render()` returns.
export default function schemaFile(Root, defaultPath, defaults = {}) {
  return function SchemaFile({
    path = defaultPath,
    apply = defaults.apply,
    mode = defaults.mode,
    children,
  }) {
    const File = ConfigFile({ path, apply, mode, render: () => <Root>{children}</Root> });
    return <File />;
  };
}

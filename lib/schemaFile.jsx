// Turns a schema's root component into a component that writes a config file:
//
//   const I3Config = schemaFile(I3Root, '~/.config/i3/config');
//
//   <I3Config path="~/.config/i3/config">
//     <Set name="$mod" value="Mod4" />
//   </I3Config>
//
// The children are the file's content and `path` is where it goes, so the same
// component can be rendered more than once, each time for a different file.
//
// `ConfigFile()` is called on every render, so each render makes a new unit.
// That is fine: tauler collects units from the rendered tree on every Sweep and
// keeps nothing about a unit between Sweeps, and a file is only written when
// its content differs from what `render()` returns.
//
// `apply` and `mode` are `ConfigFile`'s own options. They are set here, once,
// and not as props: a function prop does not survive the trip to a unit's hooks.
// `apply` is called with the path, so one function serves every instance.
export default function schemaFile(Root, defaultPath, { apply, mode } = {}) {
  return function SchemaFile({ path = defaultPath, children }) {
    const File = ConfigFile({ path, apply, mode, render: () => <Root>{children}</Root> });
    return <File />;
  };
}

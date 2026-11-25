import { KittySettings } from '../schemas/kitty-config.schema.yaml';
import schemaFile from '../lib/schemaFile.jsx';

// A kitty settings file. Only the shell: the settings are the children,
// written in the layout that uses it, with the kitty schema's components
// (`FontFamily`, `FontSize`, `ScrollbackLines`, ...), which `index.jsx` exports.
//
// The default path is a fragment, not `kitty.conf`: your own `kitty.conf`
// should `include` it. `kitten themes` rewrites the colour block in
// `kitty.conf` on every theme switch, and a unit that owned `kitty.conf` whole
// would overwrite that edit on tauler's next Sweep.
const KittyConfig = schemaFile(KittySettings, '~/.config/kitty/tauler-kitty-settings.conf');

export default KittyConfig;

import { Rofi } from '../schemas/rofi-full-theme.schema.yaml';
import schemaFile from '../lib/schemaFile.jsx';

// A rofi theme file (`.rasi`). Only the shell: the selectors and their
// properties are the children, written in the layout that uses it, with the
// rofi-full-theme schema's components (`Selector`, `BackgroundColor`, ...),
// which `index.jsx` exports. Read `ctx.theme.colors` there to follow the
// active tauler theme.
const RofiTheme = schemaFile(Rofi, '~/.config/rofi/tauler-theme.rasi');

export default RofiTheme;

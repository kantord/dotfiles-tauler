import { RofiConfiguration } from '../schemas/rofi-config.schema.yaml';
import schemaFile from '../lib/schemaFile.jsx';

// rofi's `configuration { }` file: its behaviour (modes, matching, terminal,
// display formats), not its colours or layout, which are `RofiTheme`. Only the
// shell: the options are the children, written in the layout that uses it,
// with the rofi-config schema's components, which `index.jsx` exports.
const RofiConfig = schemaFile(RofiConfiguration, '~/.config/rofi/config.rasi');

export default RofiConfig;

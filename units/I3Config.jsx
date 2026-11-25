import { I3Config as I3Root } from '../schemas/i3-config.schema.yaml';
import schemaFile from '../lib/schemaFile.jsx';

// An i3 config file. This is only the shell: the directives are the children,
// written in the layout that uses it, with the schema's components (`Set`,
// `Bindsym`, `Mode`, ...), which `index.jsx` exports alongside this one.
//
// `path` defaults to i3's own config path, so pass another one to write a file
// beside a config that something else still owns. It reloads i3 only if told
// to: `apply={() => sh`i3-msg reload`}`.
const I3Config = schemaFile(I3Root, '~/.config/i3/config');

export default I3Config;

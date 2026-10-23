// Data component: the newest Claude Code recap for each of a set of directories. Draws nothing.
//
//   <ClaudeRecaps dirs={["/home/you/repos/tauler"]}>
//     {recaps => <span>{recaps["/home/you/repos/tauler"]}</span>}
//   </ClaudeRecaps>
//
// Claude Code writes a recap (an `away_summary`) into a session's transcript when you step away.
// `recaps` maps each directory in `dirs` that has one to the newest recap of any session started
// there, shortened to one line of at most 110 characters; directories without one are left out.
// Empty until the first reading.
//
// `dirs` is part of the command, so keep it stable: changing the set respawns the subprocess.
// Needs bin/tauler-claude-recaps in ~/.local/bin (or pass `bin`) and jq.
export const DEFAULT_BIN = "~/.local/bin/tauler-claude-recaps";

const quote = s => `'${String(s).replace(/'/g, `'\\''`)}'`;

export default function ClaudeRecaps({ bin = DEFAULT_BIN, dirs = [], children }) {
  const list = [...new Set(dirs.filter(Boolean))].sort();
  const recaps = list.length > 0 ? useJSONStream("/usr/bin/bash", `exec ${bin} ${list.map(quote).join(" ")}`) : null;
  const child = Array.isArray(children) ? children[0] : children;
  return child(recaps && typeof recaps === "object" ? recaps : {});
}

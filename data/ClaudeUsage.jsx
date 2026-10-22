// Data component: Claude Code's five-hour rate-limit usage, per account. Draws nothing.
//
//   <ClaudeUsage>{accounts => accounts.map(a => <span>{a.label}: {a.percent}%</span>)}</ClaudeUsage>
//
// Claude Code hands its status line the rate limits on every refresh, and nothing else does, so
// this needs two scripts from bin/:
//   - `tauler-claude-statusline`, set as Claude Code's `statusLine` command. It records each
//     session's payload under /tmp/claude-usage and prints a short `5h:NN%` status line.
//   - `tauler-claude-usage` (the `bin` prop), which reads those records back: the newest per
//     account, dropping any older than 15 minutes.
//
// The child gets `[{ label, percent, resetsIn }]` (`resetsIn` in seconds), empty while no
// session has reported recently. `label` is the account's subscription type.
export const DEFAULT_BIN = "~/.local/bin/tauler-claude-usage";
const MIN_REFRESH_SECONDS = 10;

export default function ClaudeUsage({ bin = DEFAULT_BIN, refreshSeconds = 60, children }) {
  const period = Math.max(Number(refreshSeconds) || 60, MIN_REFRESH_SECONDS);
  const data = useJSONStream("/usr/bin/bash", `while true; do ${bin}; sleep ${period}; done`);
  const child = Array.isArray(children) ? children[0] : children;
  return child(data?.accounts ?? []);
}

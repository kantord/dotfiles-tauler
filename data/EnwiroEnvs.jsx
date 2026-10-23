// Data component: every enwiro environment (https://github.com/kantord/enwiro). Draws nothing.
//
//   <EnwiroEnvs>{envs => envs.filter(e => e.status?.type === "done").map(e => <span>{e.name}</span>)}</EnwiroEnvs>
//
// `envs` is `[{ name, cookbook, description, status, statusSince, workspace, scores }]`, empty
// until the first reading:
//   - status: enwiro's own, e.g. `{ type: "cooked", phase: "active" }`, `{ type: "done" }`.
//   - statusSince: when the status last changed, in epoch seconds, or null.
//   - workspace: the directory the environment opens, or null.
//   - scores: enwiro's relevance scores; `scores.launcher` is what its launcher sorts by.
//
// Every <EnwiroEnvs> with the same `refreshSeconds` shares one subprocess, so a layout can use it
// in several places. Runs bin/tauler-enwiro-envs from this package (or pass `bin`); needs enw and jq.
export const DEFAULT_BIN = `${import.meta.dirname}/../bin/tauler-enwiro-envs`;
const MIN_REFRESH_SECONDS = 1;

export default function EnwiroEnvs({ bin = DEFAULT_BIN, refreshSeconds = 5, children }) {
  const period = Math.max(Number(refreshSeconds) || 5, MIN_REFRESH_SECONDS);
  const envs = useJSONStream("/usr/bin/bash", `exec ${bin} ${period}`);
  const child = Array.isArray(children) ? children[0] : children;
  return child(Array.isArray(envs) ? envs : []);
}

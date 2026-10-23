// Data component: the issues and pull requests a GitHub search finds, through `gh`. Draws nothing.
//
//   <GitHubSearch query="is:pr is:open review-requested:@me">
//     {items => items.map(i => <span>{i.repo} #{i.number} {i.title}</span>)}
//   </GitHubSearch>
//
// `query` is GitHub's own search syntax (https://docs.github.com/search-github), `@me` included,
// so nothing about the account is written in the layout. `items` is
// `[{ kind, repo, number, title, url, updatedAt }]` (`kind` is "pr" or "issue", `repo` is
// "owner/name"), the first 100 matches, empty until the first answer and while `gh` fails.
//
// `query` and `refreshSeconds` are part of the command: components with the same pair share one
// subprocess, and changing either respawns it. Requires gh (logged in) and jq.
const MIN_REFRESH_SECONDS = 60;

const GRAPHQL = `query($q: String!) { search(query: $q, type: ISSUE, first: 100) { nodes {
  __typename
  ... on PullRequest { number title url updatedAt repository { nameWithOwner } }
  ... on Issue { number title url updatedAt repository { nameWithOwner } } } } }`;

const JQ = `[.data.search.nodes[] | select(.repository) | {kind: (if .__typename == "PullRequest" then "pr" else "issue" end), repo: .repository.nameWithOwner, number, title, url, updatedAt}]`;

// Single-quoted for the shell; a `'` closes, escapes and reopens the quote.
const quote = s => `'${String(s).replace(/'/g, `'\\''`)}'`;

export default function GitHubSearch({ query, refreshSeconds = 300, children }) {
  const period = Math.max(Number(refreshSeconds) || 300, MIN_REFRESH_SECONDS);
  const items = useJSONStream("/usr/bin/bash",
    `while true; do gh api graphql -f query=${quote(GRAPHQL)} -f q=${quote(query ?? "")} 2>/dev/null | jq -c ${quote(JQ)} 2>/dev/null || echo '[]'; sleep ${period}; done`);
  const child = Array.isArray(children) ? children[0] : children;
  return child(Array.isArray(items) ? items : []);
}

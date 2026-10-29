// Builds gallery.html: every example (charts/examples/<section>/<nn-name>.jsx) as a card with its
// title, what to notice, its picture and its code highlighted with shiki, from the import line down.
// The picture is the whole component the example returns (layout, labels and figures), rendered by the
// test into __html__/ for the light and the dark palette (shown by prefers-color-scheme). The tailwind
// classes in it are styled by a small stylesheet generated here from classes.js (no tailwind, works offline).
//   pnpm test charts/examples   (draws the fragments; `-u` after changing an example)
//   pnpm examples               (then open charts/examples/gallery.html)
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { codeToHtml } from 'shiki';
import { PALETTES } from './palettes.js';
import { stylesheet } from './classes.js';

const dir = new URL('.', import.meta.url);
const fragment = (name, scheme) => readFileSync(new URL(`__html__/${name}.${scheme}.html`, dir), 'utf8').trim();
// Fragments sit in one page: give each drawing's ids (clip paths) a name of its own.
const scoped = (html, id) => html.replace(/\bchart[a-z0-9]+/g, m => `${m}-${id}`);
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');

// A source file split into its header (title, section, what to notice) and the code below it.
function parse(text) {
  const lines = text.split('\n');
  const end = lines.findIndex(l => !l.startsWith('//'));
  const header = lines.slice(0, end).map(l => l.replace(/^\/\/ ?/, ''));
  const field = name => header.find(l => l.startsWith(name + ': '))?.slice(name.length + 2).trim();
  const notice = header.filter(l => !/^(title|section): /.test(l)).join(' ').replace(/\s+/g, ' ').trim();
  return { title: field('title'), section: field('section'), notice, code: lines.slice(end).join('\n').trim() + '\n' };
}

const sections = readdirSync(dir, { withFileTypes: true }).filter(d => d.isDirectory() && /^\d\d-/.test(d.name)).map(d => d.name).sort();
const groups = [];
for (const section of sections) {
  const examples = [];
  for (const file of readdirSync(new URL(section + '/', dir)).filter(f => f.endsWith('.jsx')).sort()) {
    const name = `${section}--${file.replace(/\.jsx$/, '')}`;
    const info = parse(readFileSync(new URL(`${section}/${file}`, dir), 'utf8'));
    const picture = Object.fromEntries(['light', 'dark'].map(s => [s, scoped(fragment(name, s), `${slug(name)}-${s}`)]));
    const html = await codeToHtml(info.code, { lang: 'jsx', themes: { light: 'github-light', dark: 'github-dark' }, defaultColor: false });
    examples.push({ ...info, name, picture, html });
  }
  groups.push({ id: slug(section), title: examples[0]?.section ?? section, examples });
}

// Figures are drawn at their real size, which is small (a sparkline is 232 px wide); magnify those so the
// picture is readable. The picture stays vector, and the toggle below puts it back to 1:1.
const widthOf = e => Math.max(0, ...[...e.picture.light.matchAll(/<svg[^>]* width="(\d+(?:\.\d+)?)"/g)].map(m => +m[1]));
const zoomOf = e => widthOf(e) <= 260 ? 'zoom' : '';
const card = e => `<article id="${slug(e.name)}">
<header><h3>${esc(e.title)}</h3><p>${esc(e.notice)}</p></header>
<div class="body"><div class="pic"><div class="fx light ${zoomOf(e)}">${e.picture.light}</div><div class="fx dark ${zoomOf(e)}">${e.picture.dark}</div><small>Rendered from the component: the layout around the Plot is drawn as the example writes it.${zoomOf(e) ? ' Shown at 2x; the real figure is ' + widthOf(e) + ' px wide.' : ''}</small></div><div class="code">${e.html}</div></div>
</article>`;
const classes = groups.flatMap(g => g.examples.flatMap(e => [...(e.picture.light + e.picture.dark).matchAll(/ class="([^"]*)"/g)].flatMap(m => m[1].split(/\s+/).map(c => [c, e.name]))));
const tailwind = [...new Map(classes.map(([c, n]) => [c, n])).entries()].map(([c, n]) => stylesheet([c], n)).join('\n');
const vars = p => `--fg: ${p.foreground}; --bg-chart: ${p.background};`;
const total = groups.reduce((n, g) => n + g.examples.length, 0);

writeFileSync(new URL('gallery.html', dir), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Plot examples</title>
<style>
  :root { color-scheme: light dark; ${vars(PALETTES.light)} --bg: #f4f5f8; --card: #fff; --ink: #1d2330; --muted: #5d6677; --line: #dfe3ea; --accent: #2563c9; --shiki: light; }
  @media (prefers-color-scheme: dark) { :root { ${vars(PALETTES.dark)} --bg: #0e1015; --card: #181b22; --ink: #d5dae3; --muted: #8d95a5; --line: #2a2f3a; --accent: #7aa2f7; } }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 15px/1.55 system-ui, sans-serif; display: grid; grid-template-columns: 230px minmax(0, 1fr); }
  nav { position: sticky; top: 0; align-self: start; height: 100vh; overflow: auto; padding: 24px 16px; border-right: 1px solid var(--line); }
  nav h1 { font-size: 16px; margin: 0 0 4px; }
  nav p { margin: 0 0 16px; color: var(--muted); font-size: 13px; }
  nav a { display: block; padding: 4px 8px; margin: 1px 0; border-radius: 6px; color: var(--ink); text-decoration: none; font-size: 14px; }
  nav a:hover { background: var(--line); }
  nav a span { color: var(--muted); float: right; font-size: 12px; }
  main { padding: 8px 32px 64px; min-width: 0; }
  section { padding-top: 24px; }
  section > h2 { font-size: 22px; margin: 16px 0 12px; }
  article { background: var(--card); border: 1px solid var(--line); border-radius: 10px; margin: 0 0 20px; overflow: hidden; scroll-margin-top: 16px; }
  article header { padding: 14px 18px 4px; }
  article h3 { margin: 0 0 4px; font-size: 17px; }
  article header p { margin: 0 0 8px; color: var(--muted); max-width: 78ch; }
  .body { display: grid; grid-template-columns: minmax(0, max-content) minmax(0, 1fr); gap: 0; }
  .pic { background: var(--bg-chart); color: var(--fg); padding: 18px; display: flex; flex-direction: column; gap: 14px; align-items: flex-start; justify-content: center; border-top: 1px solid var(--line); border-right: 1px solid var(--line); }
  .pic svg { display: block; max-width: 100%; height: auto; }
  .pic .fx.zoom { zoom: 2; }
  .pic small { color: var(--fg); opacity: .5; font-size: 11px; }
  .fx { font: 12px/1.3 ui-monospace, "JetBrains Mono", monospace; }
  .fx.dark { display: none; }
  @media (prefers-color-scheme: dark) { .fx.light { display: none; } .fx.dark { display: block; } }
  ${tailwind}
  .code { min-width: 0; border-top: 1px solid var(--line); overflow: auto; max-height: 520px; }
  .code pre { margin: 0; padding: 14px 18px; font: 12.5px/1.5 ui-monospace, "JetBrains Mono", monospace; background: transparent !important; }
  .shiki, .shiki span { color: var(--shiki-light); }
  @media (prefers-color-scheme: dark) { .shiki, .shiki span { color: var(--shiki-dark); } }
  @media (max-width: 900px) {
    body { display: block; }
    nav { position: static; height: auto; border-right: 0; border-bottom: 1px solid var(--line); }
    main { padding: 8px 16px 48px; }
    .body { grid-template-columns: minmax(0, 1fr); }
    .pic { border-right: 0; }
  }
</style></head><body>
<nav><h1>Plot examples</h1><p>${total} examples, in the order that builds on itself.</p>
${groups.map(g => `<a href="#${g.id}">${esc(g.title)}<span>${g.examples.length}</span></a>`).join('\n')}</nav>
<main>
${groups.map(g => `<section id="${g.id}"><h2>${esc(g.title)}</h2>\n${g.examples.map(card).join('\n')}</section>`).join('\n')}
</main></body></html>
`);
console.log(`wrote charts/examples/gallery.html (${total} examples in ${groups.length} sections)`);

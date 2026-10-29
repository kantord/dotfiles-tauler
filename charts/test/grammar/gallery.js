// Writes gallery.html: every grammar case's SVG snapshot on one page, next to the source of the
// test that draws it (highlighted with shiki).
//   pnpm gallery   (then open charts/test/grammar/gallery.html)
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { codeToHtml } from 'shiki';

const dir = new URL('.', import.meta.url);
const testDir = new URL('../', dir);
const files = readdirSync(new URL('__svg__/', dir)).filter(f => f.endsWith('.svg')).sort();
const names = files.map(f => f.replace('.svg', ''));

// Every test file that writes into __svg__/, split into `test(...)` blocks. A block is credited with
// each drawing its snapshot call names: `snapshot('x')` writes `<prefix>x(-n).svg`, where the prefix is
// what the file's own snapshot helper puts in front of the name.
const sources = [dir, testDir].flatMap(d => readdirSync(d).filter(f => /\.test\.jsx$/.test(f)).map(f => new URL(f, d)));
const blocks = new Map();   // svg name -> source text
for (const url of sources) {
  const text = readFileSync(url, 'utf8');
  if (!text.includes('__svg__')) continue;
  const prefix = text.match(/__svg__\/([\w-]*?)\$\{name\}/)?.[1] ?? '';
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (!/^(async )?test(\.\w+)?\(/.test(lines[i])) continue;
    let end = i;
    while (end < lines.length && lines[end] !== '});') end++;
    const body = lines.slice(i, end + 1).join('\n');
    const literals = [...body.matchAll(/(?:snapshot|toMatchFileSnapshot)\(\s*['"`]([^'"`]+)['"`]\s*\)/g)].map(m => m[1]);
    for (const lit of literals) {
      const base = lit.includes('/') ? lit.split('/').pop().replace('.svg', '') : prefix + lit;
      for (const name of names) if (name === base || new RegExp(`^${base}-\\d+$`).test(name)) blocks.set(name, body);
    }
  }
}

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const code = async src => src == null ? '<p class="none">no test source found</p>'
  : codeToHtml(src, { lang: 'jsx', theme: 'github-light' }).catch(() => `<pre>${esc(src)}</pre>`);
const cards = await Promise.all(names.map(async name => `<figure>
<div class="pic"><img src="__svg__/${name}.svg" alt="${name}"><figcaption>${name}</figcaption></div>
<div class="src">${await code(blocks.get(name))}</div>
</figure>`));

writeFileSync(new URL('gallery.html', dir), `<!doctype html>
<meta charset="utf-8"><title>Chart grammar gallery</title>
<style>
  body { font: 13px ui-monospace, monospace; background: #fff; color: #142030; margin: 16px; }
  main { display: flex; flex-direction: column; gap: 16px; }
  figure { margin: 0; border: 1px solid #e0e5ec; padding: 8px; display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 16px; }
  figcaption { margin-top: 4px; color: #5b6879; }
  .src { overflow: auto; max-height: 420px; }
  .src pre { margin: 0; padding: 8px; font-size: 12px; }
  .none { color: #5b6879; }
</style>
<h1>Chart grammar gallery (${files.length} drawings)</h1>
<main>${cards.join('\n')}</main>
`);
const found = names.filter(n => blocks.has(n)).length;
console.log(`wrote gallery.html (${files.length} drawings, ${found} with source)`);

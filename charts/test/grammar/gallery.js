// Writes gallery.html: every grammar case's SVG snapshot on one page, to look at by eye.
//   pnpm gallery   (then open charts/test/grammar/gallery.html)
import { readdirSync, writeFileSync } from 'node:fs';

const dir = new URL('.', import.meta.url);
const files = readdirSync(new URL('__svg__/', dir)).filter(f => f.endsWith('.svg')).sort();
const cards = files.map(f => `<figure><img src="__svg__/${f}" alt="${f}"><figcaption>${f.replace('.svg', '')}</figcaption></figure>`);
writeFileSync(new URL('gallery.html', dir), `<!doctype html>
<meta charset="utf-8"><title>Chart grammar gallery</title>
<style>
  body { font: 13px ui-monospace, monospace; background: #fff; color: #142030; margin: 16px; }
  main { display: flex; flex-wrap: wrap; gap: 16px; }
  figure { margin: 0; border: 1px solid #e0e5ec; padding: 8px; }
  figcaption { margin-top: 4px; color: #5b6879; }
</style>
<h1>Chart grammar gallery (${files.length} drawings)</h1>
<main>${cards.join('\n')}</main>
`);
console.log(`wrote gallery.html (${files.length} drawings)`);

// Renders what an example's component returns to an HTML fragment: the elements as written (class, style,
// text) with every figure (a Plot's <D3Figure>) replaced by its drawn inline <svg>.
import { drawFigure } from '../../test/tauler.js';
import { stylesheet } from './classes.js';

const UNITLESS = new Set(['opacity', 'flex', 'zIndex', 'lineHeight', 'fontWeight', 'flexGrow', 'flexShrink', 'order']);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const kebab = k => k.replace(/[A-Z]/g, c => '-' + c.toLowerCase());
const styleText = style => Object.entries(style).map(([k, v]) => `${kebab(k)}:${typeof v === 'number' && !UNITLESS.has(k) ? v + 'px' : v}`).join(';');

export function renderTree(node, where) {
  if (node === null || node === undefined || node === false) return '';
  if (Array.isArray(node)) return node.map(n => renderTree(n, where)).join('');
  if (typeof node !== 'object') return esc(node);
  if (node.type === 'img' && String(node.src).startsWith('tauler:picture/')) return drawFigure(node.src.slice('tauler:picture/'.length));
  if (typeof node.type !== 'string') throw new Error(`cannot render ${JSON.stringify(node).slice(0, 80)} in ${where}`);
  const { type, children, class: cls, style, __self, __source, ...rest } = node;   // __self and __source: the JSX dev transform
  if (Object.keys(rest).length) throw new Error(`<${type}> in ${where} has props the gallery does not draw: ${Object.keys(rest).join(', ')}`);
  stylesheet((cls ?? '').split(/\s+/).filter(Boolean), where);   // throws on a class the gallery cannot draw
  const attrs = (cls ? ` class="${esc(cls)}"` : '') + (style ? ` style="${esc(styleText(style)).replace(/"/g, '&quot;')}"` : '');
  return `<${type}${attrs}>${renderTree(children, where)}</${type}>`;
}

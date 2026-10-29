/**
 * DOM helpers. Functions only touch `document` when called, so importing this file is safe anywhere.
 */
import { ICONS } from '../icons.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/**
 * Tiny element builder. Text goes through `textContent`, so user input can never inject HTML.
 * The `html` prop is only used for the static ICONS constants.
 */
export function el(tag, props = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k === 'html') n.innerHTML = v;
    else n.setAttribute(k, v === true ? '' : v);
  }
  n.append(...kids.flat().filter((x) => x != null && x !== false));
  return n;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

export function svgEl(name, attrs = {}, text) {
  const n = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  return n;
}

export const icon = (name, size = 18) =>
  el('span', {
    class: 'icon',
    'aria-hidden': 'true',
    html: `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`,
  });

export function openDlg(d) {
  if (!d || d.open) return;
  if (d.showModal) d.showModal();
  else d.setAttribute('open', '');
}

export function closeDlg(d) {
  if (!d) return;
  if (d.close) d.close();
  else d.removeAttribute('open');
}

/** Trigger a file download from text content. */
export function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = el('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

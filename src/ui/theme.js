/** Light/dark theme (follows the OS until the user picks one) and comfortable/compact density. */
import { KEYS } from '../config.js';
import { readPref, writePref } from '../store/storage.js';
import { $, $$, icon } from '../utils/dom.js';

const root = document.documentElement;
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

function applyTheme(mode) {
  root.dataset.theme = mode;
  const b = $('#themeBtn');
  b.replaceChildren(icon(mode === 'dark' ? 'sun' : 'moon', 20));
  b.setAttribute('aria-label', mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
}

export function toggleTheme() {
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  writePref(KEYS.theme, next);
  applyTheme(next);
}

export function setDensity(value) {
  const d = value === 'compact' ? 'compact' : 'comfortable';
  root.dataset.density = d;
  writePref(KEYS.density, d);
  $$('[data-setting="density"]').forEach((b) =>
    b.setAttribute('aria-pressed', String(b.dataset.value === d))
  );
}

export const toggleDensity = () =>
  setDensity(root.dataset.density === 'compact' ? 'comfortable' : 'compact');

export function initTheme() {
  const saved = readPref(KEYS.theme);
  applyTheme(saved === 'light' || saved === 'dark' ? saved : darkQuery.matches ? 'dark' : 'light');
  darkQuery.addEventListener('change', () => {
    const s = readPref(KEYS.theme);
    if (s !== 'light' && s !== 'dark') applyTheme(darkQuery.matches ? 'dark' : 'light');
  });
  setDensity(readPref(KEYS.density) || 'comfortable');
  $('#themeBtn').addEventListener('click', toggleTheme);
}

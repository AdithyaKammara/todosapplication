/** Small string/id helpers. Pure, no DOM. */

export const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export const truncate = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

/** Collapse whitespace, trim, and clamp to `max` characters. */
export const clean = (s, max) =>
  String(s ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

export const validId = (s) => typeof s === 'string' && /^[\w-]{1,64}$/.test(s);

export const uid = () =>
  globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);

export const pid = () => 'p-' + uid().replace(/-/g, '').slice(0, 10);

export const initials = (name) =>
  name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

/**
 * A tiny pub/sub bus. The store emits events ('render', 'drawer:parts', 'drawer:rebuild') and the UI
 * layer subscribes, so the data layer never has to import any UI code.
 */
const listeners = new Map();

export function on(type, fn) {
  if (!listeners.has(type)) listeners.set(type, new Set());
  listeners.get(type).add(fn);
  return () => listeners.get(type).delete(fn);
}

export function emit(type, payload) {
  (listeners.get(type) || []).forEach((fn) => fn(payload));
}
